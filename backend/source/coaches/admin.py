from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse
from django_jalali.admin.filters import JDateFieldListFilter

from .models import CoachInvite, CoachPortfolio, CoachStudent
from .storage import PrivateFileInput


@admin.register(CoachPortfolio)
class CoachPortfolioAdmin(admin.ModelAdmin):
	list_display = ('display_name', 'user', 'belt', 'club', 'status', 'is_published', 'updated_at')
	list_filter = ('status', 'is_published', ('submitted_at', JDateFieldListFilter))
	search_fields = ('display_name', 'user__phone', 'club', 'coaching_level')
	readonly_fields = (
		'certificate_download',
		'created_at',
		'updated_at',
		'submitted_at',
		'reviewed_at',
	)
	fields = (
		'user',
		'display_name',
		'headline',
		'biography',
		'avatar',
		'coaching_level',
		'specializations',
		'years_experience',
		'belt',
		'club',
		'certificate_details',
		'certificate_document',
		'certificate_download',
		'status',
		'rejection_reason',
		'is_published',
		'submitted_at',
		'reviewed_at',
		'created_at',
		'updated_at',
	)

	@admin.display(description='فایل مدرک')
	def certificate_download(self, portfolio):
		if not portfolio.certificate_document:
			return 'فایلی بارگذاری نشده است'
		url = reverse('coaches:certificate_download', args=[portfolio.pk])
		return format_html('<a href="{}">دریافت فایل مدرک</a>', url)

	def formfield_for_dbfield(self, db_field, request, **kwargs):
		if db_field.name == 'certificate_document':
			# Private storage refuses `.url()`, which the default widget calls
			# while rendering the current file.
			kwargs['widget'] = PrivateFileInput
		return super().formfield_for_dbfield(db_field, request, **kwargs)

	def save_model(self, request, obj, form, change):
		# Review timestamps follow the lifecycle, like the old application admin.
		if not obj.submitted_at and obj.status in (
			CoachPortfolio.Status.PENDING_REVIEW,
			CoachPortfolio.Status.APPROVED,
			CoachPortfolio.Status.PUBLISHED,
			CoachPortfolio.Status.REJECTED,
		):
			obj.submitted_at = timezone.now()
		if obj.status in (CoachPortfolio.Status.APPROVED, CoachPortfolio.Status.REJECTED) and not obj.reviewed_at:
			obj.reviewed_at = timezone.now()
		super().save_model(request, obj, form, change)


@admin.register(CoachInvite)
class CoachInviteAdmin(admin.ModelAdmin):
	list_display = ('code', 'coach', 'label', 'uses', 'max_uses', 'is_active', 'expires_at', 'created_at')
	list_filter = ('is_active', ('created_at', JDateFieldListFilter))
	search_fields = ('code', 'label', 'coach__display_name')
	readonly_fields = ('code', 'uses', 'created_at')
	fields = ('coach', 'code', 'label', 'max_uses', 'uses', 'is_active', 'expires_at', 'created_at')


@admin.register(CoachStudent)
class CoachStudentAdmin(admin.ModelAdmin):
	list_display = ('coach', 'student', 'invite', 'created_at')
	list_filter = (('created_at', JDateFieldListFilter),)
	search_fields = ('coach__display_name', 'student__phone', 'student__first_name')
	readonly_fields = ('coach', 'student', 'invite', 'created_at')

	def has_add_permission(self, request):
		# Rows are created only by redeeming a code, which also bumps `uses`.
		return False
