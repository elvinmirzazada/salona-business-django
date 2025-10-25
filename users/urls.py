from django.urls import path
from . import views
from .api_proxy import APIProxyView, logout_proxy

app_name = 'users'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('signup/', views.SignupView.as_view(), name='signup'),
    path('logout/', logout_proxy, name='logout'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('settings/', views.SettingsView.as_view(), name='settings'),
    path('notifications/', views.NotificationsView.as_view(), name='notifications'),
    # API proxy routes
    path('api/<path:path>', APIProxyView.as_view(), name='api_proxy'),
]
