from django.contrib import admin
from django.db import models
from django_jalali.admin.filters import JDateFieldListFilter

from coaches.storage import PrivateFileInput

from .models import Course, Enrollment, Episode


class EpisodeInline(admin.TabularInline):
	model = Episode
	extra = 0
	fields = ('order', 'title', 'duration', 'is_free', 'video_file')
	formfield_overrides = {models.FileField: {'widget': PrivateFileInput}}


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
	list_display = ('title', 'coach', 'level', 'price', 'status', 'created_at')
	list_filter = ('status', 'level', ('created_at', JDateFieldListFilter))
	search_fields = ('title', 'description', 'coach__display_name')
	inlines = (EpisodeInline,)
	actions = ('publish', 'return_to_draft')

	@admin.action(description='انتشار دوره‌های انتخاب‌شده')
	def publish(self, request, queryset):
		updated = queryset.update(status=Course.Status.PUBLISHED)
		self.message_user(request, f'{updated} دوره منتشر شد.')

	@admin.action(description='بازگرداندن به پیش‌نویس')
	def return_to_draft(self, request, queryset):
		updated = queryset.update(status=Course.Status.DRAFT)
		self.message_user(request, f'{updated} دوره به پیش‌نویس بازگشت.')


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
	list_display = ('title', 'course', 'order', 'duration', 'is_free')
	list_filter = ('is_free', 'course')
	search_fields = ('title', 'course__title')
	formfield_overrides = {models.FileField: {'widget': PrivateFileInput}}


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
	list_display = ('user', 'course', 'payment', 'created_at')
	list_filter = ('course', ('created_at', JDateFieldListFilter))
	search_fields = ('user__phone', 'course__title')
	readonly_fields = ('user', 'course', 'payment', 'created_at')

	def has_add_permission(self, request):
		return False
