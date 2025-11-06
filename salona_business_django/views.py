"""
Views for the main Salona application
"""
from django.shortcuts import render
from django.views import View
import requests
from django.conf import settings

def home(request):
    """Home page view for Salona business management system"""
    context = {
        'page_title': 'Salona - Professional Beauty Business Management',
        'features': [
            {
                'title': 'Smart Booking System',
                'description': 'Effortless appointment scheduling with automated confirmations and reminders',
                'icon': 'fas fa-calendar-alt'
            },
            {
                'title': 'Client Management', 
                'description': 'Comprehensive customer profiles with service history and preferences',
                'icon': 'fas fa-users'
            },
            {
                'title': 'Staff Coordination',
                'description': 'Manage your team schedules, services, and availability seamlessly',
                'icon': 'fas fa-user-friends'
            },
            {
                'title': 'Service Catalog',
                'description': 'Organize your treatments, pricing, and service packages professionally',
                'icon': 'fas fa-cut'
            },
            {
                'title': 'Real-time Notifications',
                'description': 'Stay updated with instant notifications for bookings and business activities',
                'icon': 'fas fa-bell'
            },
            {
                'title': 'Analytics Dashboard',
                'description': 'Track performance, revenue, and business insights with detailed analytics',
                'icon': 'fas fa-chart-line'
            }
        ]
    }
    return render(request, 'home/index.html', context)


class VerifyEmailView(View):
    """Handle email verification"""

    def get(self, request):
        """Display verification page and call verification endpoint"""
        token = request.GET.get('token')

        if not token:
            return render(request, 'users/verify_email.html', {
                'success': False,
                'message': 'Invalid verification link. No token provided.'
            })

        # Call the verification API
        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/auth/verify_email"
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }

            verification_data = {
                'token': token
            }

            response = requests.post(
                api_url,
                headers=headers,
                json=verification_data,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return render(request, 'users/verify_email.html', {
                    'success': True,
                    'message': data.get('message', 'Email verified successfully! You can now log in.')
                })
            else:
                # Handle error response
                try:
                    error_data = response.json()
                    error_message = error_data.get('message', 'Verification failed. Please try again or request a new verification link.')
                except:
                    error_message = 'Verification failed. Please try again or request a new verification link.'

                return render(request, 'users/verify_email.html', {
                    'success': False,
                    'message': error_message
                })

        except requests.exceptions.RequestException as e:
            return render(request, 'users/verify_email.html', {
                'success': False,
                'message': 'Unable to connect to verification service. Please try again later.'
            })

