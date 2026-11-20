from django.contrib import admin
from django_jalali.admin.filters import JDateFieldListFilter

from .models import Address, Order, OrderItem, Payment


class OrderItemInline(admin.TabularInline):
	model = OrderItem
	extra = 0
	can_delete = False
	readonly_fields = ('variant', 'product_name', 'size', 'color', 'unit_price', 'quantity')

	def has_add_permission(self, request, obj=None):
		return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
	list_display = ('number', 'user', 'status', 'total', 'created_at')
	list_filter = ('status', ('created_at', JDateFieldListFilter))
	search_fields = ('number', 'user__phone', 'receiver_name', 'receiver_phone')
	readonly_fields = (
		'number',
		'subtotal',
		'shipping_cost',
		'total',
		'payment',
		'receiver_name',
		'receiver_phone',
		'province',
		'city',
		'full_address',
		'postal_code',
		'created_at',
		'paid_at',
	)
	fieldsets = (
		(None, {'fields': ('number', 'user', 'status', 'payment')}),
		('مبالغ', {'fields': ('subtotal', 'shipping_cost', 'total')}),
		('نشانی ارسال', {
			'fields': ('receiver_name', 'receiver_phone', 'province', 'city', 'full_address', 'postal_code'),
		}),
		('زمان‌ها', {'fields': ('created_at', 'paid_at')}),
	)
	inlines = (OrderItemInline,)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
	list_display = ('authority', 'user', 'amount', 'status', 'gateway', 'ref_id', 'created_at')
	list_filter = ('status', 'gateway', ('created_at', JDateFieldListFilter))
	search_fields = ('authority', 'ref_id', 'user__phone')
	readonly_fields = (
		'user',
		'amount',
		'status',
		'gateway',
		'authority',
		'ref_id',
		'raw_response',
		'created_at',
		'verified_at',
	)

	def has_add_permission(self, request):
		return False


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
	list_display = ('user', 'province', 'city', 'is_default', 'created_at')
	list_filter = ('province', 'is_default', ('created_at', JDateFieldListFilter))
	search_fields = ('user__phone', 'receiver_name', 'city', 'postal_code')
