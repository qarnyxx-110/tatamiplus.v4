from django.urls import path

from . import views

app_name = 'coach_panel'

urlpatterns = [
	path('courses/', views.course_dashboard, name='course_list'),
	path('courses/new/', views.course_create, name='course_create'),
	path('courses/<int:pk>/edit/', views.course_edit, name='course_edit'),
	path('courses/<int:course_pk>/episodes/new/', views.episode_create, name='episode_create'),
	path('episodes/<int:pk>/edit/', views.episode_edit, name='episode_edit'),
]
