from django.contrib.auth.base_user import BaseUserManager

from .phone import normalize_iranian_phone


class UserManager(BaseUserManager):
	use_in_migrations = True

	def get_by_natural_key(self, username):
		try:
			phone = normalize_iranian_phone(username)
		except ValueError:
			phone = None

		if phone:
			user = self.filter(phone=phone).first()
			if user is not None:
				return user

		return self.get(username=username, phone__isnull=True, is_staff=True)

	def _create_user(self, phone=None, password=None, **extra_fields):
		username = extra_fields.pop('username', None)
		if phone:
			phone = normalize_iranian_phone(phone)
			username = username or phone
		elif not username:
			raise ValueError('A phone number or legacy username is required.')

		user = self.model(phone=phone, username=username, **extra_fields)
		if password:
			user.set_password(password)
		else:
			user.set_unusable_password()
		user.save(using=self._db)
		return user

	def create_user(self, phone=None, password=None, **extra_fields):
		extra_fields.setdefault('is_staff', False)
		extra_fields.setdefault('is_superuser', False)
		return self._create_user(phone, password, **extra_fields)

	def create_superuser(self, phone=None, password=None, **extra_fields):
		if not phone:
			raise ValueError('A phone number is required for a superuser.')
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('Superuser must have is_staff=True.')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('Superuser must have is_superuser=True.')
		return self._create_user(phone, password, **extra_fields)