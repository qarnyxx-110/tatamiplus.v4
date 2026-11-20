from django.db.models.signals import post_save
from django.dispatch import Signal, receiver

from .models import CoachPortfolio

# Sent once per newly-created CoachStudent row. `gems` listens to this so the
# coaches app never has to import the ledger; both the student and the coach
# are paid from rules the team edits in Django Admin.
student_attached = Signal()


@receiver(post_save, sender=CoachPortfolio)
def ensure_invite_when_approved(sender, instance, **kwargs):
	"""Every approved coach gets one permanent invite code.

	Publication stays a team decision; this only removes the dead end where an
	approved coach had no code to share, so the student panel always works.
	CRM-created portfolios arrive here too, because admin registration saves an
	already-approved row.
	"""
	if instance.status not in (CoachPortfolio.Status.APPROVED, CoachPortfolio.Status.PUBLISHED):
		return

	# Imported here, not at module level: invites.py imports this module for
	# the signal, so a top-level import would be circular.
	from .invites import ensure_personal_invite

	ensure_personal_invite(instance)
