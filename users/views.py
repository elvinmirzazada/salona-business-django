import datetime
import json
from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
import requests
from django.conf import settings
from .api_proxy import APIProxyView


class GeneralView(View):

    @staticmethod
    def get_header():
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def get_unread_notifications_count(self, request):
        """Get unread notifications count from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return 0

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/notifications/unread-count"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data', {}).get('unread_count', 0)
            return 0

        except requests.exceptions.RequestException:
            return 0


class LogoutView(View):
    def get(self, request):
        # Create redirect response to login page
        redirect_response = redirect('users:login')

        # Clear authentication cookies
        redirect_response.delete_cookie('access_token')
        redirect_response.delete_cookie('refresh_token')

        return redirect_response


class LoginView(View):
    def get(self, request):
        # Check if user is already authenticated
        access_token = request.COOKIES.get('access_token')
        if access_token:
            # User is already logged in, redirect to dashboard
            return redirect('users:dashboard')

        return render(request, 'users/login.html')

    def post(self, request):
        """Handle login form submission"""
        # Get form data
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')

        # Validate input
        if not email or not password:
            return render(request, 'users/login.html', {
                'error': 'Please enter both email and password.'
            })

        # Prepare login data
        login_data = {
            'email': email,
            'password': password
        }

        try:
            # Call external API login endpoint
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/auth/login"
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }

            response = requests.post(
                api_url,
                headers=headers,
                json=login_data,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()

                # Check if we have the access token
                if data.get('success') and response.cookies.get('access_token'):
                    # Create redirect response to dashboard
                    redirect_response = redirect('users:dashboard')

                    # Set HTTP-only cookies for authentication
                    redirect_response.set_cookie(
                        'access_token',
                        response.cookies.get('access_token'),
                        httponly=True,
                        secure=not settings.DEBUG,
                        samesite='Strict',
                        max_age=3600 * 6  # 6 hours
                    )

                    if response.cookies.get('refresh_token'):
                        redirect_response.set_cookie(
                            'refresh_token',
                            response.cookies.get('refresh_token'),
                            httponly=True,
                            secure=not settings.DEBUG,
                            samesite='Strict',
                            max_age=3600 * 24  # 1 day
                        )

                    return redirect_response
                else:
                    return render(request, 'users/login.html', {
                        'error': 'Login successful, but no token received. Please try again.'
                    })
            else:
                # Handle error response
                data = response.json() if response.content else {}
                error_msg = data.get('message', 'Login failed. Please check your credentials.')
                return render(request, 'users/login.html', {
                    'error': error_msg
                })

        except requests.exceptions.RequestException:
            return render(request, 'users/login.html', {
                'error': 'Network error. Please try again later.'
            })
        except Exception as e:
            return render(request, 'users/login.html', {
                'error': 'An unexpected error occurred. Please try again.'
            })

class SignupView(View):
    def get(self, request):
        return render(request, 'users/signup.html')

class DashboardView(GeneralView):

    def get_current_user(self, request):
        """Get current user data from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/me"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get_staff(self, request):
        """Get current user data from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/users"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None
        
    def get_user_time_offs(self, request):
        """Get current user time offs from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            query_params = {
                'start_date': datetime.datetime.now() - 3 * datetime.timedelta(days=1),
                'availability_type': 'weekly'
            }
            
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/time-offs"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, params=query_params, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get_bookings(self, request):
        """Get current user bookings from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            query_params = {
                'start_date': str(datetime.datetime.today() - 3 * datetime.timedelta(days=1))
            }

            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/bookings"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, params=query_params, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get(self, request):
        # Get current user data
        user_data = self.get_current_user(request)

        if not user_data:
            # No valid token or user data
            if request.headers.get('Accept') == 'application/json':
                # Return JSON response for AJAX requests
                return JsonResponse({'error': 'Authentication required'}, status=401)

            # Redirect to login for regular requests
            from django.shortcuts import redirect
            redirect_response = redirect('users:login')
            redirect_response.delete_cookie('access_token')
            redirect_response.delete_cookie('refresh_token')
            return redirect_response

        staff_data = self.get_staff(request)
        unread_notifications_count = self.get_unread_notifications_count(request)
        user_time_offs = self.get_user_time_offs(request)

        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                'staff_data': staff_data,
                'user_time_offs': user_time_offs,
                'unread_notifications_count': unread_notifications_count,
                'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'
            })

        # Token and user data are valid, serve dashboard with user context
        return render(request, 'users/dashboard.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),  # Add JSON serialized version
            'staff_data': staff_data,
            'staff_data_json': json.dumps(staff_data) if staff_data else json.dumps([]),
            'user_time_offs': user_time_offs,
            'user_time_offs_json': json.dumps(user_time_offs) if user_time_offs else json.dumps([]),
            # 'bookings': bookings,
            # 'bookings_json': json.dumps(bookings) if bookings else json.dumps([]),
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', '')
        })

class SettingsView(View):
    def get(self, request):
        # Server-side authentication check using cookies
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            # No token found, redirect to login
            from django.shortcuts import redirect
            return redirect('users:login')

        # Verify token with external API
        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/me"
            headers = {'Content-Type': 'application/json'}
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=headers, cookies=cookies, timeout=10)

            if response.status_code != 200:
                # Token is invalid, redirect to login
                from django.shortcuts import redirect
                return redirect('users:login')

        except requests.exceptions.RequestException:
            # API call failed, redirect to login for security
            from django.shortcuts import redirect
            return redirect('users:login')

        # Token is valid, serve settings
        return render(request, 'users/settings.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })

class NotificationsView(View):
    def get(self, request):
        # Server-side authentication check using cookies
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            # No token found, redirect to login
            from django.shortcuts import redirect
            return redirect('users:login')

        # Verify token with external API
        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/me"
            headers = {'Content-Type': 'application/json'}
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=headers, cookies=cookies, timeout=10)

            if response.status_code != 200:
                # Token is invalid, redirect to login
                from django.shortcuts import redirect
                return redirect('users:login')

        except requests.exceptions.RequestException:
            # API call failed, redirect to login for security
            from django.shortcuts import redirect
            return redirect('users:login')

        return render(request, 'notifications/notifications.html', {
            'is_authenticated': True,
            'company_id': 'fad78242-ba41-4acf-a14d-8dc59f6e8338'  # TODO: Replace with actual company ID logic
        })
