from django.contrib import admin
from django.utils import timezone
from django.utils.text import slugify
from django_jalali.admin.filters import JDateFieldListFilter

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
	list_display = ('title', 'author', 'is_published', 'published_at', 'updated_at')
	list_filter = ('is_published', ('published_at', JDateFieldListFilter))
	search_fields = ('title', 'excerpt', 'body')
	fields = (
		'title',
		'slug',
		'excerpt',
		'body',
		'cover',
		'author',
		'is_published',
		'published_at',
		'created_at',
		'updated_at',
	)
	readonly_fields = ('created_at', 'updated_at')

	def save_model(self, request, obj, form, change):
		if not obj.slug:
			obj.slug = self._unique_slug(obj)
		if obj.is_published and not obj.published_at:
			# The first publish stamps the date; later edits keep it.
			obj.published_at = timezone.now()
		if not obj.author_id:
			obj.author = request.user
		super().save_model(request, obj, form, change)

	@staticmethod
	def _unique_slug(post):
		base = slugify(post.title, allow_unicode=True) or 'post'
		slug = base
		suffix = 2
		while Post.objects.filter(slug=slug).exclude(pk=post.pk).exists():
			slug = f'{base}-{suffix}'
			suffix += 1
		return slug
