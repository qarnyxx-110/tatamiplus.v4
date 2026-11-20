from django.dispatch import Signal

# Sent inside the settlement transaction once a payment is verified and the
# money is considered received. Receivers fulfil whatever the payment was for
# (an order, a course enrollment) by reading `payment.metadata`.
#
# A signal is used instead of a direct import so `orders` does not have to know
# that `club` exists. The dependency only points one way: club -> orders.
payment_succeeded = Signal()
