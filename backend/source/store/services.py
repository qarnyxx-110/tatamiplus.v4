from django.db import transaction

from .models import Cart, CartItem


@transaction.atomic
def get_or_create_cart(request):
	if request.session.session_key is None:
		request.session.create()
	
	guest_cart_id = request.session.get('shopping_cart_id')
	if not request.user.is_authenticated:
		cart = None
		if guest_cart_id:
			cart = Cart.objects.filter(
				pk=guest_cart_id,
				user__isnull=True,
				session_key=request.session.session_key,
			).first()
		if cart is None:
			cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
		request.session['shopping_cart_id'] = cart.pk
		return cart

	cart, _ = Cart.objects.get_or_create(user=request.user)
	guest_cart = None
	if guest_cart_id:
		guest_cart = Cart.objects.filter(
			pk=guest_cart_id,
			user__isnull=True,
		).prefetch_related('items').first()
	if guest_cart:
		for guest_item in guest_cart.items.all():
			user_item, created = CartItem.objects.get_or_create(
				cart=cart,
				variant=guest_item.variant,
				defaults={'quantity': guest_item.quantity},
			)
			if not created:
				user_item.quantity += guest_item.quantity
				user_item.save(update_fields=['quantity'])
		guest_cart.delete()

	request.session['shopping_cart_id'] = cart.pk
	return cart