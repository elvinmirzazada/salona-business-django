from django.urls import path
from . import views

urlpatterns = [
    path('<str:company_id>/', views.booking, name='customers_booking'),
    path('<str:company_id>/single/', views.booking_single_page, name='customers_booking_single_page'),
    path('booking/<str:company_id>/confirmation/', views.booking_confirmation, name='booking_confirmation'),
    path('api/<path:path>', views.APIProxyView.as_view(), name='api_proxy'),
]
