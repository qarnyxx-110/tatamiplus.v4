import uuid

from django.urls import reverse

from .base import BaseGateway, PaymentRequest, VerifyResult


class MockGateway(BaseGateway):
	"""Sandbox gateway: never moves money, but follows the real protocol.

	It sends the shopper to a local page with "pay" and "fail" buttons. Each
	button returns to the callback with the same `Authority`/`Status` parameter
	names a real provider would use, so the checkout code cannot tell the
	difference.
	"""

	name = 'mock'
	is_mock = True

	def request_payment(self, *, amount, description, callback_url):
		authority = uuid.uuid4().hex
		return PaymentRequest(
			authority=authority,
			redirect_url=reverse('orders:mock_gateway', args=[authority]),
		)

	def verify_payment(self, *, authority, amount, callback_data):
		status = (callback_data.get('Status') or '').upper()
		ok = status == 'OK' and bool(authority)
		return VerifyResult(
			ok=ok,
			ref_id=f'MOCK-{uuid.uuid4().hex[:10].upper()}' if ok else '',
			raw={
				'gateway': self.name,
				'StatusCode': 100 if ok else -20,
				'Authority': authority,
				'Status': status,
				'amount': str(amount),
			},
		)
