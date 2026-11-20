from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponseNotAllowed
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils.http import urlencode
from django.utils.http import url_has_allowed_host_and_scheme

from .auth_services import OTPInvalid, OTPRateLimitExceeded, consume_otp, send_otp, verify_otp
from .forms import (
	NewPasswordForm,
	OTPVerifyForm,
	PasswordLoginForm,
	PhoneLoginForm,
	PhoneOnlyForm,
	ProfileCompletionForm,
	ResetPasswordForm,
)
from .models import User


def register(request):
	query = {'role': request.GET.get('role', User.Role.STUDENT)}
	next_url = _safe_next(request, request.GET.get('next'))
	if next_url:
		query['next'] = next_url
	return redirect(f"{reverse('phone_auth:sms_login')}?{urlencode(query)}")


def legacy_login_redirect(request):
	query = {}
	next_url = _safe_next(request, request.GET.get('next'))
	if next_url:
		query['next'] = next_url
	return redirect(f"{reverse('phone_auth:login')}?{urlencode(query)}" if query else 'phone_auth:login')


def _safe_next(request, value):
	if value and url_has_allowed_host_and_scheme(value, {request.get_host()}, require_https=request.is_secure()):
		return value
	return ''


def password_login(request):
	"""Returning members sign in with phone + password; no SMS involved."""
	if request.user.is_authenticated:
		return redirect('account')

	if request.method == 'POST':
		form = PasswordLoginForm(request.POST)
		if form.is_valid():
			phone = form.cleaned_data['phone']
			user = authenticate(
				request,
				username=phone,
				password=form.cleaned_data['password'],
			)
			if user is None:
				existing = User.objects.filter(phone=phone).first()
				if existing is not None and not existing.has_usable_password():
					form.add_error(
						None,
						'این حساب هنوز رمز عبور ندارد. با کد پیامکی وارد شوید و در ادامه رمز بسازید.',
					)
				else:
					form.add_error(None, 'شمارهٔ همراه یا رمز عبور درست نیست.')
			else:
				login(request, user, backend='django.contrib.auth.backends.ModelBackend')
				next_url = _safe_next(request, form.cleaned_data.get('next_url'))
				return redirect(next_url or 'account')
	else:
		form = PasswordLoginForm(initial={
			'next_url': _safe_next(request, request.GET.get('next')),
		})

	return render(request, 'accounts/login.html', {'form': form, 'mode': 'password'})


def phone_login(request):
	"""SMS path: first-time signup, or an account with no password yet."""
	if request.user.is_authenticated:
		return redirect('account')

	if request.method == 'POST':
		form = PhoneLoginForm(request.POST)
		if form.is_valid():
			phone = form.cleaned_data['phone']
			role = form.cleaned_data['role']
			try:
				send_otp(phone, request.META.get('REMOTE_ADDR'))
			except OTPRateLimitExceeded:
				form.add_error('phone', 'برای ارسال دوبارهٔ کد کمی صبر کنید.')
			except ImproperlyConfigured:
				form.add_error(None, 'ارسال پیامک در این محیط پیکربندی نشده است.')
			else:
				request.session['otp_phone'] = phone
				request.session['otp_role'] = role
				request.session['otp_next'] = _safe_next(request, form.cleaned_data.get('next_url'))
				return redirect('phone_auth:verify_otp')
	else:
		form = PhoneLoginForm(initial={
			'role': User.Role.COACH if request.GET.get('role') == User.Role.COACH else User.Role.STUDENT,
			'next_url': _safe_next(request, request.GET.get('next')),
		})

	return render(request, 'accounts/login.html', {'form': form, 'mode': 'sms'})


def send_otp_view(request):
	if request.method != 'POST':
		return HttpResponseNotAllowed(['POST'])
	phone = request.session.get('otp_phone')
	if not phone:
		return redirect('phone_auth:login')
	try:
		send_otp(phone, request.META.get('REMOTE_ADDR'))
	except OTPRateLimitExceeded:
		return render(request, 'accounts/otp_verify.html', {
			'form': OTPVerifyForm(),
			'phone_hint': f'****{phone[-4:]}',
			'error': 'برای ارسال دوبارهٔ کد کمی صبر کنید.',
		})
	except ImproperlyConfigured:
		return render(request, 'accounts/otp_verify.html', {
			'form': OTPVerifyForm(),
			'phone_hint': f'****{phone[-4:]}',
			'error': 'ارسال پیامک در این محیط پیکربندی نشده است.',
		})
	return redirect('phone_auth:verify_otp')


def verify_otp_view(request):
	phone = request.session.get('otp_phone')
	role = request.session.get('otp_role')
	if not phone or role not in User.Role.values:
		return redirect('phone_auth:login')

	if request.method == 'POST':
		form = OTPVerifyForm(request.POST)
		if form.is_valid():
			try:
				user, _ = verify_otp(phone, form.cleaned_data['code'], role)
			except OTPInvalid:
				form.add_error('code', 'کد نامعتبر یا منقضی شده است. دوباره درخواست کد کنید.')
			else:
				login(request, user, backend='django.contrib.auth.backends.ModelBackend')
				next_url = request.session.get('otp_next', '')
				request.session.pop('otp_phone', None)
				request.session.pop('otp_role', None)
				if not user.is_profile_complete:
					return redirect('phone_auth:complete_profile')
				if not user.has_usable_password():
					# Accounts created before passwords were required set one now.
					return redirect('phone_auth:set_password')
				request.session.pop('otp_next', None)
				return redirect(next_url or 'account')
	else:
		form = OTPVerifyForm()

	return render(request, 'accounts/otp_verify.html', {'form': form, 'phone_hint': f'****{phone[-4:]}'})


@login_required
def complete_profile(request):
	if request.user.is_profile_complete:
		return redirect('account')
	if request.method == 'POST':
		form = ProfileCompletionForm(request.POST)
		if form.is_valid():
			# Read the destination first: setting a new password below changes
			# the session's auth hash, so re-login flushes the session.
			next_url = request.session.pop('otp_next', '')
			form.save(request.user)
			# The password just changed, so the hash stored when the OTP was
			# verified no longer matches; log in again against the new one or
			# the next request would silently log the user out.
			login(request, request.user, backend='django.contrib.auth.backends.ModelBackend')
			return redirect(next_url or 'account')
	else:
		form = ProfileCompletionForm(initial={'role': request.user.role})
	return render(request, 'accounts/complete_profile.html', {'form': form})


@login_required
def set_password(request):
	"""One-time password creation for accounts that predate password login."""
	if request.user.has_usable_password():
		return redirect('account')

	form = NewPasswordForm(request.POST or None)
	if request.method == 'POST' and form.is_valid():
		# Read the destination first: re-login below flushes the session,
		# because the password (and with it the session auth hash) just changed.
		next_url = request.session.pop('otp_next', '')
		form.save(request.user)
		login(request, request.user, backend='django.contrib.auth.backends.ModelBackend')
		messages.success(request, 'رمز عبور شما ثبت شد. از این پس با رمز وارد می‌شوید.')
		return redirect(next_url or 'account')

	return render(request, 'accounts/set_password.html', {'form': form})


def password_reset(request):
	"""Forgot password: SMS is one of the two allowed uses for a code."""
	if request.method == 'POST':
		form = PhoneOnlyForm(request.POST)
		if form.is_valid():
			phone = form.cleaned_data['phone']
			try:
				send_otp(phone, request.META.get('REMOTE_ADDR'))
			except OTPRateLimitExceeded:
				form.add_error('phone', 'برای ارسال دوبارهٔ کد کمی صبر کنید.')
			except ImproperlyConfigured:
				form.add_error(None, 'ارسال پیامک در این محیط پیکربندی نشده است.')
			else:
				request.session['reset_phone'] = phone
				return redirect('phone_auth:password_reset_confirm')
	else:
		form = PhoneOnlyForm()

	return render(request, 'accounts/password_reset.html', {'form': form})


def password_reset_confirm(request):
	phone = request.session.get('reset_phone')
	if not phone:
		return redirect('phone_auth:password_reset')

	if request.method == 'POST':
		form = ResetPasswordForm(request.POST)
		if form.is_valid():
			try:
				consume_otp(phone, form.cleaned_data['code'])
			except OTPInvalid:
				form.add_error('code', 'کد نامعتبر یا منقضی شده است. دوباره درخواست کد کنید.')
			else:
				user = User.objects.filter(phone=phone).first()
				if user is None:
					form.add_error(None, 'حسابی با این شماره پیدا نشد.')
				else:
					form.save(user)
					request.session.pop('reset_phone', None)
					login(request, user, backend='django.contrib.auth.backends.ModelBackend')
					messages.success(request, 'رمز عبور تازه ثبت شد.')
					return redirect('account')
	else:
		form = ResetPasswordForm()

	return render(request, 'accounts/password_reset_confirm.html', {
		'form': form,
		'phone_hint': f'****{phone[-4:]}',
	})


def account(request):
	"""The signed-in landing page, including the coach portfolio's state.

	`accounts` must not import `coaches`, so the reverse OneToOne is read with
	`getattr`; a missing portfolio is simply "has not applied yet".
	"""
	portfolio = None
	if request.user.is_authenticated and request.user.role == User.Role.COACH:
		portfolio = getattr(request.user, 'portfolio', None)

	return render(request, 'pages/account.html', {
		'coach_portfolio': portfolio,
	})
