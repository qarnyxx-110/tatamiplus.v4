from django.urls import path

from . import views

app_name = 'orders'

urlpatterns = [
	path('checkout/address/', views.address_step, name='address'),
	path('checkout/review/', views.review, name='review'),
	path('checkout/pay/', views.pay, name='pay'),
	path('payment/callback/', views.payment_callback, name='callback'),
	path('payment/mock/<str:authority>/', views.mock_gateway, name='mock_gateway'),
	path('orders/', views.order_list, name='list'),
	path('orders/<str:number>/', views.order_detail, name='detail'),
]
