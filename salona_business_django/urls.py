"""
URL configuration for salona_business_django project.

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
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.views.generic import TemplateView
from django.conf.urls.i18n import i18n_patterns
from . import views
from users.views import NotificationsView

def redirect_to_login(request):
    return redirect('users:login')

def redirect_to_dashboard(request):
    return redirect('users:dashboard')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),  # Language switching endpoint
    path('users/', include('users.urls')),
    path('', views.home, name='home'),  # Home page
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify_email'),
    path('customers/', include('customers.urls')),
    path('book/<str:company_slug>/', views.booking, name='booking_appointment'),
    path('book/<str:company_slug>/confirmation/', views.booking_confirmation, name='booking_confirmation'),
]
