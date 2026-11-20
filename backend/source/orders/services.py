from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from store.models import ProductVariant

from .gateways import get_gateway
from .models import Order, OrderItem, Payment
from .signals import payment_succeeded


class CheckoutError(Exception):
	"""A business rule stopped checkout. The message is safe to show a user."""


def unavailable_items(cart):
	"""Cart lines that can no longer be bought as configured.

	Used by the review page so the shopper sees the problem before reaching
	the gateway, not after paying.
	"""
	problems = []
	items = cart.items.select_related('variant', 'variant__product', 'variant__product__category')
	for item in items:
		variant = item.variant
		if not variant.is_active or not variant.product.is_active or not variant.product.category.is_active:
			problems.append((item, 'این محصول دیگر عرضه نمی‌شود.'))
		elif item.quantity > variant.stock_quantity:
			problems.append((item, 'تعداد درخواستی از موجودی بیشتر است.'))
	return problems


@transaction.atomic
def create_order_from_cart(cart, address, shipping_cost=None):
	"""Turn a cart into a pending order with locked-in prices.

	Prices are read from the database while the variant rows are locked, so a
	price change between "add to cart" and "pay" cannot be exploited and a
	crafted POST body has no influence on the amount charged.
	"""
	if cart.user_id is None:
		raise CheckoutError('برای ثبت سفارش ابتدا وارد حساب کاربری شوید.')

	items = list(cart.items.select_related('variant'))
	if not items:
		raise CheckoutError('سبد خرید خالی است.')

	locked = {
		variant.pk: variant
		for variant in ProductVariant.objects.select_for_update()
		.filter(pk__in=[item.variant_id for item in items])
		.select_related('product', 'product__category')
	}

	subtotal = Decimal('0.00')
	lines = []
	for item in items:
		variant = locked.get(item.variant_id)
		if variant is None or not variant.is_active or not variant.product.is_active or not variant.product.category.is_active:
			raise CheckoutError('یکی از محصولات سبد دیگر عرضه نمی‌شود. سبد را به‌روزرسانی کنید.')
		if item.quantity > variant.stock_quantity:
			raise CheckoutError(f'موجودی «{variant.product.name}» کافی نیست.')
		subtotal += variant.price * item.quantity
		lines.append((variant, item.quantity))

	shipping = Decimal(settings.SHIPPING_FLAT_RATE) if shipping_cost is None else Decimal(shipping_cost)

	order = Order.objects.create(
		user=cart.user,
		subtotal=subtotal,
		shipping_cost=shipping,
		total=subtotal + shipping,
		receiver_name=address.receiver_name or address.user.get_full_name(),
		receiver_phone=address.receiver_phone or address.user.phone or '',
		province=address.province,
		city=address.city,
		full_address=address.full_address,
		postal_code=address.postal_code,
	)

	OrderItem.objects.bulk_create([
		OrderItem(
			order=order,
			variant=variant,
			product_name=variant.product.name,
			size=variant.size,
			color=variant.color,
			unit_price=variant.price,
			quantity=quantity,
		)
		for variant, quantity in lines
	])
	return order


@transaction.atomic
def begin_payment(*, user, amount, description, callback_url='', metadata=None):
	"""Open a gateway transaction for any amount.

	Orders and course purchases both come through here, so gateway handling
	stays in one place as the club is added.
	"""
	gateway = get_gateway()
	request = gateway.request_payment(
		amount=amount,
		description=description,
		callback_url=callback_url,
	)
	payment = Payment.objects.create(
		user=user,
		amount=amount,
		gateway=gateway.name,
		authority=request.authority,
		metadata=metadata or {},
	)
	return payment, request.redirect_url


@transaction.atomic
def start_payment(order, callback_url=''):
	payment, redirect_url = begin_payment(
		user=order.user,
		amount=order.total,
		description=f'سفارش {order.number}',
		callback_url=callback_url,
		metadata={'order_id': order.pk},
	)
	order.payment = payment
	order.save(update_fields=['payment'])
	return payment, redirect_url


def _decrement_stock(order):
	"""Subtract ordered quantities, refusing to go negative.

	`filter(stock_quantity__gte=quantity)` plus `F()` makes this a single
	conditional UPDATE, so two shoppers paying for the last item cannot both
	succeed. The caller runs it inside a savepoint: if any line fails, earlier
	decrements in the same order are rolled back too.
	"""
	for item in order.items.all():
		updated = ProductVariant.objects.filter(
			pk=item.variant_id,
			stock_quantity__gte=item.quantity,
		).update(stock_quantity=F('stock_quantity') - item.quantity)
		if not updated:
			raise CheckoutError(f'موجودی «{item.product_name}» کافی نیست.')


@transaction.atomic
def complete_payment(payment, callback_data):
	"""Settle a payment from the gateway callback.

	Safe to call repeatedly: the first call wins and later calls return the
	stored result without touching stock again.
	"""
	payment = Payment.objects.select_for_update().get(pk=payment.pk)
	if payment.status != Payment.Status.PENDING:
		return payment

	order = getattr(payment, 'order', None)
	gateway = get_gateway(payment.gateway)
	result = gateway.verify_payment(
		authority=payment.authority,
		amount=payment.amount,
		callback_data=callback_data,
	)
	payment.raw_response = result.raw

	if not result.ok:
		payment.status = Payment.Status.FAILED
		payment.save(update_fields=['status', 'raw_response'])
		if order is not None:
			order.status = Order.Status.FAILED
			order.save(update_fields=['status'])
		return payment

	if order is not None:
		try:
			with transaction.atomic():
				_decrement_stock(order)
		except CheckoutError as exc:
			# The money was taken but the goods are gone. A real gateway needs a
			# refund call here; the mock only records why the order was stopped.
			payment.status = Payment.Status.FAILED
			payment.raw_response = {**result.raw, 'stock_error': str(exc)}
			payment.save(update_fields=['status', 'raw_response'])
			order.status = Order.Status.CANCELLED
			order.save(update_fields=['status'])
			return payment

	payment.status = Payment.Status.SUCCEEDED
	payment.ref_id = result.ref_id
	payment.verified_at = timezone.now()
	payment.save(update_fields=['status', 'ref_id', 'verified_at', 'raw_response'])

	if order is not None:
		order.status = Order.Status.PAID
		order.paid_at = timezone.now()
		order.save(update_fields=['status', 'paid_at'])

	payment_succeeded.send(sender=Payment, payment=payment)
	return payment
