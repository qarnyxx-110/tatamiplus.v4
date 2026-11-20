from decimal import Decimal


def format_price_fa(value):
	formatted = f'{Decimal(value):,.2f}'.rstrip('0').rstrip('.')
	return formatted.translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹')).replace(',', '٬')