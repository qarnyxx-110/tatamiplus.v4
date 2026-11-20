from django.urls import path

from . import views

app_name = 'club'

urlpatterns = [
	path('', views.course_list, name='course_list'),
	path('coach/<int:profile_id>/', views.coach_detail, name='coach_detail'),
	# <str:slug>, not <slug:slug>: the built-in slug converter is ASCII-only,
	# while course slugs keep their Persian letters (allow_unicode=True).
	path('course/<str:slug>/', views.course_detail, name='course_detail'),
	path('course/<str:slug>/buy/', views.buy_course, name='buy_course'),
	path('episode/<int:pk>/', views.episode_play, name='episode_play'),
	path('episode/<int:pk>/complete/', views.episode_complete, name='episode_complete'),
	path('episode/<int:pk>/stream/', views.episode_stream, name='episode_stream'),
]
