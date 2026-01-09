from django.urls import path
from . import views

urlpatterns = [
    path('<str:company_id>/', views.booking, name='customers_booking'),
    path('<str:company_id>/single/', views.booking_single_page, name='customers_booking_single_page'),
    path('booking/<str:company_slug>/confirmation/', views.booking_confirmation, name='booking_confirmation'),
    path('accept/booking-terms/', views.booking_terms, name='booking_terms'),
    path('accept/booking-privacy/', views.booking_privacy, name='booking_privacy'),
    path('api/<path:path>', views.APIProxyView.as_view(), name='api_proxy'),
]
