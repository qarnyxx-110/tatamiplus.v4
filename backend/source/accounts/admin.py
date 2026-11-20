from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django_jalali.admin.filters import JDateFieldListFilter

from .models import SignupLead, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
	fieldsets = DjangoUserAdmin.fieldsets + (
		('تاتامی پلاس', {'fields': ('role',)}),
		('اطلاعات تماس و پروفایل', {'fields': ('phone', 'city', 'is_profile_complete')}),
	)
	add_fieldsets = DjangoUserAdmin.add_fieldsets + (
		('تاتامی پلاس', {'fields': ('role',)}),
		('اطلاعات تماس و پروفایل', {'fields': ('phone', 'city', 'is_profile_complete')}),
	)
	list_display = (*DjangoUserAdmin.list_display, 'phone', 'role', 'is_profile_complete')
	list_filter = (*DjangoUserAdmin.list_filter, 'role', 'is_profile_complete')


@admin.register(SignupLead)
class SignupLeadAdmin(admin.ModelAdmin):
	list_display = ('phone', 'name', 'status', 'assigned_to', 'created_at')
	list_filter = ('status', ('created_at', JDateFieldListFilter))
	list_editable = ('status',)
	search_fields = ('user__phone', 'user__first_name', 'user__last_name', 'note')
	readonly_fields = ('user', 'called_at', 'created_at')
	fields = ('user', 'status', 'note', 'assigned_to', 'called_at', 'created_at')
	date_hierarchy = 'created_at'
	ordering = ('-created_at',)

	@admin.display(description='شمارهٔ همراه')
	def phone(self, lead):
		return lead.user.phone

	@admin.display(description='نام')
	def name(self, lead):
		return lead.user.first_name or lead.user.username

	def _is_call_center(self, request):
		return request.user.is_superuser or request.user.groups.filter(name='call_center').exists()

	def has_module_permission(self, request):
		return self._is_call_center(request)

	def has_view_permission(self, request, obj=None):
		return self._is_call_center(request)

	def has_change_permission(self, request, obj=None):
		return self._is_call_center(request)

	def has_add_permission(self, request):
		return False

	def has_delete_permission(self, request, obj=None):
		return request.user.has_perm('accounts.delete_user')

	def formfield_for_foreignkey(self, db_field, request, **kwargs):
		if db_field.name == 'assigned_to':
			kwargs['queryset'] = User.objects.filter(groups__name='call_center').distinct()
		return super().formfield_for_foreignkey(db_field, request, **kwargs)
