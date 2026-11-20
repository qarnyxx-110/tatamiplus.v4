from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from store.models import Cart, CartItem, Category, Product, ProductVariant

from .models import Address, Order, OrderItem, Payment


@override_settings(
	PAYMENT_ALLOW_MOCK=True,
	SHIPPING_FLAT_RATE=Decimal('25000'),
)
class CheckoutFlowTests(TestCase):
	def setUp(self):
		self.user = get_user_model().objects.create_user(
			username='shopper',
			password='Safe-Training-Password-914!',
		)
		self.category = Category.objects.create(name='لباس تمرین', slug='training-wear')
		self.product = Product.objects.create(
			category=self.category,
			name='محصول آزمایشی',
			slug='sample-product',
			is_active=True,
		)
		self.variant = ProductVariant.objects.create(
			product=self.product,
			sku='SKU-1',
			size='M',
			color='سفید',
			price=Decimal('1000'),
			stock_quantity=5,
		)
		self.address = Address.objects.create(
			user=self.user,
			province='تهران',
			city='تهران',
			full_address='خیابان آزمایشی، پلاک ۱',
			postal_code='1234567890',
		)

	def fill_cart(self, quantity=2):
		cart, _ = Cart.objects.get_or_create(user=self.user)
		CartItem.objects.create(cart=cart, variant=self.variant, quantity=quantity)
		return cart

	def choose_address(self):
		return self.client.post(reverse('orders:address'), {'address_id': self.address.pk})

	def test_checkout_requires_login(self):
		response = self.client.get(reverse('orders:review'))

		self.assertEqual(response.status_code, 302)
		self.assertIn(reverse('phone_auth:login'), response['Location'])

	def test_review_without_address_redirects_to_address_step(self):
		self.client.force_login(self.user)
		self.fill_cart()

		response = self.client.get(reverse('orders:review'))

		self.assertRedirects(response, reverse('orders:address'))

	def test_first_saved_address_becomes_default(self):
		self.client.force_login(self.user)
		self.fill_cart()
		self.address.delete()

		response = self.client.post(reverse('orders:address'), {
			'province': 'البرز',
			'city': 'کرج',
			'full_address': 'بلوار آزمایشی، پلاک ۲',
			'postal_code': '1234567891',
			'receiver_name': 'گیرندهٔ آزمایشی',
			'receiver_phone': '+98 912 000 0000',
		})

		self.assertEqual(response.status_code, 302)
		address = Address.objects.get(user=self.user)
		self.assertTrue(address.is_default)
		self.assertEqual(address.receiver_phone, '09120000000')
		self.assertEqual(self.client.session['checkout_address_id'], address.pk)

	def test_review_adds_flat_shipping_and_computes_total_on_the_server(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()

		response = self.client.get(reverse('orders:review'))

		self.assertEqual(response.context['subtotal'], Decimal('2000.00'))
		self.assertEqual(response.context['shipping'], Decimal('25000'))
		self.assertEqual(response.context['total'], Decimal('27000.00'))

	def test_pay_creates_pending_order_with_locked_prices(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()

		response = self.client.post(reverse('orders:pay'), {
			'price': '1',
			'total': '1',
			'shipping_cost': '0',
		})

		order = Order.objects.get(user=self.user)
		self.assertEqual(response.status_code, 302)
		self.assertEqual(order.status, Order.Status.PENDING_PAYMENT)
		self.assertEqual(order.subtotal, Decimal('2000.00'))
		self.assertEqual(order.shipping_cost, Decimal('25000'))
		self.assertEqual(order.total, Decimal('27000.00'))
		self.assertEqual(order.items.get().unit_price, Decimal('1000'))
		self.assertEqual(order.payment.amount, Decimal('27000.00'))
		self.assertEqual(order.payment.status, Payment.Status.PENDING)

	def test_successful_callback_marks_order_paid_and_decrements_stock(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		response = self.client.get(
			reverse('orders:callback'),
			{'Status': 'OK', 'Authority': order.payment.authority},
		)

		order.refresh_from_db()
		order.payment.refresh_from_db()
		self.variant.refresh_from_db()
		self.assertEqual(response.status_code, 200)
		self.assertEqual(order.status, Order.Status.PAID)
		self.assertIsNotNone(order.paid_at)
		self.assertEqual(order.payment.status, Payment.Status.SUCCEEDED)
		self.assertTrue(order.payment.ref_id.startswith('MOCK-'))
		self.assertEqual(self.variant.stock_quantity, 3)
		self.assertFalse(Cart.objects.filter(user=self.user).exists())

	def test_repeated_callback_does_not_charge_or_deduct_twice(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)
		callback_url = reverse('orders:callback')
		data = {'Status': 'OK', 'Authority': order.payment.authority}

		self.client.get(callback_url, data)
		self.client.get(callback_url, data)

		self.variant.refresh_from_db()
		self.assertEqual(self.variant.stock_quantity, 3)
		self.assertEqual(Payment.objects.count(), 1)

	def test_failed_callback_marks_order_failed_and_keeps_stock(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		response = self.client.get(
			reverse('orders:callback'),
			{'Status': 'NOK', 'Authority': order.payment.authority},
		)

		order.refresh_from_db()
		self.variant.refresh_from_db()
		self.assertEqual(response.status_code, 200)
		self.assertEqual(order.status, Order.Status.FAILED)
		self.assertEqual(order.payment.status, Payment.Status.FAILED)
		self.assertEqual(self.variant.stock_quantity, 5)
		self.assertTrue(Cart.objects.filter(user=self.user).exists())

	def test_pay_is_blocked_when_stock_disappeared(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=2)
		self.choose_address()
		ProductVariant.objects.filter(pk=self.variant.pk).update(stock_quantity=1)

		response = self.client.post(reverse('orders:pay'))

		self.assertRedirects(response, reverse('orders:review'))
		self.assertFalse(Order.objects.filter(user=self.user).exists())

	def test_another_users_address_cannot_be_selected(self):
		other = get_user_model().objects.create_user(username='other', password='Safe-Training-Password-914!')
		foreign = Address.objects.create(
			user=other,
			province='فارس',
			city='شیراز',
			full_address='نشانی دیگری',
			postal_code='1234567892',
		)
		self.client.force_login(self.user)
		self.fill_cart()

		response = self.client.post(reverse('orders:address'), {'address_id': foreign.pk})

		self.assertEqual(response.status_code, 404)

	def test_order_history_is_scoped_to_the_signed_in_user(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=1)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		other = get_user_model().objects.create_user(username='other', password='Safe-Training-Password-914!')
		self.client.force_login(other)
		response = self.client.get(reverse('orders:detail', args=[order.number]))

		self.assertEqual(response.status_code, 404)

	def test_address_page_renders_for_a_signed_in_user(self):
		self.client.force_login(self.user)
		self.fill_cart()

		response = self.client.get(reverse('orders:address'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'نشانی ارسال')

	def test_order_history_page_renders_an_empty_state(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('orders:list'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'هنوز سفارشی ثبت نکرده‌اید')

	@override_settings(DEBUG=True)
	def test_mock_gateway_page_offers_both_outcomes(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=1)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		response = self.client.get(reverse('orders:mock_gateway', args=[order.payment.authority]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'Status=OK')
		self.assertContains(response, 'Status=NOK')

	def test_order_detail_renders_for_the_owner(self):
		self.client.force_login(self.user)
		self.fill_cart(quantity=1)
		self.choose_address()
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		response = self.client.get(reverse('orders:detail', args=[order.number]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, order.number)
		self.assertContains(response, self.product.name)
		self.assertEqual(OrderItem.objects.filter(order=order).count(), 1)
