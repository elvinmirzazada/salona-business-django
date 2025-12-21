import datetime
import json
from django.shortcuts import render, redirect
from django.views import View
from django.http import JsonResponse
import requests
from django.conf import settings
from .api_proxy import APIProxyView
from django.shortcuts import redirect


class GeneralView(View):

    @staticmethod
    def get_header():
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def get_tokens_from_request(self, request):
        """
        Get tokens from request, checking for refreshed tokens first
        Returns tuple: (access_token, refresh_token)
        """
        # Check if tokens were refreshed during this request
        if hasattr(request, '_refreshed_access_token'):
            return request._refreshed_access_token, request._refreshed_refresh_token
        
        # Otherwise get from cookies
        return request.COOKIES.get('access_token'), request.COOKIES.get('refresh_token')

    def set_refreshed_tokens(self, request, access_token, refresh_token):
        """Store refreshed tokens in request object for reuse during this request"""
        request._refreshed_access_token = access_token
        request._refreshed_refresh_token = refresh_token
        request._token_was_refreshed = True

    def refresh_access_token(self, request):
        """
        Attempt to refresh the access token using the refresh token
        Returns tuple: (success: bool, new_access_token: str or None, new_refresh_token: str or None)
        """
        # Check if we already refreshed the token during this request
        if hasattr(request, '_token_refresh_attempted'):
            if hasattr(request, '_refreshed_access_token'):
                return True, request._refreshed_access_token, request._refreshed_refresh_token
            else:
                return False, None, None
        
        # Mark that we're attempting to refresh
        request._token_refresh_attempted = True
        
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            return False, None, None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/auth/refresh-token"
            cookies = {'refresh_token': refresh_token}

            response = requests.post(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                timeout=10
            )

            if response.status_code == 200:
                # Extract tokens from response cookies, not from response body
                new_access_token = response.cookies.get('access_token')
                new_refresh_token = response.cookies.get('refresh_token')

                if new_access_token:
                    # Store refreshed tokens in request for reuse
                    self.set_refreshed_tokens(request, new_access_token, new_refresh_token)
                    return True, new_access_token, new_refresh_token

            return False, None, None

        except requests.exceptions.RequestException:
            return False, None, None

    def make_authenticated_request(self, request, url, method='GET', data=None, retry_count=0):
        """
        Make an authenticated API request with automatic token refresh
        Returns tuple: (success: bool, response_data: dict or None, updated_cookies: dict or None)
        """
        # Get tokens (either from cookies or from refreshed tokens in this request)
        access_token, _ = self.get_tokens_from_request(request)

        if not access_token:
            return False, None, None

        try:
            cookies = {'access_token': access_token}

            if method.upper() == 'GET':
                response = requests.get(url, headers=self.get_header(), cookies=cookies, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.get_header(), json=data, cookies=cookies, timeout=10)
            elif method.upper() == 'PUT':
                response = requests.put(url, headers=self.get_header(), json=data, cookies=cookies, timeout=10)
            else:
                return False, None, None

            # Check if access token has expired
            if response.status_code == 401 and retry_count == 0:
                try:
                    response_data = response.json()
                    detail = response_data.get('detail', '')

                    # Check if the error is due to expired access token
                    if 'Access token has expired' in detail or 'access token has expired' in detail.lower():
                        # Attempt to refresh the token (will reuse if already refreshed in this request)
                        success, new_access_token, new_refresh_token = self.refresh_access_token(request)

                        if success and new_access_token:
                            # Retry the request with new token
                            cookies = {'access_token': new_access_token}

                            if method.upper() == 'GET':
                                response = requests.get(url, headers=self.get_header(), cookies=cookies, timeout=10)
                            elif method.upper() == 'POST':
                                response = requests.post(url, headers=self.get_header(), json=data, cookies=cookies, timeout=10)
                            elif method.upper() == 'PUT':
                                response = requests.put(url, headers=self.get_header(), json=data, cookies=cookies, timeout=10)

                            if response.status_code == 200:
                                # Return success with new cookies
                                return True, response.json(), {
                                    'access_token': new_access_token,
                                    'refresh_token': new_refresh_token
                                }

                        # Token refresh failed
                        return False, None, None
                except:
                    pass

            # Normal response handling
            if response.status_code == 200:
                # Check if token was refreshed during this request
                if hasattr(request, '_token_was_refreshed'):
                    return True, response.json(), {
                        'access_token': request._refreshed_access_token,
                        'refresh_token': request._refreshed_refresh_token
                    }
                return True, response.json(), None

            return False, None, None

        except requests.exceptions.RequestException:
            return False, None, None

    def get_unread_notifications_count(self, request):
        """Get unread notifications count from external API"""
        api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/notifications/unread-count"

        success, response_data, updated_cookies = self.make_authenticated_request(request, api_url)

        if success and response_data:
            return response_data.get('data', {}).get('unread_count', 0)
        return 0

    def get_current_user(self, request):
        """Get current user data from external API"""
        api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/me"

        success, response_data, updated_cookies = self.make_authenticated_request(request, api_url)

        if success and response_data:
            data = response_data
            result = data.get('data').get('user', {})
            result['role_status'] = data.get('data').get('status', 'inactive')
            if result['role_status'] != 'active':
                result['company_id'] = None
            else:
                result['role'] = data.get('data').get('role', 'owner')
                result['company_id'] = data.get('data').get('company_id', None)
            # Update cookies in request if they were refreshed
            if updated_cookies:
                request.COOKIES['access_token'] = updated_cookies['access_token']
                if updated_cookies.get('refresh_token'):
                    request.COOKIES['refresh_token'] = updated_cookies['refresh_token']

            return result
        return None

    def user_has_company(self, user_data):
        """Check if user has a company"""
        if not user_data:
            return False
        return user_data.get('company_id') is not None

    def get_staff(self, request):
        """Get staff data from external API"""
        api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/users"

        success, response_data, updated_cookies = self.make_authenticated_request(request, api_url)

        if success and response_data:
            return response_data.get('data')
        return None


class LogoutView(View):
    def get(self, request):
        # Create redirect response to login page
        redirect_response = redirect('users:login')

        # Clear authentication cookies
        redirect_response.delete_cookie('access_token')
        redirect_response.delete_cookie('refresh_token')

        return redirect_response


class LoginView(GeneralView):
    def get(self, request):
        # Check if user is already authenticated
        access_token = request.COOKIES.get('access_token')
        if access_token:
            # Check if user has company using get_current_user
            user_data = self.get_current_user(request)
            if user_data:
                if not user_data.get('company_id'):
                    # User has no company, redirect to settings
                    return redirect('users:settings')
                # User has company, redirect to dashboard
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
                    # First, create a temporary response to set cookies
                    access_token = response.cookies.get('access_token')
                    refresh_token = response.cookies.get('refresh_token')

                    # Temporarily set cookies in the request to use get_current_user
                    request.COOKIES['access_token'] = access_token

                    # Now check if user has company using get_current_user
                    user_data = self.get_current_user(request)

                    # Determine redirect based on company_id
                    if user_data and user_data.get('company_id'):
                        redirect_response = redirect('users:dashboard')
                    else:
                        redirect_response = redirect('users:settings')

                    # Set HTTP-only cookies for authentication
                    redirect_response.set_cookie(
                        'access_token',
                        access_token,
                        httponly=True,
                        secure=not settings.DEBUG,
                        samesite='Strict',
                        max_age=3600 * 6  # 6 hours
                    )

                    if refresh_token:
                        redirect_response.set_cookie(
                            'refresh_token',
                            refresh_token,
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


class SignupView(GeneralView):
    def get(self, request):
        # Check if user is already authenticated
        access_token = request.COOKIES.get('access_token')
        if access_token:
            # Check if user has company using get_current_user
            user_data = self.get_current_user(request)
            if user_data:
                if not user_data.get('company_id'):
                    # User has no company, redirect to settings
                    return redirect('users:settings')
                # User has company, redirect to dashboard
                return redirect('users:dashboard')
        return render(request, 'users/signup.html')


class GoogleAuthCallbackView(GeneralView):
    """Handle Google OAuth callback and forward to API"""
    def get(self, request):
        # Get all query parameters from Google OAuth callback
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')

        # If there's an error from Google, redirect to log in with error message
        if error:
            return redirect(f"/users/login/?error={error}")

        # Prepare query parameters to forward to API
        query_params = {}
        if code:
            query_params['code'] = code
        if state:
            query_params['state'] = state

        try:
            # Call external API callback endpoint
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/auth/google/callback"

            response = requests.get(
                api_url,
                params=query_params,
                headers=self.get_header(),
                cookies=request.COOKIES,
                timeout=30,
                allow_redirects=False
            )

            # If successful, we should get cookies from the API
            if response.status_code == 200:
                # Check if we have the access token in cookies
                access_token = response.cookies.get('access_token')
                refresh_token = response.cookies.get('refresh_token')

                if access_token:
                    # Temporarily set cookies in the request to use get_current_user
                    request.COOKIES['access_token'] = access_token

                    # Check if user has company
                    user_data = self.get_current_user(request)

                    # Determine redirect based on company_id
                    if user_data and user_data.get('company_id'):
                        redirect_response = redirect('users:dashboard')
                    else:
                        redirect_response = redirect('users:settings')

                    # Determine if we're in production (secure) mode
                    is_secure = not settings.DEBUG

                    # Set HTTP-only cookies for authentication
                    # Use 'Lax' same site for OAuth flow to work properly with external redirects
                    redirect_response.set_cookie(
                        'access_token',
                        access_token,
                        httponly=True,
                        secure=is_secure,
                        samesite='Lax',  # Changed from 'Strict' to 'Lax' for OAuth
                        max_age=3600 * 6  # 6 hours
                    )

                    if refresh_token:
                        redirect_response.set_cookie(
                            'refresh_token',
                            refresh_token,
                            httponly=True,
                            secure=is_secure,
                            samesite='Lax',  # Changed from 'Strict' to 'Lax' for OAuth
                            max_age=3600 * 24  # 1 day
                        )

                    # Clear the OAuth state cookie after successful authentication
                    redirect_response.delete_cookie('google_oauth_state')

                    return redirect_response
                else:
                    return redirect('/users/login/?error=no_token')

            elif response.status_code in [301, 302, 303, 307, 308]:
                # Handle redirect from API
                redirect_url = response.headers.get('Location', '/users/login/')
                return redirect(redirect_url)
            else:
                # Handle error response
                data = response.json() if response.content else {}
                error_msg = data.get('message', 'authentication_failed')
                return redirect(f'/users/login/?error={error_msg}')

        except requests.exceptions.RequestException as e:
            return redirect('/users/login/?error=network_error')
        except Exception as e:
            return redirect('/users/login/?error=unexpected_error')


class CheckEmailView(View):
    """Display check email page after successful signup"""
    def get(self, request):
        email = request.GET.get('email', '')
        return render(request, 'users/check_email.html', {
            'email': email
        })


class TermsOfServiceView(View):
    """Display Terms of Service page"""
    def get(self, request):
        return render(request, 'users/terms_of_service.html')


class PrivacyPolicyView(View):
    """Display Privacy Policy page"""
    def get(self, request):
        return render(request, 'users/privacy_policy.html')


class DashboardView(GeneralView):
        
    def get_user_time_offs(self, request):
        """Get current user time offs from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            # Calculate start date (current week's Monday)
            today = datetime.datetime.now()
            # Monday is 0, Sunday is 6
            days_since_monday = today.weekday()
            start_date = today - datetime.timedelta(days=days_since_monday)
            start_date_str = start_date.strftime('%Y-%m-%d')

            query_params = {
                'start_date': start_date_str,
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
            # Calculate start date (3 days ago)
            start_date = datetime.datetime.now() - datetime.timedelta(days=3)
            start_date_str = start_date.strftime('%Y-%m-%d')

            query_params = {
                'start_date': start_date_str
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

            redirect_response = redirect('users:login')
            redirect_response.delete_cookie('access_token')
            redirect_response.delete_cookie('refresh_token')
            return redirect_response
        elif user_data.get('company_id') is None:
            # User has no company - redirect to settings
            return redirect('users:settings')

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
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve dashboard with user context
        return render(request, 'users/dashboard.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),
            'start_date': str(datetime.datetime.today() - datetime.timedelta(days=3)),
            'staff_data': staff_data,
            'staff_data_json': json.dumps(staff_data) if staff_data else json.dumps([]),
            'user_time_offs': user_time_offs,
            'user_time_offs_json': json.dumps(user_time_offs) if user_time_offs else json.dumps([]),
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', '')
        })


class SettingsView(GeneralView):

    def get_company_info(self, request):
        """Get company info from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get_company_emails(self, request):
        """Get company emails from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/emails"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get_company_phones(self, request):
        """Get company phones from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/phones"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

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

        if user_data and not user_data.get('company_id'):
            # User has no company - provide minimal context
            unread_notifications_count = self.get_unread_notifications_count(request)
            return render(request, 'users/settings.html', {
                'is_authenticated': True,
                'user_data': user_data,
                'user_data_json': json.dumps(user_data),
                'unread_notifications_count': unread_notifications_count,
                'company_id': '',
                'company_info': None,
                'company_info_json': json.dumps({}),
                'company_emails': None,
                'company_emails_json': json.dumps([]),
                'company_phones': None,
                'company_phones_json': json.dumps([]),
                'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me/api')
            })

        unread_notifications_count = self.get_unread_notifications_count(request)
        company_info = self.get_company_info(request)
        company_emails = self.get_company_emails(request)
        company_phones = self.get_company_phones(request)
        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                'unread_notifications_count': unread_notifications_count,
                'company_id': user_data.get('company_id', ''),
                'company_info': company_info,
                'company_emails': company_emails,
                'company_phones': company_phones,
            })

        # Token and user data are valid, serve dashboard with user context
        return render(request, 'users/settings.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),  # Add JSON serialized version
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', ''),
            'company_info': company_info,
            'company_info_json': json.dumps(company_info) if company_info else json.dumps({}),
            'company_emails': company_emails,
            'company_emails_json': json.dumps(company_emails) if company_emails else json.dumps([]),
            'company_phones': company_phones,
            'company_phones_json': json.dumps(company_phones) if company_phones else json.dumps([]),
            'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        })

    def post(self, request):
        """Handle company creation"""
        user_data = self.get_current_user(request)
        if not user_data:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        # Check if user already has a company
        if user_data.get('company_id'):
            return JsonResponse({'error': 'User already belongs to a company'}, status=400)

        access_token = request.COOKIES.get('access_token')

        try:
            # Parse JSON body
            body = json.loads(request.body) if request.body else {}

            # Prepare company data
            company_data = {
                'name': body.get('name', '').strip(),
                'type': body.get('type', '').strip(),
                'logo_url': body.get('logo_url', '').strip(),
                'website': body.get('website', '').strip(),
                'description': body.get('description', '').strip(),
                'team_size': int(body.get('team_size', 1))
            }

            # Validate required fields
            if not company_data['name']:
                return JsonResponse({'error': 'Company name is required'}, status=400)

            # Call external API to create company
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies"
            cookies = {'access_token': access_token}

            response = requests.post(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                json=company_data,
                timeout=30
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return JsonResponse({
                    'success': True,
                    'message': 'Company created successfully',
                    'data': data.get('data')
                })
            else:
                error_data = response.json() if response.content else {}
                return JsonResponse({
                    'success': False,
                    'message': error_data.get('message', 'Failed to create company')
                }, status=response.status_code)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': 'Network error. Please try again.'}, status=500)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


class NotificationsView(GeneralView):
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

        unread_notifications_count = self.get_unread_notifications_count(request)
        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                'unread_notifications_count': unread_notifications_count,
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve dashboard with user context
        return render(request, 'notifications/notifications.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),  # Add JSON serialized version
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', '')
        })


class ServicesView(GeneralView):
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

        unread_notifications_count = self.get_unread_notifications_count(request)
        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                'unread_notifications_count': unread_notifications_count,
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve services page with user context
        return render(request, 'users/services.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),  # Add JSON serialized version
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', ''),
            'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        })


class StaffView(GeneralView):

    def get(self, request):
        # Get current user data
        user_data = self.get_current_user(request)

        if not user_data:
            # No valid token or user data
            if request.headers.get('Accept') == 'application/json':
                return JsonResponse({'error': 'Authentication required'}, status=401)

            # Redirect to login for regular requests
            from django.shortcuts import redirect
            redirect_response = redirect('users:login')
            redirect_response.delete_cookie('access_token')
            redirect_response.delete_cookie('refresh_token')
            return redirect_response

        # Get staff data
        staff_data = self.get_staff(request)
        unread_notifications_count = self.get_unread_notifications_count(request)

        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                # 'staff_data': staff_data,
                'unread_notifications_count': unread_notifications_count,
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve staff page with user context
        return render(request, 'users/staff.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),
            # 'staff_data': staff_data,
            # 'staff_data_json': json.dumps(staff_data) if staff_data else json.dumps([]),
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', ''),
            'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        })

    def post(self, request):
        """Handle staff creation"""
        user_data = self.get_current_user(request)
        if not user_data:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        access_token = request.COOKIES.get('access_token')

        try:
            # Get form data
            staff_data = {
                'first_name': request.POST.get('first_name'),
                'last_name': request.POST.get('last_name'),
                'email': request.POST.get('email'),
                'phone': request.POST.get('phone'),
                'role': request.POST.get('role', 'staff'),
                'is_active': request.POST.get('is_active', 'true') == 'true'
            }

            # Call external API to create staff
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/users"
            cookies = {'access_token': access_token}

            response = requests.post(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                json=staff_data,
                timeout=30
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return JsonResponse({'success': True, 'data': data.get('data')})
            else:
                error_data = response.json() if response.content else {}
                return JsonResponse({
                    'error': error_data.get('message', 'Failed to create staff member')
                }, status=400)

        except requests.exceptions.RequestException:
            return JsonResponse({'error': 'Network error. Please try again.'}, status=500)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    def put(self, request):
        """Handle staff updates"""
        user_data = self.get_current_user(request)
        if not user_data:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        access_token = request.COOKIES.get('access_token')

        try:
            import json
            body = json.loads(request.body)
            staff_id = body.get('id')

            if not staff_id:
                return JsonResponse({'error': 'Staff ID is required'}, status=400)

            # Prepare update data
            update_data = {
                'first_name': body.get('first_name'),
                'last_name': body.get('last_name'),
                'email': body.get('email'),
                'phone': body.get('phone'),
                'role': body.get('role', 'staff'),
                'is_active': body.get('is_active', True)
            }

            # Call external API to update staff
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/users/{staff_id}"
            cookies = {'access_token': access_token}

            response = requests.put(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                json=update_data,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return JsonResponse({'success': True, 'data': data.get('data')})
            else:
                error_data = response.json() if response.content else {}
                return JsonResponse({
                    'error': error_data.get('message', 'Failed to update staff member')
                }, status=400)

        except requests.exceptions.RequestException:
            return JsonResponse({'error': 'Network error. Please try again.'}, status=500)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)

    def delete(self, request):
        """Handle staff deletion"""
        user_data = self.get_current_user(request)
        if not user_data:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        access_token = request.COOKIES.get('access_token')

        try:
            import json
            body = json.loads(request.body)
            staff_id = body.get('id')

            if not staff_id:
                return JsonResponse({'error': 'Staff ID is required'}, status=400)

            # Call external API to delete staff
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/users/{staff_id}"
            cookies = {'access_token': access_token}

            response = requests.delete(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                timeout=30
            )

            if response.status_code in [200, 204]:
                return JsonResponse({'success': True})
            else:
                error_data = response.json() if response.content else {}
                return JsonResponse({
                    'error': error_data.get('message', 'Failed to delete staff member')
                }, status=400)

        except requests.exceptions.RequestException:
            return JsonResponse({'error': 'Network error. Please try again.'}, status=500)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


class CompanyCustomers(GeneralView):

    def get_company_customers(self, request):
        """Get company customers from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies/customers"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

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

        unread_notifications_count = self.get_unread_notifications_count(request)
        customers_data = self.get_company_customers(request)
        # Check if this is an AJAX request
        if request.headers.get('Accept') == 'application/json':
            return JsonResponse({
                'user_data': user_data,
                'unread_notifications_count': unread_notifications_count,
                'customers_data': customers_data,
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve dashboard with user context
        return render(request, 'users/company_customers.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),  # Add JSON serialized version
            'customers_data': customers_data,
            'customers_data_json': json.dumps(customers_data if customers_data else []),
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', '')
        })


class MembershipPlansView(GeneralView):
    """View for displaying membership plans"""

    def get_membership_plans(self, request):
        """Get membership plans from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/memberships/plans"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

            if response.status_code == 200:
                data = response.json()
                return data.get('data')
            return None

        except requests.exceptions.RequestException:
            return None

    def get_active_plan(self, request):
        """Get active membership plan from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/memberships/active-plan"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

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
            # Redirect to login for regular requests
            redirect_response = redirect('users:login')
            redirect_response.delete_cookie('access_token')
            redirect_response.delete_cookie('refresh_token')
            return redirect_response

        unread_notifications_count = self.get_unread_notifications_count(request)

        # Check for active plan first
        active_plan = self.get_active_plan(request)

        # Get all available plans
        membership_plans = self.get_membership_plans(request)

        # Token and user data are valid, serve membership plans page
        return render(request, 'users/membership_plans.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),
            'active_plan': active_plan,
            'active_plan_json': json.dumps(active_plan if active_plan else None),
            'membership_plans': membership_plans,
            'membership_plans_json': json.dumps(membership_plans if membership_plans else []),
            'unread_notifications_count': unread_notifications_count,
            'company_id': user_data.get('company_id', '')
        })

    def post(self, request):
        """Handle checkout session creation"""
        user_data = self.get_current_user(request)
        if not user_data:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        access_token = request.COOKIES.get('access_token')

        try:
            # Extract plan ID from URL path
            # URL format: /users/membership-plans/
            # But we'll get the plan_id from the request body
            body = json.loads(request.body) if request.body else {}
            plan_id = body.get('plan_id')

            if not plan_id:
                return JsonResponse({'error': 'Plan ID is required'}, status=400)

            # Call external API to create checkout session
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/memberships/create-checkout-session/{plan_id}"
            cookies = {'access_token': access_token}

            response = requests.post(
                api_url,
                headers=self.get_header(),
                cookies=cookies,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                return JsonResponse(data)
            else:
                error_data = response.json() if response.content else {}
                return JsonResponse({
                    'error': error_data.get('message', 'Failed to create checkout session')
                }, status=response.status_code)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        except requests.exceptions.RequestException as e:
            return JsonResponse({'error': 'Network error. Please try again.'}, status=500)
        except Exception as e:
            return JsonResponse({'error': 'An unexpected error occurred.'}, status=500)


class IntegrationsView(GeneralView):
    """View for displaying integrations (booking URL and Telegram bot)"""

    def get_company_info(self, request):
        """Get company info from external API"""
        access_token = request.COOKIES.get('access_token')

        if not access_token:
            return None

        try:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/companies"
            cookies = {'access_token': access_token}

            response = requests.get(api_url, headers=self.get_header(), cookies=cookies, timeout=10)

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
            # Redirect to login for regular requests
            redirect_response = redirect('users:login')
            redirect_response.delete_cookie('access_token')
            redirect_response.delete_cookie('refresh_token')
            return redirect_response

        # Check if user has company
        if not user_data.get('company_id'):
            return redirect('users:settings')

        unread_notifications_count = self.get_unread_notifications_count(request)
        company_info = self.get_company_info(request)

        # Get company ID
        company_id = user_data.get('company_id', '')

        # Construct booking URL using current app's domain
        # Get the scheme (http or https) and host from the current request
        scheme = 'https' if request.is_secure() else 'http'
        host = request.get_host()  # This includes the domain and port if present
        booking_url = f"{scheme}://{host}/customers/{company_id}"

        # Token and user data are valid, serve integrations page
        return render(request, 'users/integrations.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),
            'unread_notifications_count': unread_notifications_count,
            'company_id': company_id,
            'booking_url': booking_url,
            'company_info': company_info,
            'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        })


class CloseTabView(View):
    """View that automatically closes the browser tab when accessed"""

    def get(self, request):
        """Render a page that automatically closes the tab"""
        # Get optional message and status from query parameters
        message = request.GET.get('message', 'Operation completed successfully')
        status = request.GET.get('status', 'success')  # success, error, cancel

        return render(request, 'users/close_tab.html', {
            'message': message,
            'status': status
        })


class AcceptInvitationView(View):
    """View for accepting invitation links"""

    def get(self, request):
        """Render the accept invitation page"""
        return render(request, 'users/accept_invitation.html')
