from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from .models import GemReason, GemRule, GemTransaction


class GemError(Exception):
	"""A business rule stopped the movement. The message is safe to show."""


class InsufficientGems(GemError):
	pass


def balance_of(user):
	"""The ledger total, which is the authoritative balance."""
	if user is None or not getattr(user, 'is_authenticated', False):
		return 0
	total = GemTransaction.objects.filter(user=user).aggregate(total=Sum('amount'))['total']
	return total or 0


def _locked_user(user):
	# `request.user` is a SimpleLazyObject, so the model comes from the auth
	# registry rather than from `type(user)`.
	return get_user_model().objects.select_for_update().get(pk=user.pk)


def _ref_parts(ref):
	"""Turn a model instance into `(ref_type, ref_id)` strings.

	Passing the object itself keeps callers from inventing a key by hand and
	getting it wrong; an explicit `str(pk)` is accepted for cases where only an
	id survives, such as a payment metadata blob.
	"""
	if ref is None:
		return '', ''
	if isinstance(ref, str):
		return '', ref
	if isinstance(ref, int):
		return '', str(ref)
	return ref._meta.model_name, str(ref.pk)


def _day_start():
	now = timezone.localtime()
	return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _earned_today(user, reason):
	total = GemTransaction.objects.filter(
		user=user,
		reason=reason,
		amount__gt=0,
		created_at__gte=_day_start(),
	).aggregate(total=Sum('amount'))['total']
	return total or 0


@transaction.atomic
def award(user, reason, ref=None, *, ref_type='', ref_id='', base_amount=None, note=''):
	"""Credit gems for one event, following the active `GemRule`.

	Returns the created `GemTransaction`, or `None` when there was nothing to
	award: no active rule, a zero value, the daily cap already reached, or this
	exact event was already paid. Callers should treat `None` as "nothing
	happened", not as an error.
	"""
	if user is None or not getattr(user, 'is_authenticated', False):
		return None

	rule = GemRule.objects.filter(reason=reason, is_active=True).first()
	if rule is None:
		return None

	if rule.is_percentage:
		if base_amount is None:
			raise GemError('برای قاعدهٔ درصدی، مبلغ پایه لازم است.')
		gems = int(Decimal(str(base_amount)) * rule.amount / Decimal('100'))
	else:
		gems = rule.amount

	if gems <= 0:
		return None

	locked = _locked_user(user)

	if rule.daily_limit:
		remaining = rule.daily_limit - _earned_today(locked, reason)
		if remaining <= 0:
			return None
		gems = min(gems, remaining)

	if not ref_type and not ref_id:
		ref_type, ref_id = _ref_parts(ref)

	entry, created = GemTransaction.objects.get_or_create(
		user=locked,
		reason=reason,
		ref_type=ref_type,
		ref_id=ref_id,
		defaults={'amount': gems, 'note': note},
	)
	if not created:
		return None

	_sync_balance(locked)
	return entry


@transaction.atomic
def spend(user, amount, ref=None, *, ref_type='', ref_id='', reason=GemReason.ORDER_DISCOUNT, note=''):
	"""Debit gems, refusing to go negative.

	The balance is re-read inside the row lock instead of trusting the cached
	column, so a stale cache can never let a user overspend.
	"""
	amount = int(amount)
	if amount <= 0:
		raise GemError('مقدار خرج باید بزرگ‌تر از صفر باشد.')

	locked = _locked_user(user)
	current = balance_of(locked)
	if current < amount:
		raise InsufficientGems('جم کافی نیست.')

	if not ref_type and not ref_id:
		ref_type, ref_id = _ref_parts(ref)

	entry = GemTransaction.objects.create(
		user=locked,
		amount=-amount,
		reason=reason,
		ref_type=ref_type,
		ref_id=ref_id,
		note=note,
	)
	_sync_balance(locked)
	return entry


def _sync_balance(user):
	"""Copy the ledger total onto the cached column. Caller holds the lock."""
	get_user_model().objects.filter(pk=user.pk).update(gem_balance=balance_of(user))


def recalculate(user):
	"""Repair the cached balance after a manual ledger edit."""
	with transaction.atomic():
		locked = _locked_user(user)
		_sync_balance(locked)
	return balance_of(user)
