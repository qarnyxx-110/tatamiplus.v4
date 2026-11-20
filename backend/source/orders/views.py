from decimal import Decimal

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from store.models import Cart
from store.services import get_or_create_cart

from .forms import AddressForm
from .gateways import PaymentGatewayError
from .models import Payment
from .services import CheckoutError, complete_payment, create_order_from_cart, start_payment, unavailable_items


def _checkout_cart(request):
	"""The signed-in user's cart, or None when there is nothing to buy."""
	cart = get_or_create_cart(request)
	if not cart.items.exists():
		return None
	return cart


def _selected_address(request):
	address_id = request.session.get('checkout_address_id')
	if not address_id:
		return None
	# Scoped to the signed-in user: a guessed id from another account is a 404.
	return request.user.addresses.filter(pk=address_id).first()


@login_required
def address_step(request):
	if _checkout_cart(request) is None:
		messages.error(request, 'برای ثبت سفارش، ابتدا محصولی به سبد اضافه کنید.')
		return redirect('store:cart')

	addresses = request.user.addresses.all()
	form = AddressForm(request.POST or None)

	if request.method == 'POST':
		chosen_id = request.POST.get('address_id')
		if chosen_id:
			address = get_object_or_404(request.user.addresses, pk=chosen_id)
			request.session['checkout_address_id'] = address.pk
			return redirect('orders:review')
		if form.is_valid():
			address = form.save(commit=False)
			address.user = request.user
			if not addresses.exists():
				address.is_default = True
			address.save()
			request.session['checkout_address_id'] = address.pk
			messages.success(request, 'نشانی ذخیره شد.')
			return redirect('orders:review')

	return render(request, 'orders/address.html', {
		'addresses': addresses,
		'form': form,
		'selected': _selected_address(request),
	})


@login_required
def review(request):
	cart = _checkout_cart(request)
	if cart is None:
		messages.error(request, 'برای ثبت سفارش، ابتدا محصولی به سبد اضافه کنید.')
		return redirect('store:cart')

	address = _selected_address(request)
	if address is None:
		messages.info(request, 'ابتدا نشانی ارسال را انتخاب یا ثبت کنید.')
		return redirect('orders:address')

	items = list(cart.items.select_related('variant', 'variant__product'))
	shipping = Decimal(settings.SHIPPING_FLAT_RATE)
	return render(request, 'orders/review.html', {
		'items': items,
		'address': address,
		'subtotal': cart.total,
		'shipping': shipping,
		'total': cart.total + shipping,
		'problems': unavailable_items(cart),
	})


@login_required
@require_POST
def pay(request):
	cart = _checkout_cart(request)
	if cart is None:
		messages.error(request, 'برای ثبت سفارش، ابتدا محصولی به سبد اضافه کنید.')
		return redirect('store:cart')

	address = _selected_address(request)
	if address is None:
		return redirect('orders:address')

	try:
		order = create_order_from_cart(cart, address)
	except CheckoutError as exc:
		messages.error(request, str(exc))
		return redirect('orders:review')

	try:
		_payment, redirect_url = start_payment(
			order,
			callback_url=request.build_absolute_uri(reverse('orders:callback')),
		)
	except PaymentGatewayError:
		messages.error(request, 'اتصال به درگاه پرداخت ممکن نشد. سفارش ثبت شد؛ دوباره تلاش کنید.')
		return redirect('orders:review')

	return redirect(redirect_url)


def mock_gateway(request, authority):
	"""Local stand-in for the provider's payment page."""
	if not settings.DEBUG:
		raise Http404

	payment = get_object_or_404(Payment, authority=authority)
	callback_url = reverse('orders:callback')
	return render(request, 'orders/mock_gateway.html', {
		'payment': payment,
		'ok_url': f'{callback_url}?Status=OK&Authority={authority}',
		'fail_url': f'{callback_url}?Status=NOK&Authority={authority}',
	})


def payment_callback(request):
	"""The provider sends the shopper back here.

	No login is required: the authority is the credential. Settling is
	idempotent, so a refreshed or repeated callback cannot charge twice.
	"""
	data = request.GET.dict() if request.method == 'GET' else request.POST.dict()
	authority = data.get('Authority') or data.get('authority')
	if not authority:
		raise Http404

	payment = get_object_or_404(Payment, authority=authority)
	payment = complete_payment(payment, data)
	order = getattr(payment, 'order', None)

	if payment.status == Payment.Status.SUCCEEDED:
		# Only a shop order empties the cart. A course purchase must not throw
		# away whatever the user had saved for later.
		if order is not None:
			Cart.objects.filter(user=payment.user).delete()
			request.session.pop('shopping_cart_id', None)
			request.session.pop('checkout_address_id', None)
		messages.success(request, 'پرداخت با موفقیت انجام شد.')
	else:
		if (payment.metadata or {}).get('course_id'):
			messages.error(request, 'پرداخت ناموفق بود. دسترسی به دوره فعال نشد.')
		else:
			messages.error(request, 'پرداخت ناموفق بود یا موجودی محصول تغییر کرده است.')

	return render(request, 'orders/payment_result.html', {
		'payment': payment,
		'order': order,
		'course': getattr(getattr(payment, 'enrollment', None), 'course', None),
	})


@login_required
def order_list(request):
	orders = request.user.orders.prefetch_related('items')
	page = Paginator(orders, 10).get_page(request.GET.get('page'))
	return render(request, 'orders/order_list.html', {'page': page})


@login_required
def order_detail(request, number):
	order = get_object_or_404(request.user.orders.prefetch_related('items'), number=number)
	return render(request, 'orders/order_detail.html', {'order': order})
