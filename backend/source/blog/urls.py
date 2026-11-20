from django.urls import path

from . import views

app_name = 'blog'

urlpatterns = [
	path('', views.post_list, name='list'),
	# Slugs may contain Persian letters, so this deliberately uses the
	# permissive <str:slug> converter instead of ASCII-only <slug:slug>.
	path('<str:slug>/', views.post_detail, name='detail'),
]
