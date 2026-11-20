from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from club.models import Course, Episode
from coaches.invites import ensure_personal_invite, redeem
from coaches.models import CoachPortfolio
from orders.models import Address, Order, Payment
from store.models import Cart, CartItem, Category, Product, ProductVariant

from .models import GemReason, GemRule, GemTransaction
from .services import InsufficientGems, award, balance_of, spend

PASSWORD = 'Safe-Training-Password-914!'


def make_user(username, **extra):
	return get_user_model().objects.create_user(username=username, password=PASSWORD, **extra)


class GemServiceTests(TestCase):
	def setUp(self):
		self.user = make_user('gem-user')
		GemRule.objects.update_or_create(
			reason=GemReason.PROFILE_COMPLETE,
			defaults={'amount': 50, 'is_percentage': False, 'daily_limit': 0, 'is_active': True},
		)
		GemRule.objects.update_or_create(
			reason=GemReason.EPISODE_COMPLETE,
			defaults={'amount': 10, 'is_percentage': False, 'daily_limit': 0, 'is_active': True},
		)
		GemRule.objects.update_or_create(
			reason=GemReason.PURCHASE,
			defaults={'amount': 2, 'is_percentage': True, 'daily_limit': 0, 'is_active': True},
		)

	def test_award_credits_the_ledger_and_the_cached_balance(self):
		entry = award(self.user, GemReason.PROFILE_COMPLETE)

		self.assertIsNotNone(entry)
		self.assertEqual(entry.amount, 50)
		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 50)
		self.assertEqual(balance_of(self.user), 50)

	def test_the_same_event_never_pays_twice(self):
		first = award(self.user, GemReason.EPISODE_COMPLETE, ref_type='episode', ref_id='7')
		second = award(self.user, GemReason.EPISODE_COMPLETE, ref_type='episode', ref_id='7')

		self.assertIsNotNone(first)
		self.assertIsNone(second)
		self.assertEqual(GemTransaction.objects.filter(user=self.user).count(), 1)
		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 10)

	def test_daily_limit_shortens_the_last_award_of_the_day(self):
		GemRule.objects.filter(reason=GemReason.EPISODE_COMPLETE).update(amount=7, daily_limit=10)

		first = award(self.user, GemReason.EPISODE_COMPLETE, ref_type='episode', ref_id='1')
		second = award(self.user, GemReason.EPISODE_COMPLETE, ref_type='episode', ref_id='2')
		third = award(self.user, GemReason.EPISODE_COMPLETE, ref_type='episode', ref_id='3')

		self.assertEqual(first.amount, 7)
		self.assertEqual(second.amount, 3)
		self.assertIsNone(third)
		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 10)

	def test_percentage_rule_reads_the_base_amount(self):
		entry = award(
			self.user,
			GemReason.PURCHASE,
			ref_type='order',
			ref_id='42',
			base_amount=Decimal('27000.00'),
		)

		self.assertEqual(entry.amount, 540)

	def test_a_percentage_rule_without_a_base_amount_is_a_programming_error(self):
		from .services import GemError

		with self.assertRaises(GemError):
			award(self.user, GemReason.PURCHASE, ref_type='order', ref_id='1')

	def test_inactive_rule_awards_nothing(self):
		GemRule.objects.filter(reason=GemReason.PROFILE_COMPLETE).update(is_active=False)

		self.assertIsNone(award(self.user, GemReason.PROFILE_COMPLETE))
		self.assertEqual(GemTransaction.objects.count(), 0)

	def test_spend_debits_and_syncs_the_cached_balance(self):
		award(self.user, GemReason.PROFILE_COMPLETE)

		entry = spend(self.user, 20, ref_type='order', ref_id='9')

		self.assertEqual(entry.amount, -20)
		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 30)

	def test_spend_refuses_more_than_the_balance(self):
		award(self.user, GemReason.PROFILE_COMPLETE)

		with self.assertRaises(InsufficientGems):
			spend(self.user, 51)

		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 50)

	def test_spend_rejects_a_non_positive_amount(self):
		from .services import GemError

		with self.assertRaises(GemError):
			spend(self.user, 0)


class ProfileCompletionRewardTests(TestCase):
	def setUp(self):
		self.user = make_user('fresh-user', is_profile_complete=False)
		self.client.force_login(self.user)

	def test_finishing_the_profile_pays_once(self):
		response = self.client.post(reverse('phone_auth:complete_profile'), {
			'name': 'هنرجوی تازه',
			'city': 'تهران',
			'role': get_user_model().Role.STUDENT,
			'password': 'Safe-Training-Password-914!',
			'password_confirm': 'Safe-Training-Password-914!',
		})

		self.assertEqual(response.status_code, 302)
		self.user.refresh_from_db()
		self.assertEqual(self.user.gem_balance, 50)
		entry = GemTransaction.objects.get(user=self.user, reason=GemReason.PROFILE_COMPLETE)
		self.assertEqual(entry.amount, 50)


class EpisodeCompletionRewardTests(TestCase):
	def setUp(self):
		user_model = get_user_model()
		self.student = make_user('watcher')
		self.coach_user = make_user('course-coach', role=user_model.Role.COACH)
		profile = CoachPortfolio(
			user=self.coach_user,
			display_name='مربی آزمایشی',
			biography='…',
			coaching_level='Advanced',
			specializations='Taekwondo',
			years_experience=8,
			club='باشگاه آزمایشی',
			certificate_details='مدرک مربیگری',
			certificate_document=SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test'),
			status=CoachPortfolio.Status.APPROVED,
			is_published=True,
		)
		profile.full_clean()
		profile.save()
		self.addCleanup(profile.certificate_document.delete, save=False)
		course = Course.objects.create(
			coach=profile,
			title='دورهٔ آزمایشی',
			slug='reward-course',
			description='…',
			price=Decimal('0'),
			status=Course.Status.PUBLISHED,
		)
		self.episode = Episode.objects.create(
			course=course,
			title='قسمت رایگان',
			order=1,
			video_file=SimpleUploadedFile('lesson.mp4', b'fake-mp4', content_type='video/mp4'),
		)
		self.addCleanup(self.episode.video_file.delete, save=False)
		GemRule.objects.update_or_create(
			reason=GemReason.EPISODE_COMPLETE,
			defaults={'amount': 10, 'is_percentage': False, 'daily_limit': 0, 'is_active': True},
		)

	def test_marking_an_episode_finished_pays_once(self):
		self.client.force_login(self.student)
		url = reverse('club:episode_complete', args=[self.episode.pk])

		self.client.post(url)
		self.client.post(url)

		self.student.refresh_from_db()
		self.assertEqual(self.student.gem_balance, 10)
		self.assertEqual(
			GemTransaction.objects.filter(user=self.student, reason=GemReason.EPISODE_COMPLETE).count(),
			1,
		)


@override_settings(
	PAYMENT_ALLOW_MOCK=True,
	SHIPPING_FLAT_RATE=Decimal('25000'),
)
class PurchaseRewardTests(TestCase):
	def setUp(self):
		GemRule.objects.update_or_create(
			reason=GemReason.PURCHASE,
			defaults={'amount': 2, 'is_percentage': True, 'daily_limit': 0, 'is_active': True},
		)
		self.user = make_user('shopper')
		category = Category.objects.create(name='لباس تمرین', slug='training-wear')
		product = Product.objects.create(category=category, name='محصول', slug='p', is_active=True)
		self.variant = ProductVariant.objects.create(
			product=product,
			sku='SKU-GEM',
			size='M',
			color='سفید',
			price=Decimal('1000'),
			stock_quantity=5,
		)
		self.address = Address.objects.create(
			user=self.user,
			province='تهران',
			city='تهران',
			full_address='خیابان آزمایشی، پلاک ۱',
			postal_code='1234567890',
		)

	def test_a_settled_shop_order_pays_a_share_of_the_total(self):
		cart, _ = Cart.objects.get_or_create(user=self.user)
		CartItem.objects.create(cart=cart, variant=self.variant, quantity=2)
		self.client.force_login(self.user)
		self.client.post(reverse('orders:address'), {'address_id': self.address.pk})
		self.client.post(reverse('orders:pay'))
		order = Order.objects.get(user=self.user)

		self.client.get(
			reverse('orders:callback'),
			{'Status': 'OK', 'Authority': order.payment.authority},
		)

		self.user.refresh_from_db()
		entry = GemTransaction.objects.get(user=self.user, reason=GemReason.PURCHASE)
		self.assertEqual(entry.amount, 540)  # 2% of 27,000
		self.assertEqual(self.user.gem_balance, 540)

	def test_a_course_purchase_does_not_pay_shop_gems(self):
		from orders.signals import payment_succeeded

		payment = Payment.objects.create(
			user=self.user,
			amount=Decimal('500000'),
			status=Payment.Status.SUCCEEDED,
			metadata={'course_id': 12},
		)

		payment_succeeded.send(sender=Payment, payment=payment)

		self.assertFalse(GemTransaction.objects.filter(reason=GemReason.PURCHASE).exists())


class GemPageTests(TestCase):
	def setUp(self):
		self.user = make_user('page-user')
		GemRule.objects.update_or_create(
			reason=GemReason.PROFILE_COMPLETE,
			defaults={'amount': 50, 'is_percentage': False, 'daily_limit': 0, 'is_active': True},
		)

	def test_history_page_requires_login(self):
		response = self.client.get(reverse('gems:history'))

		self.assertIn(reverse('phone_auth:login'), response['Location'])

	def test_history_page_renders_the_balance_and_the_ledger(self):
		award(self.user, GemReason.PROFILE_COMPLETE)
		self.client.force_login(self.user)

		response = self.client.get(reverse('gems:history'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'جم‌های من')
		self.assertContains(response, '۵۰')
		self.assertContains(response, 'تکمیل پروفایل')

	def test_history_page_renders_its_empty_state(self):
		self.client.force_login(self.user)

		response = self.client.get(reverse('gems:history'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'هنوز جمی جمع نکرده‌اید')

	def test_header_hides_the_chip_for_guests_and_shows_it_after_login(self):
		self.assertNotContains(self.client.get(reverse('home')), 'gem-chip')

		award(self.user, GemReason.PROFILE_COMPLETE)
		self.client.force_login(self.user)

		self.assertContains(self.client.get(reverse('home')), 'gem-chip')
		self.assertContains(self.client.get(reverse('home')), '۵۰ جم')


class InviteRewardTests(TestCase):
	def setUp(self):
		user_model = get_user_model()
		self.coach_user = make_user('invite-coach', role=user_model.Role.COACH)
		self.profile = CoachPortfolio(
			user=self.coach_user,
			display_name='مربی آزمایشی',
			biography='…',
			coaching_level='Advanced',
			specializations='Taekwondo',
			years_experience=8,
			club='باشگاه آزمایشی',
			certificate_details='مدرک مربیگری',
			certificate_document=SimpleUploadedFile('invite.pdf', b'%PDF-1.4 invite'),
			status=CoachPortfolio.Status.APPROVED,
		)
		self.profile.full_clean()
		self.profile.save()
		self.addCleanup(self.profile.certificate_document.delete, save=False)

		self.invite = ensure_personal_invite(self.profile)
		self.student = make_user('invite-student')

	def set_amounts(self, student_amount, coach_amount):
		GemRule.objects.update_or_create(
			reason=GemReason.INVITE_STUDENT,
			defaults={
				'amount': student_amount,
				'is_percentage': False,
				'daily_limit': 0,
				'is_active': True,
			},
		)
		GemRule.objects.update_or_create(
			reason=GemReason.INVITE_COACH,
			defaults={
				'amount': coach_amount,
				'is_percentage': False,
				'daily_limit': 0,
				'is_active': True,
			},
		)

	def test_each_side_is_paid_from_its_own_rule(self):
		self.set_amounts(student_amount=20, coach_amount=5)

		link, created = redeem(self.invite.code, self.student)

		self.assertTrue(created)
		self.student.refresh_from_db()
		self.coach_user.refresh_from_db()
		self.assertEqual(self.student.gem_balance, 20)
		self.assertEqual(self.coach_user.gem_balance, 5)
		self.assertEqual(
			GemTransaction.objects.get(user=self.student, reason=GemReason.INVITE_STUDENT).ref_id,
			str(link.pk),
		)

	def test_seeded_rules_start_off_and_pay_nothing(self):
		link, _ = redeem(self.invite.code, self.student)

		self.student.refresh_from_db()
		self.coach_user.refresh_from_db()
		self.assertEqual(self.student.gem_balance, 0)
		self.assertEqual(self.coach_user.gem_balance, 0)
		self.assertFalse(GemTransaction.objects.filter(ref_type='coachstudent', ref_id=str(link.pk)).exists())

	def test_redeeming_twice_never_pays_twice(self):
		self.set_amounts(student_amount=20, coach_amount=5)

		redeem(self.invite.code, self.student)
		_, created = redeem(self.invite.code, self.student)

		self.assertFalse(created)
		self.student.refresh_from_db()
		self.coach_user.refresh_from_db()
		self.assertEqual(self.student.gem_balance, 20)
		self.assertEqual(self.coach_user.gem_balance, 5)
		self.assertEqual(
			GemTransaction.objects.filter(reason__in=[GemReason.INVITE_STUDENT, GemReason.INVITE_COACH]).count(),
			2,
		)
