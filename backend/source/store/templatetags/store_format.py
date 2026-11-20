from django import template

from store.formatting import format_price_fa

register = template.Library()


@register.filter
def price_fa(value):
	if value is None:
		return ''
	return format_price_fa(value)