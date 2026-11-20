from django import forms

from .formatting import format_price_fa
from .models import Category, Product, ProductVariant


class ProductFilterForm(forms.Form):
	query = forms.CharField(label='جست‌وجو', required=False, max_length=100)
	category = forms.ModelChoiceField(
		label='دسته‌بندی',
		queryset=Category.objects.none(),
		required=False,
		empty_label='همهٔ دسته‌ها',
	)
	size = forms.ChoiceField(label='سایز', required=False, choices=())
	color = forms.ChoiceField(label='رنگ', required=False, choices=())
	training_level = forms.ChoiceField(label='سطح', required=False, choices=())
	min_price = forms.DecimalField(label='حداقل قیمت', required=False, min_value=0, decimal_places=2)
	max_price = forms.DecimalField(label='حداکثر قیمت', required=False, min_value=0, decimal_places=2)
	sort = forms.ChoiceField(
		label='مرتب‌سازی',
		required=False,
		choices=(
			('', 'پیش‌فرض'),
			('price_asc', 'ارزان‌ترین'),
			('price_desc', 'گران‌ترین'),
			('name', 'نام محصول'),
		),
	)

	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		self.fields['category'].queryset = Category.objects.filter(is_active=True)
		available_variants = ProductVariant.objects.filter(
			is_active=True,
			stock_quantity__gt=0,
			product__is_active=True,
			product__category__is_active=True,
		)
		self.fields['size'].choices = self._choices(available_variants, 'size')
		self.fields['color'].choices = self._choices(available_variants, 'color')
		levels = Product.objects.filter(
			is_active=True,
			category__is_active=True,
		).exclude(training_level='').values_list('training_level', flat=True).distinct().order_by('training_level')
		self.fields['training_level'].choices = [('', 'همهٔ سطح‌ها'), *((level, level) for level in levels)]

	@staticmethod
	def _choices(queryset, field_name):
		values = queryset.exclude(**{field_name: ''}).values_list(field_name, flat=True).distinct().order_by(field_name)
		label = 'همهٔ سایزها' if field_name == 'size' else 'همهٔ رنگ‌ها'
		return [('', label), *((value, value) for value in values)]

	def clean(self):
		cleaned_data = super().clean()
		minimum = cleaned_data.get('min_price')
		maximum = cleaned_data.get('max_price')
		if minimum is not None and maximum is not None and minimum > maximum:
			self.add_error('max_price', 'حداکثر قیمت باید از حداقل قیمت کمتر نباشد.')
		return cleaned_data


class AddToCartForm(forms.Form):
	variant = forms.ModelChoiceField(
		label='سایز و رنگ',
		queryset=ProductVariant.objects.none(),
	)
	quantity = forms.IntegerField(label='تعداد', min_value=1, initial=1)

	def __init__(self, *args, product, **kwargs):
		super().__init__(*args, **kwargs)
		self.fields['variant'].queryset = ProductVariant.objects.filter(
			product=product,
			is_active=True,
		).order_by('size', 'color')
		self.fields['variant'].label_from_instance = self.variant_label

	@staticmethod
	def variant_label(variant):
		attributes = '، '.join(value for value in (variant.size, variant.color) if value)
		if not attributes:
			attributes = 'بدون ویژگی'
		return f'{attributes} — {format_price_fa(variant.price)} — موجودی: {format_price_fa(variant.stock_quantity)}'