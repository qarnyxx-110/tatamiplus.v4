from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model
from django.core.cache import cache
from django.contrib.auth.models import Group
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
import jdatetime

from .models import OTPCode, SignupLead
from .phone import normalize_iranian_phone
from .sms import FakeSMSBackend


class UserRoleTests(TestCase):
	def test_new_user_defaults_to_student(self):
		user = get_user_model().objects.create_user(username='new-student', password='test-password')
		user.refresh_from_db()

		self.assertEqual(user.role, get_user_model().Role.STUDENT)
		self.assertIsInstance(user.date_joined, jdatetime.datetime)

	def test_coach_role_can_be_assigned(self):
		user = get_user_model().objects.create_user(
			username='new-coach',
			password='test-password',
			role=get_user_model().Role.COACH,
		)

		self.assertEqual(user.role, get_user_model().Role.COACH)


@override_settings(SMS_BACKEND='accounts.sms.FakeSMSBackend')
class AuthenticationFlowTests(TestCase):
	phone = '09123456789'

	def setUp(self):
		cache.clear()
		FakeSMSBackend.messages.clear()

	def request_code(self, phone=None, role='student', next_url=''):
		return self.client.post(reverse('phone_auth:sms_login'), {
			'phone': phone or self.phone,
			'role': role,
			'next_url': next_url,
		})

	def verify_latest_code(self):
		phone, code = FakeSMSBackend.messages[-1]
		return self.client.post(reverse('phone_auth:verify_otp'), {'code': code})

	def test_phone_normalization_accepts_iranian_dialing_formats(self):
		self.assertEqual(normalize_iranian_phone('+98 912 345 6789'), self.phone)
		self.assertEqual(normalize_iranian_phone('۰۹۱۲۳۴۵۶۷۸۹'), self.phone)

	def test_login_page_renders_and_keeps_a_safe_next_target(self):
		response = self.client.get(reverse('phone_auth:login'), {'next': '/store/cart/'})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'name="next_url"')
		self.assertContains(response, 'value="/store/cart/"')

	def test_new_phone_is_created_only_after_valid_otp(self):
		response = self.request_code(role='coach')
		self.assertRedirects(response, reverse('phone_auth:verify_otp'))
		self.assertFalse(get_user_model().objects.filter(phone=self.phone).exists())

		otp = OTPCode.objects.get(phone=self.phone)
		code_phone, code = FakeSMSBackend.messages[-1]
		self.assertEqual(code_phone, self.phone)
		self.assertNotEqual(otp.code_hash, code)
		self.assertTrue(otp.verify(code))

		response = self.verify_latest_code()
		self.assertRedirects(response, reverse('phone_auth:complete_profile'))
		user = get_user_model().objects.get(phone=self.phone)
		self.assertEqual(user.username, self.phone)
		self.assertEqual(user.role, get_user_model().Role.COACH)
		self.assertFalse(user.has_usable_password())
		self.assertEqual(int(self.client.session['_auth_user_id']), user.pk)

	def test_invalid_code_attempts_are_persisted_and_code_is_consumed(self):
		self.request_code()
		otp = OTPCode.objects.get(phone=self.phone)

		for _ in range(5):
			response = self.client.post(reverse('phone_auth:verify_otp'), {'code': '00000'})
			self.assertEqual(response.status_code, 200)

		otp.refresh_from_db()
		self.assertEqual(otp.attempts, 5)
		self.assertTrue(otp.is_used)
		self.assertFalse(get_user_model().objects.filter(phone=self.phone).exists())

	def test_expired_code_is_consumed_without_creating_user(self):
		self.request_code()
		otp = OTPCode.objects.get(phone=self.phone)
		otp.expires_at = timezone.now() - timedelta(seconds=1)
		otp.save(update_fields=['expires_at'])

		self.verify_latest_code()

		otp.refresh_from_db()
		self.assertTrue(otp.is_used)
		self.assertFalse(get_user_model().objects.filter(phone=self.phone).exists())

	def test_phone_cooldown_limits_resend(self):
		self.request_code()
		response = self.client.post(reverse('phone_auth:send_otp'))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(OTPCode.objects.filter(phone=self.phone).count(), 1)

	def test_profile_completion_preserves_safe_next_destination(self):
		self.request_code(next_url='/store/')
		response = self.verify_latest_code()
		self.assertRedirects(response, reverse('phone_auth:complete_profile'))

		response = self.client.post(reverse('phone_auth:complete_profile'), {
			'name': 'هنرجوی آزمایشی',
			'city': 'کرج',
			'role': 'student',
			'password': 'Safe-Training-Password-914!',
			'password_confirm': 'Safe-Training-Password-914!',
		})

		self.assertRedirects(response, '/store/')
		user = get_user_model().objects.get(phone=self.phone)
		self.assertTrue(user.is_profile_complete)
		self.assertEqual(user.city, 'کرج')
		self.assertTrue(user.has_usable_password())
		self.assertTrue(user.check_password('Safe-Training-Password-914!'))

	def test_completing_the_profile_keeps_the_user_signed_in(self):
		# Changing the password invalidates the session hash stored at OTP
		# verification; without a fresh login the next request logs the user
		# out and they land back on the login page.
		self.request_code()
		self.verify_latest_code()

		response = self.client.post(reverse('phone_auth:complete_profile'), {
			'name': 'هنرجوی آزمایشی',
			'city': 'کرج',
			'role': 'student',
			'password': 'Safe-Training-Password-914!',
			'password_confirm': 'Safe-Training-Password-914!',
		})

		self.assertRedirects(response, reverse('account'))
		response = self.client.get(reverse('account'))
		self.assertTrue(response.wsgi_request.user.is_authenticated)

	def test_setting_a_password_keeps_the_user_signed_in(self):
		# Same session-hash trap as profile completion: the password changes
		# while the user is signed in, so the view has to log them in again.
		get_user_model().objects.create_user(phone=self.phone)
		self.request_code()
		response = self.verify_latest_code()
		self.assertRedirects(response, reverse('phone_auth:set_password'))

		response = self.client.post(reverse('phone_auth:set_password'), {
			'password': 'Safe-Training-Password-914!',
			'password_confirm': 'Safe-Training-Password-914!',
		})

		self.assertRedirects(response, reverse('account'))
		response = self.client.get(reverse('account'))
		self.assertTrue(response.wsgi_request.user.is_authenticated)

	def test_existing_phone_account_keeps_its_role(self):
		user = get_user_model().objects.create_user(
			phone=self.phone,
			role=get_user_model().Role.STUDENT,
			is_profile_complete=True,
			password='Existing-Password-914!',
		)
		self.request_code(role='coach')

		response = self.verify_latest_code()

		self.assertRedirects(response, reverse('account'))
		user.refresh_from_db()
		self.assertEqual(user.pk, int(self.client.session['_auth_user_id']))
		self.assertEqual(user.role, get_user_model().Role.STUDENT)

	def test_legacy_phone_less_staff_can_still_authenticate_by_username(self):
		staff = get_user_model().objects.create_user(
			username='legacy-staff',
			password='Existing-Admin-Password-914!',
			is_staff=True,
		)

		self.assertIsNone(staff.phone)
		self.assertEqual(
			authenticate(username='legacy-staff', password='Existing-Admin-Password-914!'),
			staff,
		)

	def test_logout_remains_post_only_and_clears_session(self):
		self.request_code()
		self.verify_latest_code()
		response = self.client.post('/accounts/logout/')

		self.assertRedirects(response, '/')
		self.assertNotIn('_auth_user_id', self.client.session)


@override_settings(SMS_BACKEND='accounts.sms.FakeSMSBackend')
class PasswordLoginTests(TestCase):
	phone = '09123456780'
	password = 'Safe-Training-Password-914!'

	def setUp(self):
		cache.clear()
		FakeSMSBackend.messages.clear()

	def make_member(self, with_password=True):
		return get_user_model().objects.create_user(
			phone=self.phone,
			role=get_user_model().Role.STUDENT,
			is_profile_complete=True,
			password=self.password if with_password else None,
		)

	def test_login_page_defaults_to_password(self):
		response = self.client.get(reverse('phone_auth:login'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'ورود با رمز عبور')
		self.assertContains(response, 'name="password"')

	def test_member_signs_in_without_an_sms(self):
		self.make_member()

		response = self.client.post(reverse('phone_auth:login'), {
			'phone': self.phone,
			'password': self.password,
		})

		self.assertRedirects(response, reverse('account'))
		self.assertEqual(FakeSMSBackend.messages, [])

	def test_wrong_password_does_not_log_in(self):
		self.make_member()

		response = self.client.post(reverse('phone_auth:login'), {
			'phone': self.phone,
			'password': 'Wrong-Password-914!',
		})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'درست نیست')
		self.assertNotIn('_auth_user_id', self.client.session)

	def test_account_without_a_password_is_told_to_use_sms(self):
		self.make_member(with_password=False)

		response = self.client.post(reverse('phone_auth:login'), {
			'phone': self.phone,
			'password': 'anything',
		})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'هنوز رمز عبور ندارد')

	def test_legacy_member_sets_a_password_after_sms_login(self):
		self.make_member(with_password=False)

		self.client.post(reverse('phone_auth:sms_login'), {'phone': self.phone, 'role': 'student'})
		_, code = FakeSMSBackend.messages[-1]
		response = self.client.post(reverse('phone_auth:verify_otp'), {'code': code})

		self.assertRedirects(response, reverse('phone_auth:set_password'))

		response = self.client.post(reverse('phone_auth:set_password'), {
			'password': self.password,
			'password_confirm': self.password,
		})

		self.assertRedirects(response, reverse('account'))
		user = get_user_model().objects.get(phone=self.phone)
		self.assertTrue(user.check_password(self.password))

	def test_forgot_password_reset_sets_a_new_password_and_signs_in(self):
		user = self.make_member()

		response = self.client.post(reverse('phone_auth:password_reset'), {'phone': self.phone})
		self.assertRedirects(response, reverse('phone_auth:password_reset_confirm'))

		_, code = FakeSMSBackend.messages[-1]
		response = self.client.post(reverse('phone_auth:password_reset_confirm'), {
			'code': code,
			'password': 'Another-Safe-Password-915!',
			'password_confirm': 'Another-Safe-Password-915!',
		})

		self.assertRedirects(response, reverse('account'))
		user.refresh_from_db()
		self.assertTrue(user.check_password('Another-Safe-Password-915!'))
		self.assertEqual(int(self.client.session['_auth_user_id']), user.pk)

	def test_reset_never_creates_an_account_for_an_unknown_phone(self):
		self.client.post(reverse('phone_auth:password_reset'), {'phone': '09120000099'})
		_, code = FakeSMSBackend.messages[-1]

		response = self.client.post(reverse('phone_auth:password_reset_confirm'), {
			'code': code,
			'password': self.password,
			'password_confirm': self.password,
		})

		self.assertEqual(response.status_code, 200)
		self.assertFalse(get_user_model().objects.filter(phone='09120000099').exists())

	def test_complete_profile_requires_a_matching_password(self):
		user = get_user_model().objects.create_user(
			phone='09120000098',
			is_profile_complete=False,
		)
		self.client.force_login(user)

		response = self.client.post(reverse('phone_auth:complete_profile'), {
			'name': 'بدون رمز',
			'city': 'تهران',
			'role': 'student',
			'password': self.password,
			'password_confirm': 'Other-Password-914!',
		})

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'یکسان نیستند')


class CoachSignupLeadTests(TestCase):
	def test_new_coach_account_creates_one_open_lead(self):
		user = get_user_model().objects.create_user(
			phone='09120000001',
			is_profile_complete=False,
			role=get_user_model().Role.COACH,
		)

		lead = SignupLead.objects.get(user=user)

		self.assertEqual(lead.status, SignupLead.Status.NEW)
		self.assertEqual(lead.assigned_to, None)
		self.assertEqual(SignupLead.objects.filter(user=user).count(), 1)

	def test_student_account_does_not_create_call_center_lead(self):
		user = get_user_model().objects.create_user(phone='09120000002')

		self.assertFalse(SignupLead.objects.filter(user=user).exists())

	def test_lead_admin_is_hidden_from_non_call_center_user(self):
		staff = get_user_model().objects.create_user(
			username='unassigned-staff',
			password='Existing-Admin-Password-914!',
			is_staff=True,
		)
		self.client.force_login(staff)

		response = self.client.get(reverse('admin:accounts_signuplead_changelist'))

		self.assertEqual(response.status_code, 403)

	def test_call_center_member_can_manage_leads_and_see_new_count(self):
		coach = get_user_model().objects.create_user(
			phone='09120000003',
			role=get_user_model().Role.COACH,
		)
		operator = get_user_model().objects.create_user(
			username='call-agent',
			password='Existing-Admin-Password-914!',
			is_staff=True,
		)
		group, _ = Group.objects.get_or_create(name='call_center')
		operator.groups.add(group)
		self.client.force_login(operator)

		response = self.client.get(reverse('admin:accounts_signuplead_changelist'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'سرنخ‌های جدید مربی: 1')
		self.assertContains(response, coach.phone)


class UserDeletionTests(TestCase):
	def test_admin_can_delete_a_coach_together_with_its_lead(self):
		# Regression: the lead admin used to refuse every delete, and Django
		# checks that permission for each cascaded object too — which made
		# coach accounts impossible to delete from the admin.
		staff = get_user_model().objects.create_superuser(
			phone='09120000180',
			password='Safe-Training-Password-914!',
		)
		coach = get_user_model().objects.create_user(
			phone='09120000181',
			role=get_user_model().Role.COACH,
		)
		self.assertTrue(SignupLead.objects.filter(user=coach).exists())
		self.client.force_login(staff)

		url = reverse('admin:accounts_user_delete', args=[coach.pk])
		self.assertEqual(self.client.get(url).status_code, 200)

		response = self.client.post(url, {'post': 'yes'})

		self.assertRedirects(response, reverse('admin:accounts_user_changelist'))
		self.assertFalse(get_user_model().objects.filter(phone='09120000181').exists())
		self.assertFalse(SignupLead.objects.filter(user__phone='09120000181').exists())

	def test_a_call_center_member_without_user_delete_rights_cannot_delete_a_lead(self):
		# Leads follow user deletion: the permission mirrors deleting the
		# account the lead belongs to, nothing more.
		coach = get_user_model().objects.create_user(
			phone='09120000182',
			role=get_user_model().Role.COACH,
		)
		lead = SignupLead.objects.get(user=coach)
		operator = get_user_model().objects.create_user(
			phone='09120000183',
			is_staff=True,
		)
		group, _ = Group.objects.get_or_create(name='call_center')
		operator.groups.add(group)
		self.client.force_login(operator)

		response = self.client.get(reverse('admin:accounts_signuplead_delete', args=[lead.pk]))

		self.assertEqual(response.status_code, 403)


class AccountPageTests(TestCase):
	def test_guest_still_sees_the_role_chooser(self):
		response = self.client.get(reverse('account'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'مسیرت را انتخاب کن')

	def test_student_page_renders_the_quick_links(self):
		user = get_user_model().objects.create_user(
			phone='09120000010',
			first_name='هنرجوی آزمایشی',
			is_profile_complete=True,
		)
		self.client.force_login(user)

		response = self.client.get(reverse('account'))

		self.assertEqual(response.status_code, 200)
		self.assertContains(response, 'هنرجوی آزمایشی')
		self.assertContains(response, reverse('orders:list'))
		self.assertContains(response, reverse('gems:history'))
		self.assertContains(response, reverse('club:course_list'))

	def test_phone_is_shown_when_no_name_is_set(self):
		user = get_user_model().objects.create_user(
			phone='09120000011',
			is_profile_complete=True,
		)
		self.client.force_login(user)

		response = self.client.get(reverse('account'))

		self.assertContains(response, '۰۹۱۲۰۰۰۰۰۱۱')  # Persian digits of the phone

