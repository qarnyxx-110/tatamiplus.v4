import logging

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class ConsoleSMSBackend:
	def send_otp(self, phone, code):
		if not settings.DEBUG:
			raise ImproperlyConfigured('Console SMS delivery is only available in DEBUG mode.')
		logger.warning('DEV OTP for %s: %s', phone[-4:].rjust(len(phone), '*'), code)


class FakeSMSBackend:
	messages = []

	def send_otp(self, phone, code):
		self.messages.append((phone, code))