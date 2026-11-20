import re


_DIGIT_TRANSLATION = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')


def normalize_iranian_phone(value):
	phone = ''.join(str(value).translate(_DIGIT_TRANSLATION).split())
	phone = re.sub(r'[()\-]', '', phone)
	if phone.startswith('+98'):
		phone = '0' + phone[3:]
	elif phone.startswith('0098'):
		phone = '0' + phone[4:]
	elif phone.startswith('98') and len(phone) == 12:
		phone = '0' + phone[2:]
	if not re.fullmatch(r'09\d{9}', phone):
		raise ValueError('شمارهٔ همراه باید با قالب 09xxxxxxxxx وارد شود.')
	return phone