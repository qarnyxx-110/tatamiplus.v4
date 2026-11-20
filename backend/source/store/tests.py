from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import Cart, CartItem, Category, Product, ProductVariant


class StoreWorkflowTests(TestCase):
	def setUp(self):
		self.category = Category.objects.create(name='لباس تمرین', slug='training-wear')

	def create_product(self, name='محصول آزمایشی', slug='sample-product', price='1250', stock=5, size='M'):
		product = Product.objects.create(
			category=self.category,
			name=name,
			slug=slug,
			description='توضیحات آزمایشی',
			training_level='مبتدی',
			is_active=True,
		)
		variant = ProductVariant.objects.create(
			product=product,
			sku=f'SKU-{slug}',
			size=size,
			color='سفید',
			price=Decimal(price),
			stock_quantity=stock,
		)
		return product, variant

	def add_variant(self, product, variant, quantity, **extra_data):
		data = {'variant': variant.pk, 'quantity': quantity, **extra_data}
		return self.client.post(reverse('store:product_detail', args=[product.slug]), data)

	def test_product_filter_checks_size_and_price_on_available_variants(self):
		matching, _ = self.create_product()
		self.create_product(name='محصول گران', slug='expensive-product', price='5000', size='L')
		self.create_product(name='محصول ناموجود', slug='out-of-stock', stock=0)

		response = self.client.get(reverse('store:product_list'), {'size': 'M', 'max_price': '2000'})

		self.assertContains(response, matching.name)
		self.assertNotContains(response, 'محصول گران')
		self.assertNotContains(response, 'محصول ناموجود')

	def test_guest_cart_uses_database_price_not_submitted_price(self):
		product, variant = self.create_product(price='1234.50')

		response = self.add_variant(product, variant, 2, price='0.01', total='0.02')

		self.assertRedirects(response, reverse('store:cart'))
		cart = Cart.objects.get(pk=self.client.session['shopping_cart_id'])
		self.assertIsNone(cart.user_id)
		self.assertEqual(cart.total, Decimal('2469.00'))
		self.assertEqual(cart.items.get(variant=variant).quantity, 2)

	def test_cart_rejects_quantity_above_stock(self):
		product, variant = self.create_product(stock=2)

		response = self.add_variant(product, variant, 3)

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'تعداد درخواستی از موجودی فعلی بیشتر است.')
		self.assertFalse(CartItem.objects.filter(variant=variant).exists())

	def test_guest_cart_is_associated_with_user_after_login(self):
		product, variant = self.create_product()
		self.add_variant(product, variant, 2)
		guest_cart_id = self.client.session['shopping_cart_id']
		user = get_user_model().objects.create_user(
			username='shopper',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(user)

		response = self.client.get(reverse('store:cart'))

		self.assertEqual(response.status_code, 200)
		user_cart = Cart.objects.get(user=user)
		self.assertEqual(user_cart.items.get(variant=variant).quantity, 2)
		self.assertFalse(Cart.objects.filter(pk=guest_cart_id).exists())

	def test_cart_quantity_update_cannot_exceed_current_stock(self):
		product, variant = self.create_product(stock=3)
		self.add_variant(product, variant, 1)
		cart = Cart.objects.get(pk=self.client.session['shopping_cart_id'])
		item = cart.items.get(variant=variant)

		response = self.client.post(
			reverse('store:update_cart_item', args=[item.pk]),
			{'quantity': '4'},
		)

		self.assertRedirects(response, reverse('store:cart'))
		item.refresh_from_db()
		self.assertEqual(item.quantity, 1)


class StoreAdminLocalizationTests(TestCase):
	def test_cart_admin_changelist_renders_jalali_date_filter(self):
		staff = get_user_model().objects.create_superuser(
			phone='09120000103',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(staff)

		response = self.client.get(reverse('admin:store_cart_changelist'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'آخرین ویرایش')
