import re

from django import forms

from coaches.storage import PrivateFileInput

from .models import CoachInvite, CoachPortfolio


class CoachPortfolioForm(forms.ModelForm):
	"""The coach's own record: application details and public page in one form.

	Used both when a coach submits for the first time (`/coaches/apply/`) and
	when an approved coach keeps the page current (`/coaches/portfolio/`).
	`status` and `is_published` are deliberately absent: the coach fills the
	content, admins decide the state, and only the team publishes.
	"""

	class Meta:
		model = CoachPortfolio
		fields = (
			'display_name',
			'headline',
			'biography',
			'avatar',
			'coaching_level',
			'specializations',
			'years_experience',
			'belt',
			'club',
			'certificate_details',
			'certificate_document',
		)
		widgets = {
			'headline': forms.TextInput(attrs={'placeholder': 'مثلاً مربی کاتا و کیهوکوشین'}),
			'biography': forms.Textarea(attrs={'rows': 5}),
			'specializations': forms.Textarea(attrs={'rows': 3}),
			'certificate_details': forms.Textarea(attrs={'rows': 3}),
			# The certificate is private; the default widget would call `.url()`.
			'certificate_document': PrivateFileInput,
		}

	def clean_display_name(self):
		name = (self.cleaned_data.get('display_name') or '').strip()
		if not name:
			raise forms.ValidationError('نام نمایشی را وارد کنید.')
		return name

	def clean_certificate_document(self):
		document = self.cleaned_data.get('certificate_document')
		if document and hasattr(document, 'size') and document.size > 10 * 1024 * 1024:
			raise forms.ValidationError('حجم فایل مدرک نباید بیشتر از ۱۰ مگابایت باشد.')
		return document


# Older imports (views, tests) used the application name; same form now.
CoachApplicationForm = CoachPortfolioForm


class CoachInviteForm(forms.ModelForm):
	"""Create a code. The code itself and the use counter are system-owned."""

	class Meta:
		model = CoachInvite
		fields = ('label', 'max_uses')
		widgets = {
			'label': forms.TextInput(attrs={'placeholder': 'مثلاً کلاس شنبه‌ها'}),
		}


class InviteCodeEntryForm(forms.Form):
	"""A student who was told a code by hand, rather than sent a link."""

	code = forms.CharField(
		label='کد دعوت',
		max_length=12,
		widget=forms.TextInput(attrs={
			'placeholder': 'مثلاً K7PM2XQ9',
			'autocomplete': 'off',
			'autocapitalize': 'characters',
		}),
	)

	def clean_code(self):
		# Codes are stored uppercase and looked up case-insensitively; accept
		# Persian/Arabic digits by folding them first.
		code = self.cleaned_data['code'].strip().upper()
		code = code.translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
		if not re.fullmatch(r'[A-Z0-9]{4,12}', code):
			raise forms.ValidationError('کد دعوت باید ۸ نویسهٔ انگلیسی یا رقم باشد.')
		return code
