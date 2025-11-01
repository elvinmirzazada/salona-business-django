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
                result = data.get('data').get('user', {})
                result['role'] = data.get('data').get('role', '')
                return result
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
                'company_id': user_data.get('company_id', '')
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
                'staff_data': staff_data,
                'unread_notifications_count': unread_notifications_count,
                'company_id': user_data.get('company_id', '')
            })

        # Token and user data are valid, serve staff page with user context
        return render(request, 'users/staff.html', {
            'is_authenticated': True,
            'user_data': user_data,
            'user_data_json': json.dumps(user_data),
            'staff_data': staff_data,
            'staff_data_json': json.dumps(staff_data) if staff_data else json.dumps([]),
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
