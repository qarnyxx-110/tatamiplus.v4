from django.db.models.signals import post_save
from django.dispatch import Signal, receiver

from .models import SignupLead, User

# Sent once, right after a user finishes the profile form. Kept as a signal so
# other apps (gems) can react without `accounts` depending on them.
profile_completed = Signal()


@receiver(post_save, sender=User)
def create_coach_signup_lead(sender, instance, created, **kwargs):
	if created and instance.role == User.Role.COACH:
		SignupLead.objects.get_or_create(user=instance)