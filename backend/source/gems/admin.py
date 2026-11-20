from django.contrib import admin
from django_jalali.admin.filters import JDateFieldListFilter

from .models import GemRule, GemTransaction


@admin.register(GemRule)
class GemRuleAdmin(admin.ModelAdmin):
	list_display = ('reason', 'amount', 'is_percentage', 'daily_limit', 'is_active')
	list_editable = ('amount', 'is_percentage', 'daily_limit', 'is_active')
	list_filter = ('is_active', 'is_percentage')
	search_fields = ('reason',)


@admin.register(GemTransaction)
class GemTransactionAdmin(admin.ModelAdmin):
	list_display = ('user', 'amount', 'reason', 'ref_type', 'ref_id', 'created_at')
	list_filter = ('reason', ('created_at', JDateFieldListFilter))
	search_fields = ('user__phone', 'ref_id', 'note')
	readonly_fields = ('user', 'amount', 'reason', 'ref_type', 'ref_id', 'note', 'created_at')

	def has_add_permission(self, request):
		# The ledger is append-only from the service layer; a hand-typed row
		# would silently diverge from the cached balance.
		return False
