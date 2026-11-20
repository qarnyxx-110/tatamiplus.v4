from django.urls import path

from . import views

app_name = 'gems'

urlpatterns = [
	path('', views.history, name='history'),
]
