from django.contrib import messages
from django.core.exceptions import PermissionDenied
from django.shortcuts import redirect

from accounts.models import User

from .invites import ensure_personal_invite
from .models import CoachPortfolio


def coach_portfolio_or_redirect(request):
	"""The signed-in coach's approved portfolio, or a redirect response.

	Shared by the course panel and the student panel so both refuse the same
	users for the same reasons: not a coach, no portfolio yet, or not approved.
	"""
	if request.user.role != User.Role.COACH:
		raise PermissionDenied

	portfolio = getattr(request.user, 'portfolio', None)
	if portfolio is None:
		return None, redirect('coaches:apply')
	if portfolio.status not in (CoachPortfolio.Status.APPROVED, CoachPortfolio.Status.PUBLISHED):
		messages.info(request, 'پنل مربی پس از تأیید پورتفولیو فعال می‌شود.')
		return None, redirect('coaches:application_status')

	# Also covers coaches approved before personal codes existed.
	ensure_personal_invite(portfolio)
	return portfolio, None


# Kept as an alias: older templates and imports used the old name.
coach_profile_or_redirect = coach_portfolio_or_redirect
