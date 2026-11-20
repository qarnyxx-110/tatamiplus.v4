from datetime import timedelta

import jdatetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import CoachInvite, CoachPortfolio, CoachStudent


class CoachWorkflowTests(TestCase):
	def create_portfolio(self, username='coach-user'):
		user = get_user_model().objects.create_user(
			username=username,
			password='Safe-Training-Password-914!',
			role=get_user_model().Role.COACH,
		)
		portfolio = CoachPortfolio(
			user=user,
			display_name='مربی آزمایشی',
			coaching_level='Advanced',
			specializations='Taekwondo',
			years_experience=8,
			club='Local club',
			certificate_details='National coaching certificate',
			certificate_document=SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test document'),
		)
		portfolio.full_clean()
		portfolio.save()
		self.addCleanup(portfolio.certificate_document.delete, save=False)
		return portfolio

	def test_coach_can_submit_one_pending_application(self):
		user = get_user_model().objects.create_user(
			username='applicant',
			password='Safe-Training-Password-914!',
			role=get_user_model().Role.COACH,
		)
		self.client.force_login(user)
		response = self.client.post(
			reverse('coaches:apply'),
			{
				'display_name': 'Coach Applicant',
				'coaching_level': 'Advanced',
				'specializations': 'Taekwondo',
				'years_experience': 8,
				'club': 'Local club',
				'certificate_details': 'National coaching certificate',
				'certificate_document': SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test document'),
			},
		)

		self.assertRedirects(response, reverse('coaches:application_status'))
		portfolio = CoachPortfolio.objects.get(user=user)
		self.assertEqual(portfolio.status, CoachPortfolio.Status.PENDING_REVIEW)
		with self.assertRaises(ValueError):
			portfolio.certificate_document.url
		self.addCleanup(portfolio.certificate_document.delete, save=False)

		response = self.client.get(reverse('coaches:apply'))
		self.assertRedirects(response, reverse('coaches:application_status'))

	def test_student_cannot_submit_coach_application(self):
		student = get_user_model().objects.create_user(
			username='student-user',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(student)

		response = self.client.get(reverse('coaches:apply'))

		self.assertEqual(response.status_code, 403)

	def test_rejection_requires_a_reason(self):
		portfolio = self.create_portfolio()
		portfolio.status = CoachPortfolio.Status.REJECTED

		with self.assertRaises(ValidationError):
			portfolio.full_clean()

	def test_only_approved_published_profiles_are_public(self):
		portfolio = self.create_portfolio()
		portfolio.display_name = 'Coach Example'
		portfolio.biography = 'A team-managed portfolio.'
		portfolio.save()
		self.assertEqual(self.client.get(reverse('coaches:directory')).status_code, 200)
		self.assertEqual(
			self.client.get(reverse('coaches:profile_detail', args=[portfolio.pk])).status_code,
			404,
		)

		portfolio.status = CoachPortfolio.Status.APPROVED
		portfolio.is_published = True
		portfolio.full_clean()
		portfolio.save()

		response = self.client.get(reverse('coaches:directory'))
		self.assertContains(response, 'Coach Example')
		self.assertEqual(
			self.client.get(reverse('coaches:profile_detail', args=[portfolio.pk])).status_code,
			200,
		)

		portfolio.status = CoachPortfolio.Status.REJECTED
		portfolio.rejection_reason = 'Review did not pass.'
		portfolio.save()
		self.assertNotContains(self.client.get(reverse('coaches:directory')), 'Coach Example')

	def test_certificate_download_is_staff_only(self):
		portfolio = self.create_portfolio()
		url = reverse('coaches:certificate_download', args=[portfolio.pk])

		self.assertEqual(self.client.get(url).status_code, 302)

		staff = get_user_model().objects.create_superuser(
			phone='09120000120',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(staff)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		self.assertIn('attachment', response.headers['Content-Disposition'])
		self.assertEqual(b''.join(response.streaming_content), b'%PDF-1.4 test document')

	def test_application_status_uses_persian_jalali_date(self):
		portfolio = self.create_portfolio()
		portfolio.submitted_at = jdatetime.datetime(
			1405,
			8,
			11,
			8,
			tzinfo=timezone.get_current_timezone(),
		)
		portfolio.save(update_fields=['submitted_at'])
		self.client.force_login(portfolio.user)

		response = self.client.get(reverse('coaches:application_status'))

		self.assertContains(response, 'تاریخ ثبت: ۱۴۰۵/۰۸/۱۱')


class CoachAdminLocalizationTests(TestCase):
	def make_staff(self):
		staff = get_user_model().objects.create_superuser(
			phone='09120000150',
			password='Safe-Training-Password-914!',
		)
		self.client.force_login(staff)
		return staff

	def test_coach_admin_changelist_renders_jalali_date_filters(self):
		self.make_staff()

		response = self.client.get(reverse('admin:coaches_coachportfolio_changelist'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'زمان ثبت')

	def test_coach_admin_add_and_change_views_render_the_standard_form(self):
		# Regression: the certificate download link is an admin display
		# method, so it must sit in readonly_fields, not in fields alone.
		self.make_staff()
		response = self.client.get(reverse('admin:coaches_coachportfolio_add'))
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'name="user"')
		# The coach/user quick-add link next to the picker.
		self.assertContains(response, reverse('admin:accounts_user_add'))

		portfolio = _make_portfolio(_make_user('admin-coach', role=get_user_model().Role.COACH))
		self.addCleanup(portfolio.certificate_document.delete, save=False)
		response = self.client.get(
			reverse('admin:coaches_coachportfolio_change', args=[portfolio.pk])
		)
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'دریافت فایل مدرک')


def _make_user(username, **extra):
	return get_user_model().objects.create_user(
		username=username,
		password='Safe-Training-Password-914!',
		**extra,
	)


def _make_portfolio(user, display_name='مربی کد'):
	portfolio = CoachPortfolio(
		user=user,
		display_name=display_name,
		coaching_level='Advanced',
		specializations='Taekwondo',
		years_experience=8,
		club='باشگاه آزمایشی',
		certificate_details='مدرک مربیگری',
		certificate_document=SimpleUploadedFile('certificate.pdf', b'%PDF-1.4 test'),
		status=CoachPortfolio.Status.APPROVED,
		is_published=True,
	)
	portfolio.full_clean()
	portfolio.save()
	return portfolio


class CoachInviteTests(TestCase):
	def setUp(self):
		self.coach_user = _make_user('invite-coach', role=get_user_model().Role.COACH)
		self.profile = _make_portfolio(self.coach_user)
		self.addCleanup(self.profile.certificate_document.delete, save=False)
		self.student = _make_user('invite-student')
		self.invite = CoachInvite.objects.create(coach=self.profile, code='ABCD2345')

	def test_panel_refuses_a_student_account(self):
		self.client.force_login(self.student)

		response = self.client.get(reverse('coach_students:list'))

		self.assertEqual(response.status_code, 403)

	def test_panel_renders_and_lists_the_codes(self):
		self.client.force_login(self.coach_user)

		response = self.client.get(reverse('coach_students:list'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'هنرجوهای من')
		self.assertContains(response, 'ABCD2345')

	def test_approval_creates_a_permanent_personal_code(self):
		personal = CoachInvite.objects.get(coach=self.profile, label='کد شخصی')

		self.assertEqual(personal.max_uses, 0)
		self.assertEqual(len(personal.code), 8)
		self.assertTrue(personal.is_active)
		self.assertTrue(personal.is_usable)

	def test_panel_shows_the_personal_code_and_a_copy_button(self):
		self.client.force_login(self.coach_user)
		personal = CoachInvite.objects.get(coach=self.profile, label='کد شخصی')

		response = self.client.get(reverse('coach_students:list'))

		self.assertContains(response, personal.code)
		self.assertContains(response, 'کپی لینک')

	def test_manual_code_entry_finds_the_coach_or_shows_an_error(self):
		self.client.force_login(self.student)
		self.assertContains(self.client.get(reverse('coaches:enter_code')), 'کد دعوت را وارد کن')

		response = self.client.post(reverse('coaches:enter_code'), {'code': self.invite.code.lower()})
		self.assertRedirects(response, reverse('coaches:join_coach', args=[self.invite.code]))

		response = self.client.post(reverse('coaches:enter_code'), {'code': 'ZZZZ9999'})
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'این کد دعوت پیدا نشد')

	def test_join_page_shows_the_remaining_capacity(self):
		invite = CoachInvite.objects.create(coach=self.profile, code='LIMIT234', max_uses=3)
		self.client.force_login(self.student)

		response = self.client.get(reverse('coaches:join_coach', args=[invite.code]))

		self.assertContains(response, '۳ جای خالی از ۳')

	def test_coach_creates_a_code_that_belongs_to_their_profile(self):
		self.client.force_login(self.coach_user)

		response = self.client.post(reverse('coach_students:list'), {
			'label': 'کلاس شنبه‌ها',
			'max_uses': 15,
		})

		self.assertRedirects(response, reverse('coach_students:list'))
		invite = CoachInvite.objects.get(label='کلاس شنبه‌ها')
		self.assertEqual(invite.coach, self.profile)
		self.assertEqual(invite.max_uses, 15)
		self.assertEqual(len(invite.code), 8)
		for character in 'IO01':
			self.assertNotIn(character, invite.code)

	def test_toggle_flips_the_code_and_hides_other_coaches_codes(self):
		self.client.force_login(self.coach_user)
		url = reverse('coach_students:toggle_invite', args=[self.invite.pk])

		response = self.client.post(url)

		self.assertRedirects(response, reverse('coach_students:list'))
		self.invite.refresh_from_db()
		self.assertFalse(self.invite.is_active)

		other_user = _make_user('other-coach', role=get_user_model().Role.COACH)
		other_profile = _make_portfolio(other_user, 'مربی دیگر')
		self.addCleanup(other_profile.certificate_document.delete, save=False)
		self.client.force_login(other_user)

		self.assertEqual(self.client.post(url).status_code, 404)

	def test_join_page_renders_and_unknown_code_is_404(self):
		self.client.force_login(self.student)

		response = self.client.get(reverse('coaches:join_coach', args=[self.invite.code]))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, self.profile.display_name)
		self.assertContains(response, self.invite.code)

		self.assertEqual(
			self.client.get(reverse('coaches:join_coach', args=['NOPE9999'])).status_code,
			404,
		)

	def test_redeeming_a_code_attaches_the_student_once(self):
		self.client.force_login(self.student)
		url = reverse('coaches:join_coach', args=[self.invite.code])

		response = self.client.post(url)
		self.assertRedirects(response, reverse('club:coach_detail', args=[self.profile.pk]))
		second = self.client.post(url)

		self.assertRedirects(second, reverse('club:coach_detail', args=[self.profile.pk]))
		self.assertEqual(CoachStudent.objects.filter(student=self.student).count(), 1)
		self.invite.refresh_from_db()
		self.assertEqual(self.invite.uses, 1)

		self.assertContains(
			self.client.get(url),
			'شما از قبل در فهرست هنرجویان این مربی هستید.',
		)

	def test_codes_are_found_case_insensitively(self):
		self.client.force_login(self.student)

		response = self.client.post(reverse('coaches:join_coach', args=['abcd2345']))

		self.assertRedirects(response, reverse('club:coach_detail', args=[self.profile.pk]))
		self.assertTrue(CoachStudent.objects.filter(coach=self.profile, student=self.student).exists())

	def test_disabled_code_is_refused(self):
		self.invite.is_active = False
		self.invite.save(update_fields=['is_active'])
		self.client.force_login(self.student)

		response = self.client.post(reverse('coaches:join_coach', args=[self.invite.code]))

		self.assertRedirects(response, reverse('coaches:join_coach', args=[self.invite.code]))
		self.assertFalse(CoachStudent.objects.exists())

	def test_expired_code_is_refused(self):
		self.invite.expires_at = timezone.now() - timedelta(days=1)
		self.invite.save(update_fields=['expires_at'])
		self.client.force_login(self.student)

		response = self.client.post(reverse('coaches:join_coach', args=[self.invite.code]))

		self.assertRedirects(response, reverse('coaches:join_coach', args=[self.invite.code]))
		self.assertFalse(CoachStudent.objects.exists())

	def test_exhausted_code_is_refused(self):
		self.invite.max_uses = 1
		self.invite.uses = 1
		self.invite.save(update_fields=['max_uses', 'uses'])
		self.client.force_login(self.student)

		response = self.client.post(reverse('coaches:join_coach', args=[self.invite.code]))

		self.assertRedirects(response, reverse('coaches:join_coach', args=[self.invite.code]))
		self.assertFalse(CoachStudent.objects.exists())

	def test_a_coach_cannot_join_their_own_list(self):
		self.client.force_login(self.coach_user)

		response = self.client.post(reverse('coaches:join_coach', args=[self.invite.code]))

		self.assertRedirects(response, reverse('coaches:join_coach', args=[self.invite.code]))
		self.assertFalse(CoachStudent.objects.exists())


class CoachHubTests(TestCase):
	def setUp(self):
		self.coach_user = _make_user('hub-coach', role=get_user_model().Role.COACH)
		self.client.force_login(self.coach_user)

	def make_portfolio(self, status, reason=''):
		portfolio = CoachPortfolio(
			user=self.coach_user,
			display_name='مربی هاب',
			coaching_level='Advanced',
			specializations='Taekwondo',
			years_experience=5,
			club='باشگاه آزمایشی',
			certificate_details='مدرک مربیگری',
			certificate_document=SimpleUploadedFile('hub.pdf', b'%PDF-1.4 hub'),
			status=status,
			rejection_reason=reason,
			submitted_at=timezone.now(),
		)
		portfolio.full_clean()
		portfolio.save()
		self.addCleanup(portfolio.certificate_document.delete, save=False)
		return portfolio

	def approve(self):
		portfolio = self.make_portfolio(CoachPortfolio.Status.PENDING_REVIEW)
		portfolio.status = CoachPortfolio.Status.APPROVED
		portfolio.save()
		return portfolio

	def test_account_offers_the_form_before_any_request(self):
		response = self.client.get(reverse('account'))

		self.assertContains(response, 'ثبت پورتفولیوی مربیگری')
		self.assertContains(response, 'ثبت نشده')

	def test_pending_status_is_visible_without_opening_the_status_page(self):
		self.make_portfolio(CoachPortfolio.Status.PENDING_REVIEW)

		response = self.client.get(reverse('account'))

		self.assertContains(response, 'در انتظار بررسی')
		self.assertNotContains(response, 'ثبت پورتفولیوی مربیگری')

	def test_rejected_request_shows_the_reason_and_a_resubmit_link(self):
		self.make_portfolio(CoachPortfolio.Status.REJECTED, 'مدرک ناخوانا بود.')

		response = self.client.get(reverse('account'))

		self.assertContains(response, 'مدرک ناخوانا بود.')
		self.assertContains(response, 'ویرایش و ارسال دوباره')

	def test_rejected_request_can_be_edited_and_resent(self):
		portfolio = self.make_portfolio(CoachPortfolio.Status.REJECTED, 'ناقص بود.')
		original_submitted_at = portfolio.submitted_at

		response = self.client.get(reverse('coaches:apply'))
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'ارسال دوباره')

		response = self.client.post(reverse('coaches:apply'), {
			'display_name': 'مربی هاب',
			'coaching_level': 'Advanced',
			'specializations': 'Kata',
			'years_experience': 9,
			'club': 'باشگاه تازه',
			'certificate_details': 'مدرک کامل',
		})

		self.assertRedirects(response, reverse('coaches:application_status'))
		portfolio.refresh_from_db()
		self.assertEqual(portfolio.status, CoachPortfolio.Status.PENDING_REVIEW)
		self.assertEqual(portfolio.rejection_reason, '')
		self.assertIsNone(portfolio.reviewed_at)
		self.assertEqual(portfolio.specializations, 'Kata')
		self.assertEqual(portfolio.club, 'باشگاه تازه')
		self.assertGreater(portfolio.submitted_at, original_submitted_at)
		self.assertEqual(CoachPortfolio.objects.filter(user=self.coach_user).count(), 1)

	def test_pending_request_cannot_be_edited(self):
		self.make_portfolio(CoachPortfolio.Status.PENDING_REVIEW)

		response = self.client.get(reverse('coaches:apply'))

		self.assertRedirects(response, reverse('coaches:application_status'))

	def test_approved_request_cannot_be_edited(self):
		self.approve()

		response = self.client.get(reverse('coaches:apply'))

		self.assertRedirects(response, reverse('coaches:application_status'))

	def test_approval_creates_an_unpublished_profile(self):
		portfolio = self.approve()
		portfolio.refresh_from_db()

		self.assertFalse(portfolio.is_published)

	def test_approved_account_lists_the_panels(self):
		self.approve()

		response = self.client.get(reverse('account'))

		self.assertContains(response, reverse('coach_panel:course_list'))
		self.assertContains(response, reverse('coach_students:list'))
		self.assertContains(response, reverse('coaches:portfolio'))

	def test_portfolio_renders_and_saves_without_publishing(self):
		self.approve()

		response = self.client.get(reverse('coaches:portfolio'))
		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'پورتفولیوی عمومی من')

		response = self.client.post(reverse('coaches:portfolio'), {
			'display_name': 'مربی هاب',
			'headline': 'مربی کاتا',
			'biography': 'معرفی تازه',
			'belt': 'دان ۳',
			'club': 'باشگاه مرکزی',
		})

		self.assertRedirects(response, reverse('coaches:portfolio'))
		portfolio = CoachPortfolio.objects.get(user=self.coach_user)
		self.assertEqual(portfolio.display_name, 'مربی هاب')
		self.assertEqual(portfolio.belt, 'دان ۳')
		self.assertFalse(portfolio.is_published)

	def test_portfolio_refuses_a_student(self):
		self.client.force_login(_make_user('portfolio-student'))

		self.assertEqual(self.client.get(reverse('coaches:portfolio')).status_code, 403)

	def test_portfolio_redirects_a_pending_coach_to_the_status_page(self):
		self.make_portfolio(CoachPortfolio.Status.PENDING_REVIEW)

		response = self.client.get(reverse('coaches:portfolio'))

		self.assertRedirects(response, reverse('coaches:application_status'))

	def test_status_page_offers_a_resubmit_button_when_rejected(self):
		self.make_portfolio(CoachPortfolio.Status.REJECTED, 'مدرک ناخوانا بود.')

		response = self.client.get(reverse('coaches:application_status'))

		self.assertContains(response, 'مدرک ناخوانا بود.')
		self.assertContains(response, 'ویرایش و ارسال دوباره')
