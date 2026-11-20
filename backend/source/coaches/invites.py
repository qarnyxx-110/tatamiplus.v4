import secrets

from django.db import transaction
from django.db.models import F

from .models import CoachInvite, CoachStudent
from .signals import student_attached

# No I, O, 0, or 1: codes are read off a screen and typed by hand.
CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
CODE_LENGTH = 8
PERSONAL_INVITE_LABEL = 'کد شخصی'


class InviteError(Exception):
	"""The code cannot be redeemed. The message is safe to show a student."""


def generate_code():
	"""A short, unambiguous code that no other invite already uses."""
	for _ in range(20):
		code = ''.join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))
		if not CoachInvite.objects.filter(code=code).exists():
			return code
	raise InviteError('ساخت کد یکتا ممکن نشد. دوباره تلاش کنید.')


def ensure_personal_invite(profile):
	"""Give every coach one permanent code, so sharing never needs setup.

	Campaign codes stay optional; this one has no use limit and is created on
	approval (or lazily the first time a legacy coach opens a panel).
	"""
	invite = CoachInvite.objects.filter(coach=profile, label=PERSONAL_INVITE_LABEL).first()
	if invite is not None:
		return invite
	return CoachInvite.objects.create(
		coach=profile,
		code=generate_code(),
		label=PERSONAL_INVITE_LABEL,
		max_uses=0,
	)


@transaction.atomic
def redeem(code, user):
	"""Attach `user` to the coach behind `code`.

	Returns `(link, created)`. Redeeming the same code twice is not an error:
	the second call returns the existing link and does not consume a use.
	The invite row is locked so two students cannot both take the last slot.
	"""
	code = (code or '').strip()
	invite = (
		CoachInvite.objects.select_for_update()
		.select_related('coach', 'coach__user')
		.filter(code__iexact=code)
		.first()
	)
	if invite is None:
		raise InviteError('این کد دعوت پیدا نشد. کد را دوباره بررسی کنید.')

	if invite.coach.user_id == user.id:
		raise InviteError('شما مربی این پروفایل هستید و نمی‌توانید هنرجوی خودتان شوید.')
	if not invite.is_active:
		raise InviteError('این کد دعوت غیرفعال شده است. کد تازه‌ای از مربی بگیرید.')
	if invite.is_expired:
		raise InviteError('این کد دعوت منقضی شده است. کد تازه‌ای از مربی بگیرید.')

	existing = CoachStudent.objects.filter(coach=invite.coach, student=user).first()
	if existing is not None:
		return existing, False

	if invite.is_exhausted:
		raise InviteError('ظرفیت این کد دعوت پر شده است. کد تازه‌ای از مربی بگیرید.')

	link = CoachStudent.objects.create(coach=invite.coach, student=user, invite=invite)
	CoachInvite.objects.filter(pk=invite.pk).update(uses=F('uses') + 1)
	# Both sides may earn gems, with different amounts per rule. The ledger is
	# idempotent on this link, so a replayed join cannot pay twice.
	student_attached.send(
		sender=CoachStudent,
		link=link,
		student=user,
		coach=invite.coach,
		invite=invite,
	)
	return link, True
