"""Gateway contract.

Every gateway module exposes one class with two methods. The shape follows
what Iranian providers (Zarinpal, Zibal, IDPay) actually do:

1. server-to-server request -> an authority token plus a URL the user is
   redirected to;
2. the provider redirects back to our callback with a status;
3. server-to-server verify -> either an error or a reference id.

Keeping these three phases separate is what lets an order stay
`pending_payment` while the user is away at the gateway, and what makes the
callback safe to receive more than once.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class PaymentRequest:
	authority: str
	redirect_url: str


@dataclass(frozen=True)
class VerifyResult:
	ok: bool
	ref_id: str = ''
	raw: dict = field(default_factory=dict)


class BaseGateway:
	name = 'base'
	is_mock = False

	def request_payment(self, *, amount, description, callback_url):
		raise NotImplementedError

	def verify_payment(self, *, authority, amount, callback_data):
		"""`callback_data` is the query payload the provider sent back.

		Real gateways verify by calling their API; the mock decides from the
		payload. Both receive it so neither call site has to special-case.
		"""
		raise NotImplementedError
