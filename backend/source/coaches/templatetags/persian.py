from django import template

register = template.Library()


@register.filter
def persian_digits(value):
	return str(value).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))