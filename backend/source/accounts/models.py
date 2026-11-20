import hmac

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django_jalali.db import models as jmodels

from .managers import UserManager
from .phone import normalize_iranian_phone


class User(AbstractUser):
	phone = models.CharField('شمارهٔ همراه', max_length=11, unique=True, null=True, blank=True)
	last_login = jmodels.jDateTimeField('آخرین ورود', blank=True, null=True)
	date_joined = jmodels.jDateTimeField('تاریخ عضویت', default=timezone.now)
	city = models.CharField('شهر', max_length=100, blank=True)
	is_profile_complete = models.BooleanField('تکمیل پروفایل', default=True)
	# Cached Sum(GemTransaction.amount). Never edited directly; the gems service
	# keeps it in step with the ledger inside the same transaction.
	gem_balance = models.PositiveIntegerField('موجودی جم', default=0, editable=False)

	class Role(models.TextChoices):
		STUDENT = 'student', 'هنرجو'
		COACH = 'coach', 'مربی'

	role = models.CharField('نقش', max_length=10, choices=Role.choices, default=Role.STUDENT)

	USERNAME_FIELD = 'phone'
	REQUIRED_FIELDS = []
	objects = UserManager()

	class Meta:
		verbose_name = 'کاربر'
		verbose_name_plural = 'کاربران'

	def __str__(self):
		return self.phone or self.username


class OTPCode(models.Model):
	phone = models.CharField('شمارهٔ همراه', max_length=11, db_index=True)
	code_hash = models.CharField('هش کد', max_length=64)
	ip_address = models.GenericIPAddressField('نشانی IP', null=True, blank=True)
	attempts = models.PositiveSmallIntegerField('تعداد تلاش', default=0)
	created_at = models.DateTimeField('زمان ایجاد', auto_now_add=True)
	expires_at = models.DateTimeField('زمان انقضا')
	is_used = models.BooleanField('استفاده شده', default=False)

	class Meta:
		verbose_name = 'کد یک‌بارمصرف'
		verbose_name_plural = 'کدهای یک‌بارمصرف'
		ordering = ['-created_at']
		indexes = [
			models.Index(fields=['phone', 'created_at'], name='otp_phone_created_idx'),
			models.Index(fields=['ip_address', 'created_at'], name='otp_ip_created_idx'),
		]

	@staticmethod
	def digest(phone, code):
		return hmac.digest(
			settings.SECRET_KEY.encode(),
			f'{phone}:{code}'.encode(),
			'sha256',
		).hex()

	def verify(self, code):
		return hmac.compare_digest(self.code_hash, self.digest(self.phone, code))

	def __str__(self):
		return f'{self.phone[:3]}****{self.phone[-2:]}'


class SignupLead(models.Model):
	class Status(models.TextChoices):
		NEW = 'new', 'جدید'
		CALLED = 'called', 'تماس گرفته شد'
		NO_ANSWER = 'no_answer', 'پاسخ نداد'
		FOLLOW_UP = 'follow_up', 'پیگیری'
		DONE = 'done', 'انجام شد'

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر مربی',
		on_delete=models.CASCADE,
		related_name='signup_lead',
	)
	status = models.CharField('وضعیت', max_length=20, choices=Status.choices, default=Status.NEW)
	note = models.TextField('یادداشت', blank=True)
	called_at = jmodels.jDateTimeField('زمان تماس', null=True, blank=True)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	assigned_to = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='اپراتور',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='assigned_signup_leads',
	)

	class Meta:
		verbose_name = 'سرنخ ثبت‌نام مربی'
		verbose_name_plural = 'سرنخ‌های ثبت‌نام مربیان'
		ordering = ['-created_at']

	def save(self, *args, **kwargs):
		if self.status != self.Status.NEW and self.called_at is None:
			self.called_at = timezone.now()
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.user} ({self.get_status_display()})'
