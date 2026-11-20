from decimal import Decimal

from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.urls import reverse
from django_jalali.db import models as jmodels
from coaches.models import CoachPortfolio
from coaches.storage import PrivateUploadStorage
from orders.models import Payment

# Course videos are paid content: they live outside MEDIA_ROOT so nothing can
# serve them as a public URL. Access goes through the episode view.
private_storage = PrivateUploadStorage()


class Course(models.Model):
	"""A coaching course made of ordered episodes.

	A course is only visible and purchasable while `status` is published.
	Coaches submit new courses as pending_review; an administrator publishes.
	"""

	objects = jmodels.jManager()

	class Level(models.TextChoices):
		BEGINNER = 'beginner', 'مبتدی'
		INTERMEDIATE = 'intermediate', 'متوسط'
		ADVANCED = 'advanced', 'پیشرفته'

	class Status(models.TextChoices):
		DRAFT = 'draft', 'پیش‌نویس'
		PENDING_REVIEW = 'pending_review', 'در انتظار بررسی'
		PUBLISHED = 'published', 'منتشرشده'

	coach = models.ForeignKey(
		CoachPortfolio,
		verbose_name='مربی',
		on_delete=models.CASCADE,
		related_name='courses',
	)
	title = models.CharField('عنوان', max_length=180)
	slug = models.SlugField('شناسهٔ نشانی', max_length=200, unique=True, allow_unicode=True)
	description = models.TextField('توضیحات')
	level = models.CharField('سطح', max_length=20, choices=Level.choices, default=Level.BEGINNER)
	price = models.DecimalField(
		'قیمت',
		max_digits=12,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.00'))],
	)
	cover = models.ImageField('تصویر جلد', upload_to='courses/covers/%Y/%m/', blank=True)
	status = models.CharField('وضعیت', max_length=20, choices=Status.choices, default=Status.PENDING_REVIEW)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	updated_at = jmodels.jDateTimeField('آخرین ویرایش', auto_now=True)

	class Meta:
		verbose_name = 'دوره'
		verbose_name_plural = 'دوره‌ها'
		ordering = ['-created_at']
		constraints = [
			models.CheckConstraint(condition=models.Q(price__gte=0), name='course_price_nonnegative'),
		]

	def get_absolute_url(self):
		return reverse('club:course_detail', args=[self.slug])

	def __str__(self):
		return self.title


class Episode(models.Model):
	objects = jmodels.jManager()

	course = models.ForeignKey(Course, verbose_name='دوره', on_delete=models.CASCADE, related_name='episodes')
	title = models.CharField('عنوان', max_length=180)
	video_file = models.FileField(
		'فایل ویدیو',
		storage=private_storage,
		upload_to='course-videos/%Y/%m/',
		validators=[FileExtensionValidator(['mp4'], message='فقط فایل MP4 مجاز است.')],
	)
	duration = models.PositiveIntegerField('مدت، به ثانیه', default=0)
	order = models.PositiveIntegerField('ترتیب', default=1)
	is_free = models.BooleanField('رایگان', default=False)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)

	class Meta:
		verbose_name = 'قسمت'
		verbose_name_plural = 'قسمت‌ها'
		ordering = ['order', 'pk']

	def save(self, *args, **kwargs):
		# The first episode is always the free sample, whatever the form said.
		if self.order == 1:
			self.is_free = True
		super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.course.title} — {self.order}. {self.title}'


class EpisodeCompletion(models.Model):
	"""A user marked this episode as finished.

	Separate from the gem ledger on purpose: watching progress is a learning
	fact, and the reward is a side effect that may be switched off in `GemRule`
	without losing the fact that the episode was completed.
	"""

	objects = jmodels.jManager()

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.CASCADE,
		related_name='episode_completions',
	)
	episode = models.ForeignKey(
		Episode,
		verbose_name='قسمت',
		on_delete=models.CASCADE,
		related_name='completions',
	)
	created_at = jmodels.jDateTimeField('زمان', auto_now_add=True)

	class Meta:
		verbose_name = 'اتمام قسمت'
		verbose_name_plural = 'اتمام قسمت‌ها'
		ordering = ['-created_at']
		constraints = [
			models.UniqueConstraint(
				fields=['user', 'episode'],
				name='unique_completion_per_user_episode',
			),
		]

	def __str__(self):
		return f'{self.user} — {self.episode}'


class Enrollment(models.Model):
	"""Proof that a user bought (or was granted) a course."""

	objects = jmodels.jManager()

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.CASCADE,
		related_name='enrollments',
	)
	course = models.ForeignKey(
		Course,
		verbose_name='دوره',
		on_delete=models.CASCADE,
		related_name='enrollments',
	)
	payment = models.OneToOneField(
		Payment,
		verbose_name='پرداخت',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='enrollment',
	)
	created_at = jmodels.jDateTimeField('زمان ثبت‌نام', auto_now_add=True)

	class Meta:
		verbose_name = 'ثبت‌نام دوره'
		verbose_name_plural = 'ثبت‌نام‌های دوره'
		ordering = ['-created_at']
		constraints = [
			models.UniqueConstraint(fields=['user', 'course'], name='unique_enrollment_per_user_course'),
		]

	def __str__(self):
		return f'{self.user} — {self.course}'
