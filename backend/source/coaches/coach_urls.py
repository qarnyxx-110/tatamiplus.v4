from django.urls import path

from . import views

app_name = 'coach_students'

urlpatterns = [
	path('students/', views.coach_students, name='list'),
	path('students/invites/<int:pk>/toggle/', views.toggle_invite, name='toggle_invite'),
]
