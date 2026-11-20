from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

from coaches.access import coach_profile_or_redirect
from coaches.models import CoachPortfolio

from .forms import CourseFilterForm, CourseForm, EpisodeForm
from .models import Course, Enrollment, Episode, EpisodeCompletion
from .services import purchase_course, user_can_watch
from .signals import episode_completed

# Approved-and-published is what counts as a live public coach page.
PUBLIC_COACH_STATUSES = (
	CoachPortfolio.Status.APPROVED,
	CoachPortfolio.Status.PUBLISHED,
)


def course_list(request):
	form = CourseFilterForm(request.GET or None)
	courses = Course.objects.filter(
		status=Course.Status.PUBLISHED,
	).select_related('coach')

	if form.is_valid():
		data = form.cleaned_data
		if data.get('coach'):
			courses = courses.filter(coach=data['coach'])
		if data.get('level'):
			courses = courses.filter(level=data['level'])
		if data.get('q'):
			courses = courses.filter(
				Q(title__icontains=data['q']) | Q(description__icontains=data['q']),
			)

	page = Paginator(courses.order_by('-created_at'), 12).get_page(request.GET.get('page'))
	return render(request, 'club/course_list.html', {'form': form, 'page': page})


def coach_detail(request, profile_id):
	profile = get_object_or_404(
		CoachPortfolio.objects.select_related('user'),
		pk=profile_id,
		status__in=PUBLIC_COACH_STATUSES,
		is_published=True,
	)
	courses = profile.courses.filter(status=Course.Status.PUBLISHED)
	return render(request, 'club/coach_detail.html', {'profile': profile, 'courses': courses})


def course_detail(request, slug):
	course = get_object_or_404(
		Course.objects.select_related('coach', 'coach__user').prefetch_related('episodes'),
		slug=slug,
		status=Course.Status.PUBLISHED,
	)

	user = request.user
	owner = user.is_authenticated and course.coach.user_id == user.id
	enrolled = user.is_authenticated and Enrollment.objects.filter(user=user, course=course).exists()
	has_full_access = owner or (user.is_authenticated and user.is_staff)

	episodes = list(course.episodes.all())
	completed_ids = set()
	if user.is_authenticated:
		completed_ids = set(
			EpisodeCompletion.objects.filter(user=user, episode__course=course).values_list('episode_id', flat=True)
		)
	for episode in episodes:
		episode.can_watch = episode.is_free or enrolled or has_full_access
		episode.completed = episode.pk in completed_ids

	return render(request, 'club/course_detail.html', {
		'course': course,
		'episodes': episodes,
		'enrolled': enrolled,
		'owner': owner,
		'has_full_access': has_full_access,
	})


@login_required
@require_POST
def buy_course(request, slug):
	course = get_object_or_404(Course, slug=slug, status=Course.Status.PUBLISHED)

	if course.coach.user_id == request.user.id:
		messages.info(request, 'شما مربی این دوره هستید و دسترسی کامل دارید.')
		return redirect(course)
	if Enrollment.objects.filter(user=request.user, course=course).exists():
		messages.info(request, 'شما قبلاً این دوره را تهیه کرده‌اید.')
		return redirect(course)

	redirect_url = purchase_course(
		request.user,
		course,
		callback_url=request.build_absolute_uri(reverse('orders:callback')),
	)
	if redirect_url:
		return redirect(redirect_url)

	messages.success(request, 'دسترسی به دوره فعال شد.')
	return redirect(course)


def episode_play(request, pk):
	episode = get_object_or_404(
		Episode.objects.select_related('course', 'course__coach', 'course__coach__user'),
		pk=pk,
		course__status=Course.Status.PUBLISHED,
	)
	if not user_can_watch(request.user, episode):
		messages.info(request, 'برای تماشای این قسمت، ابتدا دوره را تهیه کنید.')
		return redirect(episode.course)
	completed = request.user.is_authenticated and EpisodeCompletion.objects.filter(
		user=request.user,
		episode=episode,
	).exists()
	return render(request, 'club/episode_play.html', {'episode': episode, 'completed': completed})


@login_required
@require_POST
def episode_complete(request, pk):
	"""Mark an episode finished. Idempotent: the second click changes nothing."""
	episode = get_object_or_404(
		Episode.objects.select_related('course', 'course__coach', 'course__coach__user'),
		pk=pk,
		course__status=Course.Status.PUBLISHED,
	)
	if not user_can_watch(request.user, episode):
		raise PermissionDenied

	completion, created = EpisodeCompletion.objects.get_or_create(
		user=request.user,
		episode=episode,
	)
	if created:
		episode_completed.send(sender=EpisodeCompletion, user=request.user, episode=episode)
		messages.success(request, 'این قسمت برای شما ثبت شد.')
	else:
		messages.info(request, 'این قسمت قبلاً ثبت شده بود.')

	return redirect('club:episode_play', pk=episode.pk)


def episode_stream(request, pk):
	"""Serve the video file itself, after the same access check.

	Paid videos never get a public URL: their storage raises on `.url()`, and
	this view is the only way to read the bytes. Behind Nginx, set
	USE_X_ACCEL_REDIRECT so Django hands off the transfer instead of streaming
	a large file through Python.
	"""
	episode = get_object_or_404(
		Episode.objects.select_related('course', 'course__coach', 'course__coach__user'),
		pk=pk,
		course__status=Course.Status.PUBLISHED,
	)
	if not user_can_watch(request.user, episode):
		raise PermissionDenied
	if not episode.video_file:
		raise Http404

	if settings.USE_X_ACCEL_REDIRECT:
		response = HttpResponse(content_type='video/mp4')
		response['X-Accel-Redirect'] = f'/protected/{episode.video_file.name}'
		return response

	return FileResponse(episode.video_file.open('rb'), content_type='video/mp4')


@login_required
def course_dashboard(request):
	profile, response = coach_profile_or_redirect(request)
	if response:
		return response
	return render(request, 'club/coach/course_list.html', {'courses': profile.courses.all()})


@login_required
def course_create(request):
	profile, response = coach_profile_or_redirect(request)
	if response:
		return response

	form = CourseForm(request.POST or None, request.FILES or None)
	if request.method == 'POST' and form.is_valid():
		course = form.save(commit=False)
		course.coach = profile
		course.status = Course.Status.PENDING_REVIEW
		course.save()
		messages.success(request, 'دوره ثبت شد و در انتظار بررسی است.')
		return redirect('coach_panel:course_edit', course.pk)

	return render(request, 'club/coach/course_form.html', {'form': form, 'course': None})


@login_required
def course_edit(request, pk):
	profile, response = coach_profile_or_redirect(request)
	if response:
		return response

	course = get_object_or_404(profile.courses, pk=pk)
	form = CourseForm(request.POST or None, request.FILES or None, instance=course)
	if request.method == 'POST' and form.is_valid():
		form.save()
		messages.success(request, 'دوره به‌روزرسانی شد.')
		return redirect('coach_panel:course_edit', course.pk)

	return render(request, 'club/coach/course_form.html', {'form': form, 'course': course})


@login_required
def episode_create(request, course_pk):
	profile, response = coach_profile_or_redirect(request)
	if response:
		return response

	course = get_object_or_404(profile.courses, pk=course_pk)
	form = EpisodeForm(request.POST or None, request.FILES or None)
	if request.method == 'POST' and form.is_valid():
		episode = form.save(commit=False)
		episode.course = course
		episode.save()
		messages.success(request, 'قسمت افزوده شد.')
		return redirect('coach_panel:course_edit', course.pk)

	return render(request, 'club/coach/episode_form.html', {'form': form, 'course': course, 'episode': None})


@login_required
def episode_edit(request, pk):
	profile, response = coach_profile_or_redirect(request)
	if response:
		return response

	episode = get_object_or_404(Episode.objects.select_related('course'), pk=pk, course__coach=profile)
	form = EpisodeForm(request.POST or None, request.FILES or None, instance=episode)
	if request.method == 'POST' and form.is_valid():
		form.save()
		messages.success(request, 'قسمت به‌روزرسانی شد.')
		return redirect('coach_panel:course_edit', episode.course_id)

	return render(request, 'club/coach/episode_form.html', {
		'form': form,
		'course': episode.course,
		'episode': episode,
	})
