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
from . import views
from users.views import NotificationsView

def redirect_to_login(request):
    return redirect('users:login')

def redirect_to_dashboard(request):
    return redirect('users:dashboard')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('dashboard/', redirect_to_dashboard, name='dashboard'),  # Specific redirect for dashboard
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('', views.home, name='home'),  # Home page
    path('customer/', include('customers.urls'))
]
