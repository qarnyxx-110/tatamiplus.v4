from django.urls import path

from . import views

app_name = 'coaches'

urlpatterns = [
	path('', views.directory, name='directory'),
	path('apply/', views.apply, name='apply'),
	path('application/', views.application_status, name='application_status'),
	path('portfolio/', views.portfolio, name='portfolio'),
	path('join/', views.enter_code, name='enter_code'),
	path('join/<str:code>/', views.join_coach, name='join_coach'),
	path('portfolios/<int:portfolio_id>/certificate/', views.certificate_download, name='certificate_download'),
	path('<int:profile_id>/', views.profile_detail, name='profile_detail'),
]
