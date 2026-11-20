from django.db import models

# Create your models here.
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django_jalali.db import models as jmodels


class Category(models.Model):
	name = models.CharField('نام دسته‌بندی', max_length=100, unique=True)
	slug = models.SlugField('شناسهٔ نشانی', max_length=120, unique=True)
	is_active = models.BooleanField('نمایش در فروشگاه', default=True)

	class Meta:
		ordering = ['name']
		verbose_name = 'دسته‌بندی محصول'
		verbose_name_plural = 'دسته‌بندی‌های محصولات'

	def __str__(self):
		return self.name


class Product(models.Model):
	category = models.ForeignKey(
		Category,
		verbose_name='دسته‌بندی',
		on_delete=models.PROTECT,
		related_name='products',
	)
	name = models.CharField('نام محصول', max_length=180)
	slug = models.SlugField('شناسهٔ نشانی', max_length=200, unique=True)
	description = models.TextField('توضیحات', blank=True)
	training_level = models.CharField('سطح تمرین', max_length=80, blank=True)
	is_active = models.BooleanField('نمایش در فروشگاه', default=False)

	class Meta:
		ordering = ['name']
		verbose_name = 'محصول'
		verbose_name_plural = 'محصولات'

	def __str__(self):
		return self.name


class ProductVariant(models.Model):
	product = models.ForeignKey(
		Product,
		verbose_name='محصول',
		on_delete=models.CASCADE,
		related_name='variants',
	)
	sku = models.CharField('شناسهٔ کالا', max_length=80, unique=True)
	size = models.CharField('سایز', max_length=40, blank=True)
	color = models.CharField('رنگ', max_length=60, blank=True)
	price = models.DecimalField(
		'قیمت',
		max_digits=12,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.00'))],
	)
	stock_quantity = models.PositiveIntegerField('موجودی', default=0)
	is_active = models.BooleanField('فعال', default=True)

	class Meta:
		ordering = ['product__name', 'size', 'color']
		verbose_name = 'تنوع محصول'
		verbose_name_plural = 'تنوع‌های محصول'
		constraints = [
			models.UniqueConstraint(
				fields=['product', 'size', 'color'],
				name='unique_product_variant_attributes',
			),
			models.CheckConstraint(
				condition=Q(price__gte=0),
				name='product_variant_price_nonnegative',
			),
		]

	def __str__(self):
		attributes = ', '.join(value for value in (self.size, self.color) if value)
		return f'{self.product.name} ({attributes})' if attributes else self.product.name


class ProductImage(models.Model):
	product = models.ForeignKey(
		Product,
		verbose_name='محصول',
		on_delete=models.CASCADE,
		related_name='images',
	)
	image = models.ImageField('تصویر', upload_to='products/%Y/%m/')
	alt_text = models.CharField('متن جایگزین تصویر', max_length=180, blank=True)
	position = models.PositiveSmallIntegerField('ترتیب نمایش', default=0)

	class Meta:
		ordering = ['position', 'pk']
		verbose_name = 'تصویر محصول'
		verbose_name_plural = 'تصاویر محصولات'

	def __str__(self):
		return self.alt_text or self.product.name


class Cart(models.Model):
	objects = jmodels.jManager()

	user = models.OneToOneField(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.CASCADE,
		null=True,
		blank=True,
		related_name='shopping_cart',
	)
	session_key = models.CharField('شناسهٔ نشست مهمان', max_length=40, unique=True, null=True, blank=True)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	updated_at = jmodels.jDateTimeField('آخرین ویرایش', auto_now=True)

	class Meta:
		verbose_name = 'سبد خرید'
		verbose_name_plural = 'سبدهای خرید'
		constraints = [
			models.CheckConstraint(
				condition=(
					Q(user__isnull=False, session_key__isnull=True)
					| Q(user__isnull=True, session_key__isnull=False)
				),
				name='cart_has_exactly_one_owner',
			),
		]

	@property
	def total(self):
		return sum((item.subtotal for item in self.items.select_related('variant')), Decimal('0.00'))

	def __str__(self):
		return f'Shopping cart {self.pk}'


class CartItem(models.Model):
	cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
	variant = models.ForeignKey(
		ProductVariant,
		verbose_name='تنوع محصول',
		on_delete=models.PROTECT,
		related_name='cart_items',
	)
	quantity = models.PositiveIntegerField('تعداد', default=1, validators=[MinValueValidator(1)])

	class Meta:
		verbose_name = 'قلم سبد خرید'
		verbose_name_plural = 'اقلام سبد خرید'
		constraints = [
			models.UniqueConstraint(fields=['cart', 'variant'], name='unique_variant_per_cart'),
			models.CheckConstraint(condition=Q(quantity__gte=1), name='cart_item_quantity_positive'),
		]

	@property
	def subtotal(self):
		return self.variant.price * self.quantity

	def __str__(self):
		return f'{self.variant} x {self.quantity}'
