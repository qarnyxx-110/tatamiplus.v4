from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string


class PaymentGatewayError(Exception):
	"""Raised when the gateway cannot be reached or answers unpredictably."""


# Short names stored on Payment records. A Payment keeps the short name, and
# this registry resolves it back to an importable class on the callback.
GATEWAY_REGISTRY = {
	'mock': 'orders.gateways.mock.MockGateway',
}


def get_gateway(name=None):
	"""Return the configured gateway instance.

	The path comes from PAYMENT_GATEWAY so switching to a real provider is a
	settings change plus one new module, not a change to the checkout views.
	Accepts either a short registry name or a dotted path.
	"""
	configured = name or settings.PAYMENT_GATEWAY
	path = GATEWAY_REGISTRY.get(configured, configured)
	gateway = import_string(path)()
	if gateway.is_mock and not settings.PAYMENT_ALLOW_MOCK:
		raise ImproperlyConfigured(
			'The mock payment gateway is not allowed here. '
			'Set PAYMENT_GATEWAY to the real provider, or PAYMENT_ALLOW_MOCK=True in development.'
		)
	return gateway
