from django.dispatch import receiver

from orders.models import Payment
from orders.signals import payment_succeeded

from .models import Course, Enrollment


@receiver(payment_succeeded, sender=Payment)
def enrol_after_course_payment(sender, payment, **kwargs):
	"""Turn a settled course payment into an enrollment.

	Runs inside the settlement transaction, so the enrollment and the payment
	commit together or not at all. `get_or_create` keeps it harmless if a
	course purchase is ever settled twice.
	"""
	course_id = (payment.metadata or {}).get('course_id')
	if not course_id:
		return

	course = Course.objects.filter(pk=course_id).first()
	if course is None:
		return

	Enrollment.objects.get_or_create(
		user=payment.user,
		course=course,
		defaults={'payment': payment},
	)
