import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models, transaction
from django.urls import reverse
from django_jalali.db import models as jmodels

from store.models import ProductVariant


class Address(models.Model):
	"""A shipping address owned by one user.

	Addresses are copied onto the order when it is placed, so editing or
	deleting an address later never rewrites an existing order.
	"""

	objects = jmodels.jManager()

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.CASCADE,
		related_name='addresses',
	)
	province = models.CharField('استان', max_length=50)
	city = models.CharField('شهر', max_length=60)
	full_address = models.TextField('نشانی کامل')
	postal_code = models.CharField(
		'کد پستی',
		max_length=10,
		validators=[RegexValidator(r'^\d{10}$', 'کد پستی باید ۱۰ رقم باشد.')],
	)
	receiver_name = models.CharField('نام گیرنده', max_length=150, blank=True)
	receiver_phone = models.CharField('همراه گیرنده', max_length=11, blank=True)
	latitude = models.DecimalField('عرض جغرافیایی', max_digits=9, decimal_places=6, null=True, blank=True)
	longitude = models.DecimalField('طول جغرافیایی', max_digits=9, decimal_places=6, null=True, blank=True)
	is_default = models.BooleanField('نشانی پیش‌فرض', default=False)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	updated_at = jmodels.jDateTimeField('آخرین ویرایش', auto_now=True)

	class Meta:
		verbose_name = 'نشانی'
		verbose_name_plural = 'نشانی‌ها'
		ordering = ['-is_default', '-pk']
		constraints = [
			models.UniqueConstraint(
				fields=['user'],
				condition=models.Q(is_default=True),
				name='one_default_address_per_user',
			),
		]

	def save(self, *args, **kwargs):
		# Only one default address may exist per user; clear the previous one
		# in the same transaction so the partial unique constraint cannot fire.
		with transaction.atomic():
			if self.is_default and self.user_id:
				Address.objects.filter(user_id=self.user_id, is_default=True).exclude(pk=self.pk).update(
					is_default=False,
				)
			super().save(*args, **kwargs)

	def __str__(self):
		return f'{self.province}، {self.city} — {self.full_address[:40]}'


class Payment(models.Model):
	"""A single gateway transaction.

	Payment deliberately does not point at what it pays for: `Order.payment`
	(and later `Enrollment.payment`) point here. Adding a new kind of
	purchasable thing therefore needs no schema change on Payment.
	"""

	objects = jmodels.jManager()

	class Status(models.TextChoices):
		PENDING = 'pending', 'در انتظار پرداخت'
		SUCCEEDED = 'succeeded', 'موفق'
		FAILED = 'failed', 'ناموفق'

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.PROTECT,
		related_name='payments',
	)
	amount = models.DecimalField(
		'مبلغ',
		max_digits=12,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.00'))],
	)
	status = models.CharField('وضعیت', max_length=20, choices=Status.choices, default=Status.PENDING)
	gateway = models.CharField('درگاه', max_length=120)
	authority = models.CharField('شناسهٔ تراکنش درگاه', max_length=64, unique=True)
	ref_id = models.CharField('کد پیگیری', max_length=64, blank=True)
	raw_response = models.JSONField('پاسخ خام درگاه', default=dict, blank=True)
	# What the payment is for, without a hard foreign key per purchasable type:
	# {'order_id': 12} or {'course_id': 7}. Receivers read this on success.
	metadata = models.JSONField('فراداده', default=dict, blank=True)
	created_at = jmodels.jDateTimeField('زمان ایجاد', auto_now_add=True)
	verified_at = jmodels.jDateTimeField('زمان تأیید', null=True, blank=True)

	class Meta:
		verbose_name = 'پرداخت'
		verbose_name_plural = 'پرداخت‌ها'
		ordering = ['-created_at']

	def __str__(self):
		return f'{self.authority} ({self.get_status_display()})'


class Order(models.Model):
	"""A placed order.

	`subtotal`, `shipping_cost`, `total`, and every receiver field are stored
	here as fixed values. They are computed on the server at checkout time and
	never read back from the browser.
	"""

	objects = jmodels.jManager()

	class Status(models.TextChoices):
		PENDING_PAYMENT = 'pending_payment', 'در انتظار پرداخت'
		PAID = 'paid', 'پرداخت‌شده'
		FAILED = 'failed', 'ناموفق'
		CANCELLED = 'cancelled', 'لغو‌شده'

	number = models.CharField('شمارهٔ سفارش', max_length=20, unique=True, editable=False)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		verbose_name='کاربر',
		on_delete=models.PROTECT,
		related_name='orders',
	)
	status = models.CharField('وضعیت', max_length=20, choices=Status.choices, default=Status.PENDING_PAYMENT)
	payment = models.OneToOneField(
		Payment,
		verbose_name='پرداخت',
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name='order',
	)
	subtotal = models.DecimalField('جمع اقلام', max_digits=12, decimal_places=2)
	shipping_cost = models.DecimalField('هزینهٔ ارسال', max_digits=12, decimal_places=2)
	total = models.DecimalField('مبلغ کل', max_digits=12, decimal_places=2)

	# Address snapshot: the order must keep the address it was shipped to even
	# if the user edits or deletes that address afterwards.
	receiver_name = models.CharField('نام گیرنده', max_length=150, blank=True)
	receiver_phone = models.CharField('همراه گیرنده', max_length=11, blank=True)
	province = models.CharField('استان', max_length=50)
	city = models.CharField('شهر', max_length=60)
	full_address = models.TextField('نشانی کامل')
	postal_code = models.CharField('کد پستی', max_length=10)

	created_at = jmodels.jDateTimeField('زمان ثبت', auto_now_add=True)
	paid_at = jmodels.jDateTimeField('زمان پرداخت', null=True, blank=True)

	class Meta:
		verbose_name = 'سفارش'
		verbose_name_plural = 'سفارش‌ها'
		ordering = ['-created_at']

	def save(self, *args, **kwargs):
		if not self.number:
			self.number = f'TP-{uuid.uuid4().hex[:10].upper()}'
		super().save(*args, **kwargs)

	def get_absolute_url(self):
		return reverse('orders:detail', args=[self.number])

	def __str__(self):
		return self.number


class OrderItem(models.Model):
	"""One ordered line.

	Product name, size, and color are copied from the catalog at checkout so
	the order still shows what was bought after the product is renamed.
	"""

	order = models.ForeignKey(Order, verbose_name='سفارش', on_delete=models.CASCADE, related_name='items')
	variant = models.ForeignKey(
		ProductVariant,
		verbose_name='تنوع محصول',
		on_delete=models.PROTECT,
		related_name='order_items',
	)
	product_name = models.CharField('نام محصول', max_length=180)
	size = models.CharField('سایز', max_length=40, blank=True)
	color = models.CharField('رنگ', max_length=60, blank=True)
	unit_price = models.DecimalField(
		'قیمت واحد',
		max_digits=12,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.00'))],
	)
	quantity = models.PositiveIntegerField('تعداد', validators=[MinValueValidator(1)])

	class Meta:
		verbose_name = 'قلم سفارش'
		verbose_name_plural = 'اقلام سفارش'
		constraints = [
			models.UniqueConstraint(fields=['order', 'variant'], name='unique_variant_per_order'),
			models.CheckConstraint(condition=models.Q(quantity__gte=1), name='order_item_quantity_positive'),
			models.CheckConstraint(condition=models.Q(unit_price__gte=0), name='order_item_price_nonnegative'),
		]

	@property
	def subtotal(self):
		return self.unit_price * self.quantity

	def __str__(self):
		return f'{self.product_name} × {self.quantity}'
