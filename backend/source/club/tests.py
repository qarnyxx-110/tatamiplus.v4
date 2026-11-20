from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from coaches.models import CoachPortfolio
from orders.models import Payment
from store.models import Cart, CartItem, Category, Product, ProductVariant

from .models import Course, Enrollment, Episode


def video(name='lesson.mp4'):
	return SimpleUploadedFile(name, b'fake-mp4-bytes', content_type='video/mp4')


@override_settings(PAYMENT_ALLOW_MOCK=True)
class ClubTestCase(TestCase):
	def setUp(self):
		user_model = get_user_model()
		self.student = user_model.objects.create_user(
			username='student',
			password='Safe-Training-Password-914!',
		)
		self.coach_user = user_model.objects.create_user(
			username='coach',
			password='Safe-Training-Password-914!',
			role=user_model.Role.COACH,
		)
		self.profile = CoachPortfolio(
			user=self.coach_user,
			display_name='مربی آزمایشی',
			biography='معرفی آزمایشی',
			coaching_level='Advanced',
			specializations='Taekwondo',
			years_experience=8,
			club='باشگاه آزمایشی',
			certificate_details='مدرک مربیگری',
			certificate_document=SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test'),
			status=CoachPortfolio.Status.APPROVED,
			is_published=True,
		)
		self.profile.full_clean()
		self.profile.save()
		self.addCleanup(self.profile.certificate_document.delete, save=False)
		self.course = Course.objects.create(
			coach=self.profile,
			title='دورهٔ آزمایشی',
			slug='sample-course',
			description='توضیحات دوره',
			level=Course.Level.BEGINNER,
			price=Decimal('500000'),
			status=Course.Status.PUBLISHED,
		)
		self.free_episode = self.add_episode(order=1)
		self.paid_episode = self.add_episode(order=2)

	def add_episode(self, order, title=None, is_free=False, name='lesson.mp4'):
		episode = Episode.objects.create(
			course=self.course,
			title=title or f'قسمت {order}',
			order=order,
			is_free=is_free,
			duration=125,
			video_file=video(name),
		)
		self.addCleanup(episode.video_file.delete, save=False)
		return episode

	def buy(self):
		self.client.force_login(self.student)
		return self.client.post(reverse('club:buy_course', args=[self.course.slug]))

	def settle(self, status='OK'):
		payment = Payment.objects.get(user=self.student)
		return self.client.get(
			reverse('orders:callback'),
			{'Status': status, 'Authority': payment.authority},
		)


class CourseListTests(ClubTestCase):
	def test_only_published_courses_are_listed(self):
		Course.objects.create(
			coach=self.profile,
			title='دورهٔ در انتظار بررسی',
			slug='pending-course',
			description='…',
			price=Decimal('1000'),
			status=Course.Status.PENDING_REVIEW,
		)

		response = self.client.get(reverse('club:course_list'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.course.title)
		self.assertNotContains(response, 'دورهٔ در انتظار بررسی')

	def test_filters_by_level_and_query(self):
		Course.objects.create(
			coach=self.profile,
			title='دورهٔ پیشرفته',
			slug='advanced-course',
			description='…',
			level=Course.Level.ADVANCED,
			price=Decimal('1000'),
			status=Course.Status.PUBLISHED,
		)

		response = self.client.get(reverse('club:course_list'), {'level': Course.Level.ADVANCED})
		self.assertContains(response, 'دورهٔ پیشرفته')
		self.assertNotContains(response, self.course.title)

		response = self.client.get(reverse('club:course_list'), {'q': 'آزمایشی'})
		self.assertContains(response, self.course.title)
		self.assertNotContains(response, 'دورهٔ پیشرفته')

	def test_pending_course_detail_is_not_publicly_reachable(self):
		self.course.status = Course.Status.DRAFT
		self.course.save(update_fields=['status'])

		response = self.client.get(reverse('club:course_detail', args=[self.course.slug]))

		self.assertEqual(response.status_code, 404)

	def test_course_detail_renders_for_a_guest(self):
		response = self.client.get(reverse('club:course_detail', args=[self.course.slug]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.course.title)
		self.assertContains(response, self.free_episode.title)
		self.assertContains(response, 'با خرید دوره باز می‌شود')


class EpisodeAccessTests(ClubTestCase):
	def test_guest_can_watch_the_first_episode(self):
		response = self.client.get(reverse('club:episode_play', args=[self.free_episode.pk]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, reverse('club:episode_stream', args=[self.free_episode.pk]))

	def test_guest_is_redirected_away_from_a_paid_episode(self):
		response = self.client.get(reverse('club:episode_play', args=[self.paid_episode.pk]))

		self.assertRedirects(response, reverse('club:course_detail', args=[self.course.slug]))

	def test_stream_refuses_a_guest_on_a_paid_episode(self):
		response = self.client.get(reverse('club:episode_stream', args=[self.paid_episode.pk]))

		self.assertEqual(response.status_code, 403)

	def test_stream_serves_the_file_to_an_enrolled_student(self):
		Enrollment.objects.create(user=self.student, course=self.course)
		self.client.force_login(self.student)

		response = self.client.get(reverse('club:episode_stream', args=[self.paid_episode.pk]))
		self.addCleanup(response.close)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(b''.join(response.streaming_content), b'fake-mp4-bytes')

	def test_coach_can_stream_their_own_paid_episode(self):
		self.client.force_login(self.coach_user)

		response = self.client.get(reverse('club:episode_stream', args=[self.paid_episode.pk]))
		# Closed before the file is deleted in cleanup; Windows locks open files.
		self.addCleanup(response.close)

		self.assertEqual(response.status_code, 200)

	def test_a_video_file_has_no_public_url(self):
		with self.assertRaises(ValueError):
			self.paid_episode.video_file.url


class CoursePurchaseTests(ClubTestCase):
	def test_buying_requires_a_login(self):
		response = self.client.post(reverse('club:buy_course', args=[self.course.slug]))

		self.assertEqual(response.status_code, 302)
		self.assertIn(reverse('phone_auth:login'), response['Location'])
		self.assertEqual(Payment.objects.count(), 0)

	def test_buying_creates_a_payment_tagged_with_the_course(self):
		response = self.buy()

		payment = Payment.objects.get(user=self.student)
		self.assertEqual(response.status_code, 302)
		self.assertEqual(payment.amount, Decimal('500000.00'))
		self.assertEqual(payment.metadata, {'course_id': self.course.pk})
		self.assertEqual(payment.status, Payment.Status.PENDING)
		self.assertFalse(Enrollment.objects.filter(user=self.student).exists())

	def test_successful_callback_creates_exactly_one_enrollment(self):
		self.buy()

		response = self.settle('OK')

		self.assertEqual(response.status_code, 200)
		self.assertEqual(Enrollment.objects.filter(user=self.student, course=self.course).count(), 1)
		enrollment = Enrollment.objects.get(user=self.student)
		self.assertIsNotNone(enrollment.payment)
		self.assertEqual(enrollment.payment.status, Payment.Status.SUCCEEDED)
		self.client.force_login(self.student)
		response = self.client.get(reverse('club:episode_play', args=[self.paid_episode.pk]))
		self.assertEqual(response.status_code, 200)

	def test_repeated_callback_does_not_create_a_second_enrollment(self):
		self.buy()

		self.settle('OK')
		self.settle('OK')

		self.assertEqual(Enrollment.objects.count(), 1)

	def test_failed_callback_leaves_no_enrollment(self):
		self.buy()

		self.settle('NOK')

		self.assertEqual(Enrollment.objects.count(), 0)
		payment = Payment.objects.get(user=self.student)
		self.assertEqual(payment.status, Payment.Status.FAILED)

	def test_buying_does_not_empty_the_shop_cart(self):
		category = Category.objects.create(name='لباس تمرین', slug='training-wear')
		product = Product.objects.create(category=category, name='محصول', slug='product', is_active=True)
		variant = ProductVariant.objects.create(
			product=product,
			sku='SKU-1',
			size='M',
			price=Decimal('1000'),
			stock_quantity=3,
		)
		cart = Cart.objects.create(user=self.student)
		CartItem.objects.create(cart=cart, variant=variant, quantity=1)

		self.buy()
		self.settle('OK')

		self.assertTrue(Cart.objects.filter(pk=cart.pk).exists())

	def test_a_free_course_grants_access_without_a_payment(self):
		self.course.price = Decimal('0')
		self.course.save(update_fields=['price'])

		response = self.buy()

		self.assertRedirects(response, reverse('club:course_detail', args=[self.course.slug]))
		self.assertEqual(Payment.objects.count(), 0)
		self.assertTrue(Enrollment.objects.filter(user=self.student, course=self.course).exists())

	def test_the_coach_cannot_be_charged_for_their_own_course(self):
		self.client.force_login(self.coach_user)

		response = self.client.post(reverse('club:buy_course', args=[self.course.slug]))

		self.assertRedirects(response, reverse('club:course_detail', args=[self.course.slug]))
		self.assertEqual(Payment.objects.count(), 0)


class CoachPanelTests(ClubTestCase):
	def test_students_are_refused(self):
		self.client.force_login(self.student)

		response = self.client.get(reverse('coach_panel:course_list'))

		self.assertEqual(response.status_code, 403)

	def test_a_coach_without_an_approved_application_is_redirected(self):
		user_model = get_user_model()
		newcomer = user_model.objects.create_user(
			username='newcoach',
			password='Safe-Training-Password-914!',
			role=user_model.Role.COACH,
		)
		self.client.force_login(newcomer)

		response = self.client.get(reverse('coach_panel:course_list'))

		self.assertRedirects(response, reverse('coaches:apply'))

	def test_dashboard_lists_only_the_signed_in_coachs_courses(self):
		other_user = get_user_model().objects.create_user(
			username='othercoach',
			password='Safe-Training-Password-914!',
			role=get_user_model().Role.COACH,
		)
		other_profile = CoachPortfolio(
			user=other_user,
			display_name='مربی دیگر',
			biography='…',
			coaching_level='Intermediate',
			specializations='Judo',
			years_experience=3,
			certificate_details='مدرک',
			certificate_document=SimpleUploadedFile('other.pdf', b'%PDF-1.4 other'),
			status=CoachPortfolio.Status.APPROVED,
			is_published=True,
		)
		other_profile.full_clean()
		other_profile.save()
		self.addCleanup(other_profile.certificate_document.delete, save=False)
		Course.objects.create(
			coach=other_profile,
			title='دورهٔ مربی دیگر',
			slug='other-course',
			description='…',
			price=Decimal('1000'),
			status=Course.Status.PUBLISHED,
		)

		self.client.force_login(self.coach_user)
		response = self.client.get(reverse('coach_panel:course_list'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.course.title)
		self.assertNotContains(response, 'دورهٔ مربی دیگر')

	def test_editing_another_coachs_course_is_a_404(self):
		other_user = get_user_model().objects.create_user(
			username='othercoach2',
			password='Safe-Training-Password-914!',
			role=get_user_model().Role.COACH,
		)
		other_profile = CoachPortfolio(
			user=other_user,
			display_name='مربی سوم',
			biography='…',
			coaching_level='Intermediate',
			specializations='Judo',
			years_experience=3,
			certificate_details='مدرک',
			certificate_document=SimpleUploadedFile('other2.pdf', b'%PDF-1.4 other'),
			status=CoachPortfolio.Status.APPROVED,
			is_published=True,
		)
		other_profile.full_clean()
		other_profile.save()
		self.addCleanup(other_profile.certificate_document.delete, save=False)
		foreign = Course.objects.create(
			coach=other_profile,
			title='دورهٔ بیگانه',
			slug='foreign-course',
			description='…',
			price=Decimal('1000'),
			status=Course.Status.DRAFT,
		)

		self.client.force_login(self.coach_user)
		response = self.client.get(reverse('coach_panel:course_edit', args=[foreign.pk]))

		self.assertEqual(response.status_code, 404)

	def test_new_course_is_created_as_pending_review(self):
		self.client.force_login(self.coach_user)

		response = self.client.post(reverse('coach_panel:course_create'), {
			'title': 'دورهٔ تازه',
			'slug': '',
			'description': 'توضیحات',
			'level': Course.Level.INTERMEDIATE,
			'price': '250000',
		})

		course = Course.objects.get(title='دورهٔ تازه')
		self.assertEqual(response.status_code, 302)
		self.assertEqual(course.status, Course.Status.PENDING_REVIEW)
		self.assertEqual(course.coach, self.profile)
		self.assertTrue(course.slug)

	def test_coach_dashboard_and_forms_render(self):
		self.client.force_login(self.coach_user)

		self.assertEqual(self.client.get(reverse('coach_panel:course_list')).status_code, 200)
		self.assertEqual(self.client.get(reverse('coach_panel:course_create')).status_code, 200)
		self.assertEqual(
			self.client.get(reverse('coach_panel:course_edit', args=[self.course.pk])).status_code,
			200,
		)
		self.assertEqual(
			self.client.get(reverse('coach_panel:episode_create', args=[self.course.pk])).status_code,
			200,
		)
		self.assertEqual(
			self.client.get(reverse('coach_panel:episode_edit', args=[self.paid_episode.pk])).status_code,
			200,
		)

	def test_a_new_episode_can_be_added_to_the_coachs_course(self):
		self.client.force_login(self.coach_user)

		response = self.client.post(
			reverse('coach_panel:episode_create', args=[self.course.pk]),
			{
				'title': 'قسمت سوم',
				'order': '3',
				'duration': '90',
				'is_free': '',
				'video_file': video('third.mp4'),
			},
		)

		episode = Episode.objects.get(title='قسمت سوم')
		self.addCleanup(episode.video_file.delete, save=False)
		self.assertEqual(response.status_code, 302)
		self.assertEqual(episode.course, self.course)
		self.assertFalse(episode.is_free)

	def test_adding_an_episode_to_another_coachs_course_is_a_404(self):
		other_user = get_user_model().objects.create_user(
			username='othercoach3',
			password='Safe-Training-Password-914!',
			role=get_user_model().Role.COACH,
		)
		other_profile = CoachPortfolio(
			user=other_user,
			display_name='مربی چهارم',
			biography='…',
			coaching_level='Intermediate',
			specializations='Judo',
			years_experience=3,
			certificate_details='مدرک',
			certificate_document=SimpleUploadedFile('other3.pdf', b'%PDF-1.4 other'),
			status=CoachPortfolio.Status.APPROVED,
			is_published=True,
		)
		other_profile.full_clean()
		other_profile.save()
		self.addCleanup(other_profile.certificate_document.delete, save=False)
		foreign = Course.objects.create(
			coach=other_profile,
			title='دورهٔ بیگانهٔ دوم',
			slug='foreign-course-2',
			description='…',
			price=Decimal('1000'),
			status=Course.Status.DRAFT,
		)

		self.client.force_login(self.coach_user)
		response = self.client.get(reverse('coach_panel:episode_create', args=[foreign.pk]))

		self.assertEqual(response.status_code, 404)


class EpisodeRuleTests(ClubTestCase):
	def test_the_first_episode_is_always_free(self):
		episode = self.add_episode(order=1, title='قسمت اول', is_free=False, name='first.mp4')

		episode.refresh_from_db()

		self.assertTrue(episode.is_free)

	def test_a_later_episode_keeps_its_free_flag(self):
		self.assertTrue(self.free_episode.is_free)
		self.assertFalse(self.paid_episode.is_free)


class CoachClubPageTests(ClubTestCase):
	def test_a_published_coach_page_lists_their_courses(self):
		response = self.client.get(reverse('club:coach_detail', args=[self.profile.pk]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.course.title)

	def test_an_unpublished_coach_page_is_not_reachable(self):
		self.profile.is_published = False
		self.profile.save(update_fields=['is_published'])

		response = self.client.get(reverse('club:coach_detail', args=[self.profile.pk]))

		self.assertEqual(response.status_code, 404)


class AdminSmokeTests(ClubTestCase):
	def test_episode_change_page_renders_with_a_private_video(self):
		admin_user = get_user_model().objects.create_superuser(
			phone='09120000001',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(admin_user)

		response = self.client.get(
			reverse('admin:club_episode_change', args=[self.paid_episode.pk]),
		)

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.paid_episode.video_file.name)

	def test_admin_does_not_link_to_the_private_video(self):
		admin_user = get_user_model().objects.create_superuser(
			phone='09120000002',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(admin_user)

		response = self.client.get(
			reverse('admin:club_episode_change', args=[self.paid_episode.pk]),
		)

		self.assertNotContains(response, 'href="https://')
