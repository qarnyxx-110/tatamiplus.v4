from django import forms

from accounts.phone import normalize_iranian_phone

from .models import Address


class AddressForm(forms.ModelForm):
	# Declared explicitly with room for spaces and a +98 prefix: the model field
	# is 11 characters, but the user may type a longer form that we normalize.
	receiver_phone = forms.CharField(
		label='همراه گیرنده',
		max_length=20,
		required=False,
	)

	class Meta:
		model = Address
		fields = (
			'receiver_name',
			'receiver_phone',
			'province',
			'city',
			'full_address',
			'postal_code',
			'is_default',
		)
		widgets = {
			'full_address': forms.Textarea(attrs={'rows': 3}),
		}

	def clean_receiver_phone(self):
		value = (self.cleaned_data.get('receiver_phone') or '').strip()
		if not value:
			return ''
		try:
			return normalize_iranian_phone(value)
		except ValueError as exc:
			raise forms.ValidationError('شمارهٔ همراه گیرنده معتبر نیست.') from exc
