from django.shortcuts import render
from django.views import View
from django.http import JsonResponse
import requests
from django.conf import settings

class LoginView(View):
    def get(self, request):
        # Since token is stored in localStorage, we can't check it server-side
        # The client-side JavaScript will handle the redirect if already authenticated
        return render(request, 'users/login.html')

class SignupView(View):
    def get(self, request):
        # Since token is stored in localStorage, we can't check it server-side
        # The client-side JavaScript will handle the redirect if already authenticated
        return render(request, 'users/signup.html')

class LogoutView(View):
    def get(self, request):
        # Get token from session or localStorage (will be handled by JS)
        return render(request, 'users/logout_redirect.html')

    def post(self, request):
        # Handle API logout
        try:
            # Get token from request headers (sent by JavaScript)
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            token = None

            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]

            # Also try to get from POST data as fallback
            if not token:
                token = request.POST.get('token')

            if token:
                # Make API call to logout endpoint
                api_url = getattr(settings, 'API_BASE_URL', 'https://api.salona.app') + '/api/v1/users/auth/logout'
                headers = {
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json'
                }

                response = requests.put(api_url, headers=headers)

                if response.status_code == 200:
                    return JsonResponse({'success': True, 'message': 'Logged out successfully'})
                else:
                    # Even if API call fails, we still logged out locally
                    return JsonResponse({'success': True, 'message': 'Logged out locally'})
            else:
                # No token found
                return JsonResponse({'success': True, 'message': 'Logged out'})

        except Exception as e:
            return JsonResponse({'success': True, 'message': 'Logged out locally'})

    def put(self, request):
        # Handle PUT request for logout
        return self.post(request)

class DashboardView(View):
    def get(self, request):
        # We'll rely on client-side authentication check instead
        # The JavaScript in dashboard.js will check localStorage for token
        # and redirect to login if not present
        return render(request, 'users/dashboard.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })

class SettingsView(View):
    def get(self, request):
        # Similar to dashboard, we'll rely on client-side authentication
        return render(request, 'users/settings.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })

class NotificationsView(View):
    def get(self, request):
        # Handle notifications page
        return render(request, 'notifications/notifications.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })
