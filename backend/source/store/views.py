from django.contrib import messages
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Min, Q
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import AddToCartForm, ProductFilterForm
from .models import CartItem, Product, ProductVariant
from .services import get_or_create_cart


def product_list(request):
	form = ProductFilterForm(request.GET or None)
	available_variants = Q(variants__is_active=True, variants__stock_quantity__gt=0)
	products = Product.objects.filter(
		is_active=True,
		category__is_active=True,
	).annotate(
		starting_price=Min('variants__price', filter=available_variants),
	).filter(starting_price__isnull=False).order_by('name', 'pk')

	if form.is_valid():
		data = form.cleaned_data
		if data['query']:
			products = products.filter(Q(name__icontains=data['query']) | Q(description__icontains=data['query']))
		if data['category']:
			products = products.filter(category=data['category'])

		variant_filters = {'variants__is_active': True, 'variants__stock_quantity__gt': 0}
		for field in ('size', 'color'):
			if data[field]:
				variant_filters[f'variants__{field}__iexact'] = data[field]
		if data['training_level']:
			products = products.filter(training_level__iexact=data['training_level'])
		if data['min_price'] is not None:
			variant_filters['variants__price__gte'] = data['min_price']
		if data['max_price'] is not None:
			variant_filters['variants__price__lte'] = data['max_price']
		products = products.filter(**variant_filters)

		if data['sort'] == 'price_asc':
			products = products.order_by('starting_price', 'name', 'pk')
		elif data['sort'] == 'price_desc':
			products = products.order_by('-starting_price', 'name', 'pk')
		elif data['sort'] == 'name':
			products = products.order_by('name', 'pk')
		else:
			products = products.order_by('name', 'pk')

	page = Paginator(products.distinct().prefetch_related('images', 'variants'), 12).get_page(request.GET.get('page'))
	return render(request, 'store/product_list.html', {'form': form, 'page': page})


def product_detail(request, slug):
	product = get_object_or_404(
		Product.objects.prefetch_related('images', 'variants'),
		slug=slug,
		is_active=True,
		category__is_active=True,
	)
	form_data = request.POST if request.method == 'POST' else None
	form = AddToCartForm(form_data, product=product)
	starting_price = product.variants.filter(is_active=True, stock_quantity__gt=0).aggregate(
		price=Min('price'),
	)['price']
	if request.method == 'POST':
		if form.is_valid():
			with transaction.atomic():
				variant = ProductVariant.objects.select_for_update().get(
					pk=form.cleaned_data['variant'].pk,
					product=product,
					is_active=True,
				)
				cart = get_or_create_cart(request)
				item, created = CartItem.objects.get_or_create(
					cart=cart,
					variant=variant,
					defaults={'quantity': form.cleaned_data['quantity']},
				)
				new_quantity = item.quantity if created else item.quantity + form.cleaned_data['quantity']
				if new_quantity > variant.stock_quantity:
					form.add_error('quantity', 'تعداد درخواستی از موجودی فعلی بیشتر است.')
					if created:
						item.delete()
				else:
					if not created:
						item.quantity = new_quantity
						item.save(update_fields=['quantity'])
					cart.save(update_fields=['updated_at'])
					messages.success(request, 'محصول به سبد خرید اضافه شد.')
					return redirect('store:cart')
	return render(
		request,
		'store/product_detail.html',
		{'product': product, 'form': form, 'starting_price': starting_price},
	)


def cart_detail(request):
	cart = get_or_create_cart(request)
	items = list(cart.items.select_related('variant', 'variant__product', 'variant__product__category'))
	for item in items:
		item.available = (
			item.variant.is_active
			and item.variant.product.is_active
			and item.variant.product.category.is_active
			and item.quantity <= item.variant.stock_quantity
		)
	return render(request, 'store/cart_detail.html', {'cart': cart, 'items': items})


@require_POST
def update_cart_item(request, item_id):
	cart = get_or_create_cart(request)
	item = get_object_or_404(cart.items.select_related('variant'), pk=item_id)
	try:
		quantity = int(request.POST.get('quantity', ''))
	except (TypeError, ValueError):
		quantity = 0

	if quantity < 1:
		messages.error(request, 'تعداد باید دست‌کم یک باشد.')
	elif (
		quantity > item.variant.stock_quantity
		or not item.variant.is_active
		or not item.variant.product.is_active
		or not item.variant.product.category.is_active
	):
		messages.error(request, 'تعداد درخواستی از موجودی فعلی بیشتر است.')
	else:
		item.quantity = quantity
		item.save(update_fields=['quantity'])
		messages.success(request, 'تعداد محصول به‌روزرسانی شد.')
	return redirect('store:cart')


@require_POST
def remove_cart_item(request, item_id):
	cart = get_or_create_cart(request)
	item = get_object_or_404(cart.items, pk=item_id)
	item.delete()
	messages.success(request, 'محصول از سبد خرید حذف شد.')
	return redirect('store:cart')
