from django.conf import settings
from django.db import models
from django_jalali.db import models as jmodels


class GemReason(models.TextChoices):
	"""Why a gem moved.

	Earning reasons are configured by `GemRule`; spending reasons are kept here
	too so one column describes the whole ledger.
	"""

	PROFILE_COMPLETE = 'profile_complete', 'تکمیل پروفایل'
	EPISODE_COMPLETE = 'episode_complete', 'پایان یک قسمت'
	PURCHASE = 'purchase', 'خرید از فروشگاه'
	ORDER_DISCOUNT = 'order_discount', 'تخفیف سفارش'
	INVITE_STUDENT = 'invite_student', 'پیوستن با کد دعوت'
	INVITE_COACH = 'invite_coach', 'هنرجوی تازه با کد دعوت'
	MANUAL = 'manual', 'اصلاح دستی'


class GemRule(models.Model):
	"""How many gems one action is worth.

	Rules live in the database, not in code: the amount, the daily cap, and
	whether the rule applies at all are edited in Django Admin without a
	deploy. `is_percentage` marks the one rule whose amount is a share of the
	amount it is based on (currently a shop purchase) rather than a fixed count.
	"""

	objects = jmodels.jManager()

	reason = models.CharField('رویداد', max_length=40, choices=GemReason.choices, unique=True)
	amount = models.PositiveIntegerField('مقدار', default=0)
	is_percentage = models.BooleanField('درصدی از مبلغ', default=False)
	daily_limit = models.PositiveIntegerField('سقف روزانه', default=0, help_text='۰ یعنی بی‌نهایت.')
	is_active = models.BooleanField('فعال', default=True)

	class Meta:
		verbose_name = 'قاعدهٔ جم'
		verbose_name_plural = 'قواعد جم'
		ordering = ['reason']

	def __str__(self):
		unit = '٪' if self.is_percentage else 'جم'
		return f'{self.get_reason_display()} — {self.amount}{unit}'


class GemTransaction(models.Model):
	"""One movement of gems. The ledger is the source of truth.

	`amount` is signed: positive credits, negative debits. A user's balance is
	`Sum(amount)`, and `User.gem_balance` is only a cached copy kept in the same
	transaction so the header does not aggregate on every request.

	`(user, reason, ref_type, ref_id)` is unique, so the same event can never pay
	out twice: a refreshed callback, a double-clicked button, or a replayed
	receipt all collapse into the existing row. Empty strings, not NULL, are
	used for "no reference" because SQLite and PostgreSQL both treat NULLs as
	distinct in a unique index.
	"""

	objects = jmodels.jManager()

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.CASCADE,
		related_name='gem_transactions',
	)
	amount = models.IntegerField('مقدار')
	reason = models.CharField('رویداد', max_length=40, choices=GemReason.choices)
	ref_type = models.CharField('نوع مرجع', max_length=40, blank=True)
	ref_id = models.CharField('شناسهٔ مرجع', max_length=64, blank=True)
	note = models.CharField('توضیح', max_length=200, blank=True)
	created_at = jmodels.jDateTimeField('زمان', auto_now_add=True)

	class Meta:
		verbose_name = 'تراکنش جم'
		verbose_name_plural = 'تراکنش‌های جم'
		ordering = ['-created_at', '-pk']
		constraints = [
			models.UniqueConstraint(
				fields=['user', 'reason', 'ref_type', 'ref_id'],
				name='unique_gem_event_per_user',
			),
			models.CheckConstraint(condition=~models.Q(amount=0), name='gem_amount_nonzero'),
		]

	@property
	def is_credit(self):
		return self.amount > 0

	def __str__(self):
		return f'{self.user} — {self.amount:+d} ({self.get_reason_display()})'
