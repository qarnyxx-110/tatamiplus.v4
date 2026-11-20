import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from .models import OTPCode, User


class OTPError(Exception):
	pass


class OTPRateLimitExceeded(OTPError):
	pass


class OTPInvalid(OTPError):
	pass


def _rate_key(scope, value, window):
	digest = hashlib.sha256(value.encode()).hexdigest()
	return f'tatami:otp:{window}:{scope}:{digest}'


def _claim_send_rate(phone, ip_address):
	identities = [('phone', phone)]
	if ip_address:
		identities.append(('ip', ip_address))

	for scope, value in identities:
		hour_key = _rate_key(scope, value, 'hour')
		cooldown_key = _rate_key(scope, value, 'cooldown')
		if cache.get(hour_key, 0) >= 5 or cache.get(cooldown_key):
			raise OTPRateLimitExceeded

	for scope, value in identities:
		cooldown_key = _rate_key(scope, value, 'cooldown')
		if not cache.add(cooldown_key, True, timeout=60):
			raise OTPRateLimitExceeded

	for scope, value in identities:
		hour_key = _rate_key(scope, value, 'hour')
		cache.add(hour_key, 0, timeout=3600)
		cache.incr(hour_key)


@transaction.atomic
def send_otp(phone, ip_address=None):
	_claim_send_rate(phone, ip_address)
	backend_path = settings.SMS_BACKEND
	if not backend_path:
		raise ImproperlyConfigured('Configure SMS_BACKEND before enabling OTP outside development.')

	code = f'{secrets.randbelow(100_000):05d}'
	OTPCode.objects.filter(phone=phone, is_used=False).update(is_used=True)
	otp = OTPCode.objects.create(
		phone=phone,
		code_hash=OTPCode.digest(phone, code),
		ip_address=ip_address,
		expires_at=timezone.now() + timedelta(seconds=120),
	)
	try:
		backend = import_string(backend_path)()
		backend.send_otp(phone, code)
	except Exception:
		otp.delete()
		raise
	return otp


def consume_otp(phone, code):
	"""Check and burn a code without creating a user.

	Used by password reset, where an unknown phone must never become an
	account. `verify_otp` keeps its signup behaviour on top of this.
	"""
	valid = _check_otp(phone, code)
	if not valid:
		raise OTPInvalid
	return True


def verify_otp(phone, code, role):
	consume_otp(phone, code)
	with transaction.atomic():
		user, created = User.objects.get_or_create(
			phone=phone,
			defaults={
				'username': phone,
				'password': make_password(None),
				'role': role,
				'is_profile_complete': False,
			},
		)
	return user, created


def _check_otp(phone, code):
	"""Consume a valid code. Returns True only when it matched."""
	with transaction.atomic():
		otp = OTPCode.objects.select_for_update().filter(
			phone=phone,
			is_used=False,
		).order_by('-created_at').first()
		if otp is None:
			return False
		if otp.expires_at <= timezone.now() or otp.attempts >= 5:
			otp.is_used = True
			otp.save(update_fields=['is_used'])
			return False

		otp.attempts += 1
		if not otp.verify(code):
			if otp.attempts >= 5:
				otp.is_used = True
			otp.save(update_fields=['attempts', 'is_used'])
			return False

		otp.is_used = True
		otp.save(update_fields=['attempts', 'is_used'])
		return True