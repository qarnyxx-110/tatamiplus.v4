from django.urls import path

from . import views

app_name = 'phone_auth'

urlpatterns = [
	path('login/', views.password_login, name='login'),
	path('login/sms/', views.phone_login, name='sms_login'),
	path('password/reset/', views.password_reset, name='password_reset'),
	path('password/reset/confirm/', views.password_reset_confirm, name='password_reset_confirm'),
	path('password/set/', views.set_password, name='set_password'),
	path('otp/send/', views.send_otp_view, name='send_otp'),
	path('otp/verify/', views.verify_otp_view, name='verify_otp'),
	path('complete-profile/', views.complete_profile, name='complete_profile'),
]
