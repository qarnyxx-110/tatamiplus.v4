from django import template

register = template.Library()


@register.filter
def duration_mmss(value):
	"""Seconds into m:ss; the template can then pipe it through persian_digits."""
	try:
		total = int(value or 0)
	except (TypeError, ValueError):
		return ''
	minutes, seconds = divmod(total, 60)
	return f'{minutes}:{seconds:02d}'
