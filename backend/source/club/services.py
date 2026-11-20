import uuid

from django.db import transaction
from django.utils.text import slugify

from orders.services import begin_payment

from .models import Enrollment


def build_unique_slug(model, source, instance=None):
	"""A readable slug from the title, with a numeric suffix on collision.

	Persian titles keep their own characters (`allow_unicode=True`); if the
	title is empty or slugifies to nothing, a random token is used instead.
	"""
	base = slugify(source or '', allow_unicode=True)[:180] or uuid.uuid4().hex[:8]
	slug = base
	suffix = 2
	queryset = model.objects.all()
	if instance is not None and instance.pk:
		queryset = queryset.exclude(pk=instance.pk)
	while queryset.filter(slug=slug).exists():
		slug = f'{base}-{suffix}'
		suffix += 1
	return slug


def user_can_watch(user, episode, enrolled=None):
	"""Whether this user may play this episode.

	Order of the rules matters: a free episode is public, then staff, then the
	course owner, then anyone holding an enrollment. Pass `enrolled` when
	checking a whole course list to avoid one query per episode.
	"""
	if episode.is_free:
		return True
	if not getattr(user, 'is_authenticated', False):
		return False
	if user.is_staff:
		return True
	if episode.course.coach.user_id == user.id:
		return True
	if enrolled is not None:
		return enrolled
	return Enrollment.objects.filter(user=user, course_id=episode.course_id).exists()


@transaction.atomic
def purchase_course(user, course, callback_url=''):
	"""Give the user access, paying first unless the course is free.

	Returns the gateway URL to redirect to, or None when access was granted
	immediately and the caller should return to the course page.
	"""
	if Enrollment.objects.filter(user=user, course=course).exists():
		return None

	if course.price <= 0:
		Enrollment.objects.get_or_create(user=user, course=course)
		return None

	_payment, redirect_url = begin_payment(
		user=user,
		amount=course.price,
		description=f'دورهٔ {course.title}',
		callback_url=callback_url,
		metadata={'course_id': course.pk},
	)
	return redirect_url
