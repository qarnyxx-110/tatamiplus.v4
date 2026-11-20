import re

from django import forms
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .models import User
from .phone import normalize_iranian_phone
from .signals import profile_completed


def _clean_password(value):
    try:
        validate_password(value)
    except ValidationError as exc:
        raise forms.ValidationError(exc.messages) from exc
    return value


class PhoneLoginForm(forms.Form):
    phone = forms.CharField(label='شمارهٔ همراه', max_length=20)
    role = forms.ChoiceField(
        label='نقش کاربری',
        choices=User.Role.choices,
        initial=User.Role.STUDENT,
    )
    next_url = forms.CharField(required=False, widget=forms.HiddenInput)

    def clean_phone(self):
        try:
            return normalize_iranian_phone(self.cleaned_data['phone'])
        except ValueError as exc:
            raise forms.ValidationError(str(exc)) from exc

    def clean_role(self):
        role = self.cleaned_data['role']
        if role not in User.Role.values:
            raise forms.ValidationError('نقش انتخاب‌شده معتبر نیست.')
        return role


class PhoneOnlyForm(forms.Form):
    """Password reset: a phone number, with no role and no account creation."""

    phone = forms.CharField(label='شمارهٔ همراه', max_length=20)

    def clean_phone(self):
        try:
            return normalize_iranian_phone(self.cleaned_data['phone'])
        except ValueError as exc:
            raise forms.ValidationError(str(exc)) from exc


class PasswordLoginForm(forms.Form):
    phone = forms.CharField(label='شمارهٔ همراه', max_length=20)
    password = forms.CharField(
        label='رمز عبور',
        widget=forms.PasswordInput(attrs={'autocomplete': 'current-password'}),
    )
    next_url = forms.CharField(required=False, widget=forms.HiddenInput)

    def clean_phone(self):
        try:
            return normalize_iranian_phone(self.cleaned_data['phone'])
        except ValueError as exc:
            raise forms.ValidationError(str(exc)) from exc


class OTPVerifyForm(forms.Form):
    code = forms.CharField(label='کد یک‌بارمصرف', max_length=8)

    def clean_code(self):
        code = self.cleaned_data['code'].translate(str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789'))
        if not re.fullmatch(r'\d{5}', code):
            raise forms.ValidationError('کد باید پنج رقم باشد.')
        return code


class NewPasswordForm(forms.Form):
    """Password only, for a signed-in account that has no usable password."""

    password = forms.CharField(
        label='رمز عبور',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
    )
    password_confirm = forms.CharField(
        label='تکرار رمز عبور',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
    )

    def clean_password(self):
        return _clean_password(self.cleaned_data['password'])

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm = cleaned_data.get('password_confirm')
        if password and confirm and password != confirm:
            self.add_error('password_confirm', 'رمز عبور و تکرار آن یکسان نیستند.')
        return cleaned_data

    def save(self, user):
        user.set_password(self.cleaned_data['password'])
        user.save(update_fields=['password'])
        return user


class ResetPasswordForm(OTPVerifyForm):
    """One step: the SMS code and the new password together."""

    password = forms.CharField(
        label='رمز عبور تازه',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
    )
    password_confirm = forms.CharField(
        label='تکرار رمز عبور تازه',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
    )

    def clean_password(self):
        return _clean_password(self.cleaned_data['password'])

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm = cleaned_data.get('password_confirm')
        if password and confirm and password != confirm:
            self.add_error('password_confirm', 'رمز عبور و تکرار آن یکسان نیستند.')
        return cleaned_data

    def save(self, user):
        user.set_password(self.cleaned_data['password'])
        user.save(update_fields=['password'])
        return user


class ProfileCompletionForm(forms.Form):
    name = forms.CharField(label='نام', max_length=150)
    city = forms.CharField(label='شهر', max_length=100)
    role = forms.ChoiceField(label='نقش کاربری', choices=User.Role.choices)
    password = forms.CharField(
        label='رمز عبور',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
        help_text='بعد از این، با شمارهٔ همراه و همین رمز وارد می‌شوید.',
    )
    password_confirm = forms.CharField(
        label='تکرار رمز عبور',
        widget=forms.PasswordInput(attrs={'autocomplete': 'new-password'}),
    )

    def clean_password(self):
        return _clean_password(self.cleaned_data['password'])

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm = cleaned_data.get('password_confirm')
        if password and confirm and password != confirm:
            self.add_error('password_confirm', 'رمز عبور و تکرار آن یکسان نیستند.')
        return cleaned_data

    def save(self, user):
        user.first_name = self.cleaned_data['name'].strip()
        user.city = self.cleaned_data['city'].strip()
        user.role = self.cleaned_data['role']
        user.is_profile_complete = True
        user.set_password(self.cleaned_data['password'])
        user.save(update_fields=['first_name', 'city', 'role', 'is_profile_complete', 'password'])
        profile_completed.send(sender=User, user=user)
        return user
