"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView

from accounts import views as account_views

urlpatterns = [
    path('', TemplateView.as_view(template_name='pages/home.html'), name='home'),
    path('coaches/', include('coaches.urls')),
    path('store/', include('store.urls')),
    path('', include('orders.urls')),
    path('club/', include('club.urls')),
    path('blog/', include('blog.urls')),
    path('coach/', include('club.coach_urls')),
    path('coach/', include('coaches.coach_urls')),
    path('account/gems/', include('gems.urls')),
    path('account/', account_views.account, name='account'),
    path('accounts/', include('accounts.urls')),
    path('auth/', include('accounts.auth_urls')),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
