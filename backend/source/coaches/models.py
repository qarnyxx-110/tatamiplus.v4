from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.utils import timezone
from django_jalali.db import models as jmodels
from .storage import PrivateUploadStorage

private_storage = PrivateUploadStorage()


class CoachPortfolio(models.Model):
	"""The single coach record: application, public page, and admin lifecycle in one.

	There is deliberately no separate application model. A coach fills this in
	themselves (status becomes `pending_review`) or CRM creates it from the
	admin (status starts at `approved`); admins then review and publish it.
	"""

	objects = jmodels.jManager()

	class Status(models.TextChoices):
		DRAFT = 'draft', 'پیش‌نویس'
		PENDING_REVIEW = 'pending_review', 'در انتظار بررسی'
		INCOMPLETE = 'incomplete', 'ناقص'
		APPROVED = 'approved', 'تأییدشده'
		PUBLISHED = 'published', 'منتشرشده'
		REJECTED = 'rejected', 'ردشده'
		INACTIVE = 'inactive', 'غیرفعال'

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name='portfolio',
		verbose_name='کاربر مربی',
	)

	# Identity & public page
	display_name = models.CharField('نام نمایشی', max_length=100, blank=True)
	headline = models.CharField('عنوان کوتاه', max_length=180, blank=True)
	biography = models.TextField('معرفی مربی', blank=True)
	avatar = models.ImageField('تصویر', upload_to='coaches/avatars/%Y/%m/', blank=True)

	# Coaching details
	coaching_level = models.CharField('سطح مربیگری', max_length=100, blank=True)
	specializations = models.TextField('تخصص‌ها', blank=True)
	years_experience = models.PositiveSmallIntegerField('سابقهٔ مربیگری، به سال', default=0, blank=True)
	belt = models.CharField('رنگ و درجه کمربند', max_length=40, blank=True)
	club = models.CharField('باشگاه محل فعالیت', max_length=150, blank=True)

	# Certificates
	certificate_details = models.TextField('توضیحات مدارک و افتخارات', blank=True)
	certificate_document = models.FileField(
		'فایل مدرک',
		storage=private_storage,
		upload_to='coach-certificates/%Y/%m/',
		blank=True,
		validators=[FileExtensionValidator(
			['pdf', 'jpg', 'jpeg', 'png'],
			message='فقط فایل PDF یا تصویر JPG و PNG مجاز است.',
		)],
	)

	# Lifecycle
	status = models.CharField(
		'وضعیت',
		max_length=20,
		choices=Status.choices,
		default=Status.DRAFT,
	)
	rejection_reason = models.TextField('دلیل رد درخواست', blank=True)
	is_published = models.BooleanField('انتشار در آکادمی', default=False)

	submitted_at = jmodels.jDateTimeField('زمان ثبت', null=True, blank=True)
	reviewed_at = jmodels.jDateTimeField('زمان بررسی', null=True, blank=True)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	updated_at = jmodels.jDateTimeField('آخرین ویرایش', auto_now=True)

	class Meta:
		verbose_name = 'پورتفولیوی مربی'
		verbose_name_plural = 'پورتفولیوهای مربیان'
		ordering = ['display_name']

	def clean(self):
		super().clean()
		if self.user_id and self.user.role != self.user.Role.COACH:
			raise ValidationError({'user': 'فقط حساب مربی می‌تواند پورتفولیو داشته باشد.'})
		if self.status == self.Status.REJECTED and not self.rejection_reason.strip():
			raise ValidationError({'rejection_reason': 'برای رد درخواست، دلیل را وارد کنید.'})
		if self.is_published and self.status not in (self.Status.APPROVED, self.Status.PUBLISHED):
			raise ValidationError({'is_published': 'پیش از انتشار، پورتفولیو باید تأیید شده باشد.'})

	def __str__(self):
		return self.display_name or self.user.phone or f'coach-{self.pk}'


class CoachInvite(models.Model):
	"""A shareable code a coach hands out so students can attach themselves.

	One coach can hold several codes: a permanent one with no use limit, a
	classroom code capped at 15 uses, or a time-limited campaign code. Codes
	are stored uppercase and looked up case-insensitively, because people read
	them off a screen and type them by hand.
	"""

	objects = jmodels.jManager()

	coach = models.ForeignKey(
		CoachPortfolio,
		verbose_name='مربی',
		on_delete=models.CASCADE,
		related_name='invites',
	)
	code = models.CharField('کد دعوت', max_length=12, unique=True)
	label = models.CharField('برچسب', max_length=80, blank=True, help_text='مثلاً «کلاس شنبه‌ها».')
	max_uses = models.PositiveSmallIntegerField('سقف استفاده', default=0, help_text='۰ یعنی بی‌نهایت.')
	uses = models.PositiveSmallIntegerField('تعداد استفاده', default=0, editable=False)
	is_active = models.BooleanField('فعال', default=True)
	expires_at = jmodels.jDateTimeField('انقضا', null=True, blank=True)
	created_at = jmodels.jDateTimeField('زمان ساخت', auto_now_add=True)

	class Meta:
		verbose_name = 'کد دعوت مربی'
		verbose_name_plural = 'کدهای دعوت مربیان'
		ordering = ['-created_at']

	@property
	def is_expired(self):
		return self.expires_at is not None and self.expires_at < timezone.now()

	@property
	def is_exhausted(self):
		return bool(self.max_uses) and self.uses >= self.max_uses

	@property
	def remaining_uses(self):
		"""`None` means unlimited. Templates render that as «بی‌نهایت»."""
		if not self.max_uses:
			return None
		return max(self.max_uses - self.uses, 0)

	@property
	def is_usable(self):
		return self.is_active and not self.is_expired and not self.is_exhausted

	def __str__(self):
		return f'{self.coach.display_name} — {self.code}'


class CoachStudent(models.Model):
	"""A student attached to a coach, created by redeeming an invite code.

	This is the first real student-coach relationship in the product, so the
	unique constraint is deliberate: one row per pair, no duplicates from a
	re-used code.
	"""

	objects = jmodels.jManager()

	coach = models.ForeignKey(
		CoachPortfolio,
		verbose_name='مربی',
		on_delete=models.CASCADE,
		related_name='students',
	)
	student = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='هنرجو',
		on_delete=models.CASCADE,
		related_name='coach_links',
	)
	invite = models.ForeignKey(
		CoachInvite,
		verbose_name='کد دعوت',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='students',
	)
	created_at = jmodels.jDateTimeField('زمان عضویت', auto_now_add=True)

	class Meta:
		verbose_name = 'هنرجوی مربی'
		verbose_name_plural = 'هنرجوهای مربی'
		ordering = ['-created_at']
		constraints = [
			models.UniqueConstraint(fields=['coach', 'student'], name='unique_student_per_coach'),
		]

	def __str__(self):
		return f'{self.student} → {self.coach.display_name}'
