from django.contrib import admin
from django_jalali.admin.filters import JDateFieldListFilter

from .models import Cart, CartItem, Category, Product, ProductImage, ProductVariant


class ProductVariantInline(admin.TabularInline):
	model = ProductVariant
	extra = 1


class ProductImageInline(admin.TabularInline):
	model = ProductImage
	extra = 1


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
	list_display = ('name', 'slug', 'is_active')
	list_filter = ('is_active',)
	search_fields = ('name',)
	prepopulated_fields = {'slug': ('name',)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
	list_display = ('name', 'category', 'training_level', 'is_active')
	list_filter = ('is_active', 'category', 'training_level')
	search_fields = ('name', 'description', 'variants__sku')
	prepopulated_fields = {'slug': ('name',)}
	inlines = (ProductVariantInline, ProductImageInline)


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
	list_display = ('sku', 'product', 'size', 'color', 'price', 'stock_quantity', 'is_active')
	list_filter = ('is_active', 'size', 'color')
	search_fields = ('sku', 'product__name')


class CartItemInline(admin.TabularInline):
	model = CartItem
	readonly_fields = ('variant', 'quantity')
	extra = 0


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
	list_display = ('id', 'user', 'session_key', 'updated_at')
	list_filter = (('updated_at', JDateFieldListFilter),)
	readonly_fields = ('user', 'session_key', 'created_at', 'updated_at')
	inlines = (CartItemInline,)
