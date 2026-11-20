from django.conf import settings
from django.db import models
from django_jalali.db import models as jmodels


class Post(models.Model):
	"""A weblog entry.

	Written and published from Django Admin only — there is no public
	submission path. `is_published` is the single gate the public views
	check, and `published_at` is stamped the first time a post goes live.
	"""

	objects = jmodels.jManager()

	title = models.CharField('عنوان', max_length=200)
	slug = models.SlugField(
		'شناسهٔ نشانی',
		max_length=200,
		unique=True,
		blank=True,
		allow_unicode=True,
	)
	excerpt = models.TextField('خلاصه', blank=True)
	body = models.TextField('متن')
	cover = models.ImageField('تصویر شاخص', upload_to='blog/covers/%Y/%m/', blank=True)
	author = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='نویسنده',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='blog_posts',
	)
	is_published = models.BooleanField('منتشر شود', default=False)
	published_at = jmodels.jDateTimeField('زمان انتشار', null=True, blank=True)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	updated_at = jmodels.jDateTimeField('آخرین ویرایش', auto_now=True)

	class Meta:
		verbose_name = 'پست وبلاگ'
		verbose_name_plural = 'پست‌های وبلاگ'
		ordering = ['-published_at', '-created_at']

	def __str__(self):
		return self.title
