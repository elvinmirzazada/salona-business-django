from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('signup/', views.SignupView.as_view(), name='signup'),
    path('check-email/', views.CheckEmailView.as_view(), name='check_email'),
    path('terms-of-service/', views.TermsOfServiceView.as_view(), name='terms_of_service'),
    path('privacy-policy/', views.PrivacyPolicyView.as_view(), name='privacy_policy'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard'),
    path('notifications/', views.NotificationsView.as_view(), name='notifications'),
    path('settings/', views.SettingsView.as_view(), name='settings'),
    path('services/', views.ServicesView.as_view(), name='services'),
    path('staff/', views.StaffView.as_view(), name='staff'),
    path('customers/', views.CompanyCustomers.as_view(), name='customers'),
    path('membership-plans/', views.MembershipPlansView.as_view(), name='membership_plans'),
    path('integrations/', views.IntegrationsView.as_view(), name='integrations'),
    path('close-tab/', views.CloseTabView.as_view(), name='close_tab'),
    # Keep API proxy only for authenticated API calls (like /users/me)
    path('api/<path:path>', views.APIProxyView.as_view(), name='api_proxy'),
]
