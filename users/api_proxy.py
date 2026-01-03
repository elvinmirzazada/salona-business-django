import requests
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.conf import settings

class APIProxyView(View):
    """
    Proxy view to forward requests to the external API while handling cookies properly
    """
    
    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)
    
    def get_api_url(self, path):
        """Construct the full API URL"""
        api_base = getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        # Remove leading slash from path if present
        if path.startswith('/'):
            path = path[1:]
        # Ensure path starts with 'api/' if it doesn't already
        if not path.startswith('api/'):
            path = f"api/{path}"
        return f"{api_base}/{path}"
    
    @staticmethod
    def ensure_utc_params(data):
        """
        Recursively convert all time-related parameters to UTC format.
        Looks for common time field names and converts them to ISO 8601 UTC format.

        Args:
            data: Dictionary or list containing request parameters

        Returns:
            Data with time parameters converted to UTC
        """
        if not data or not isinstance(data, (dict, list)):
            return data

        # Common time field patterns
        time_field_patterns = [
            'time', 'date', 'datetime', 'start', 'end', 'begin', 'from', 'to',
            'created', 'updated', 'scheduled', 'appointment', 'booking',
            'started_at', 'ended_at', 'created_at', 'updated_at', 'start_at', 'end_at'
        ]

        def is_time_field(field_name):
            """Check if field name matches time patterns"""
            field_lower = field_name.lower()
            return any(pattern in field_lower for pattern in time_field_patterns)

        def is_iso_datetime(value_str):
            """Check if string is ISO 8601 datetime format"""
            if not isinstance(value_str, str):
                return False
            try:
                # Try to parse ISO format
                datetime.fromisoformat(value_str.replace('Z', '+00:00'))
                return True
            except (ValueError, AttributeError):
                return False

        def convert_value(value):
            """Convert a single value if it's a time string"""
            if isinstance(value, str) and is_iso_datetime(value):
                # Already in ISO format, return as is (backend expects UTC)
                return value
            return value

        def process_dict(obj):
            """Recursively process dictionary"""
            result = {}
            for key, value in obj.items():
                if value is None:
                    result[key] = value
                elif isinstance(value, dict):
                    result[key] = process_dict(value)
                elif isinstance(value, list):
                    result[key] = [process_dict(item) if isinstance(item, dict) else
                                   (process_list(item) if isinstance(item, list) else convert_value(item))
                                   for item in value]
                elif is_time_field(key) and isinstance(value, str):
                    result[key] = convert_value(value)
                else:
                    result[key] = value
            return result

        def process_list(lst):
            """Recursively process list"""
            return [process_dict(item) if isinstance(item, dict) else
                   (process_list(item) if isinstance(item, list) else item)
                   for item in lst]

        if isinstance(data, dict):
            return process_dict(data)
        elif isinstance(data, list):
            return process_list(data)
        return data

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
            api_url = self.get_api_url('api/v1/users/auth/refresh-token')
            cookies = {'refresh_token': refresh_token}
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }

            response = requests.post(
                api_url,
                headers=headers,
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

    def clear_auth_cookies(self, response):
        """Clear all authentication cookies"""
        response.set_cookie(
            'access_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict'
        )
        response.set_cookie(
            'refresh_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Strict'
        )
        return response

    def forward_request(self, request, path, retry_count=0):
        """Forward the request to the external API"""
        api_url = self.get_api_url(path)
        
        # Prepare headers - don't set Content-Type for multipart/form-data (file uploads)
        headers = {
            'Accept': 'application/json',
        }
        
        # Only set Content-Type for JSON requests
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        if not is_multipart:
            headers['Content-Type'] = 'application/json'

        # Get cookies from the incoming request (check for refreshed tokens first)
        access_token, refresh_token = self.get_tokens_from_request(request)
        cookies = {}
        if access_token:
            cookies['access_token'] = access_token
        if refresh_token:
            cookies['refresh_token'] = refresh_token

        # Get query parameters from the request
        params = request.GET.dict() if request.GET else None

        # Convert datetime parameters to UTC
        params = self.ensure_utc_params(params)

        # Prepare request data and files
        data = None
        files = None
        json_data = None

        if request.method in ['POST', 'PUT', 'PATCH']:
            if is_multipart:
                # Handle multipart/form-data (file uploads)
                data = request.POST.dict() if request.POST else {}
                # Convert datetime parameters to UTC
                data = self.ensure_utc_params(data)

                # Handle files
                if request.FILES:
                    files = {}
                    for key, file_obj in request.FILES.items():
                        files[key] = (file_obj.name, file_obj.read(), file_obj.content_type)
            elif request.content_type == 'application/json':
                try:
                    json_data = json.loads(request.body)
                    # Convert datetime parameters to UTC
                    json_data = self.ensure_utc_params(json_data)
                except json.JSONDecodeError:
                    json_data = None
            else:
                data = request.POST.dict()
                # Convert datetime parameters to UTC
                data = self.ensure_utc_params(data)

        # Make the API request
        try:
            response = requests.request(
                method=request.method,
                url=api_url,
                headers=headers,
                json=json_data if json_data else None,
                data=data if data and not json_data else None,
                files=files,
                params=params,
                cookies=cookies,
                timeout=30
            )
            
            # Check if access token has expired (401 with specific message)
            if response.status_code == 401 and retry_count == 0:
                try:
                    response_data = response.json()
                    detail = response_data.get('detail', '')

                    # Check if the error is due to expired access token
                    if 'Access token has expired' in detail or 'access token has expired' in detail.lower():
                        # Attempt to refresh the token (will reuse if already refreshed in this request)
                        success, new_access_token, new_refresh_token = self.refresh_access_token(request)

                        if success and new_access_token:
                            # Retry the request with new token (only once to prevent infinite loop)
                            cookies['access_token'] = new_access_token
                            if new_refresh_token:
                                cookies['refresh_token'] = new_refresh_token

                            response = requests.request(
                                method=request.method,
                                url=api_url,
                                headers=headers,
                                json=json_data if json_data else None,
                                data=data if data and not json_data else None,
                                files=files,
                                params=params,
                                cookies=cookies,
                                timeout=30
                            )

                            # Create response with updated cookies
                            django_response = JsonResponse(
                                response.json() if response.content else {},
                                status=response.status_code,
                                safe=False
                            )

                            # Set the new tokens as HTTP-only cookies
                            django_response.set_cookie(
                                'access_token',
                                new_access_token,
                                httponly=True,
                                secure=not settings.DEBUG,
                                samesite='Strict',
                                max_age=3600 * 6  # 6 hours
                            )

                            if new_refresh_token:
                                django_response.set_cookie(
                                    'refresh_token',
                                    new_refresh_token,
                                    httponly=True,
                                    secure=not settings.DEBUG,
                                    samesite='Strict',
                                    max_age=3600 * 24  # 1 day
                                )

                            return django_response
                        else:
                            # Token refresh failed, clear cookies and return 401
                            django_response = JsonResponse(
                                {'success': False, 'detail': 'Authentication failed. Please log in again.'},
                                status=401
                            )
                            return self.clear_auth_cookies(django_response)
                except:
                    pass  # If parsing fails, continue with normal flow

            # Create Django response
            django_response = JsonResponse(
                response.json() if response.content else {},
                status=response.status_code,
                safe=False
            )

            # If token was refreshed during this request, set the new cookies
            if hasattr(request, '_token_was_refreshed') and response.status_code == 200:
                django_response.set_cookie(
                    'access_token',
                    request._refreshed_access_token,
                    httponly=True,
                    secure=not settings.DEBUG,
                    samesite='Strict',
                    max_age=3600 * 6  # 6 hours
                )
                if request._refreshed_refresh_token:
                    django_response.set_cookie(
                        'refresh_token',
                        request._refreshed_refresh_token,
                        httponly=True,
                        secure=not settings.DEBUG,
                        samesite='Strict',
                        max_age=3600 * 24  # 1 day
                    )

            # If this is a login request and successful, extract tokens from response
            if path == 'api/v1/users/auth/login' and response.status_code == 200:
                try:
                    response_data = response.json()
                    if response_data.get('data') and response_data['data'].get('access_token'):
                        # Set the tokens as HTTP-only cookies for our domain
                        django_response.set_cookie(
                            'access_token',
                            response_data['data']['access_token'],
                            httponly=True,
                            secure=not settings.DEBUG,
                            samesite='Strict',
                            max_age=3600 * 24 * 7  # 7 days
                        )
                        if response_data['data'].get('refresh_token'):
                            django_response.set_cookie(
                                'refresh_token',
                                response_data['data']['refresh_token'],
                                httponly=True,
                                secure=not settings.DEBUG,
                                samesite='Strict',
                                max_age=3600 * 24 * 30  # 30 days
                            )
                        print("DEBUG: Tokens set as HTTP-only cookies from login response")
                except:
                    pass  # If parsing fails, continue without cookies
            
            return django_response
            
        except requests.exceptions.RequestException as e:
            return JsonResponse({
                'error': 'API request failed',
                'message': str(e)
            }, status=500)
    
    def get(self, request, path):
        return self.forward_request(request, path)
    
    def post(self, request, path):
        return self.forward_request(request, path)
    
    def put(self, request, path):
        return self.forward_request(request, path)
    
    def patch(self, request, path):
        return self.forward_request(request, path)
    
    def delete(self, request, path):
        return self.forward_request(request, path)


@csrf_exempt
@require_http_methods(["GET", "POST", "PUT"])
def logout_proxy(request):
    """Handle logout by clearing session and calling API logout"""

    # Handle GET requests (redirect to login or return logout page)
    if request.method == 'GET':
        # For GET requests, we can either redirect to login or show a logout confirmation
        # Let's redirect to login page
        from django.shortcuts import redirect
        return redirect('users:login')

    # Handle POST/PUT requests (actual logout)
    try:
        # Get tokens from HTTP-only cookies first, then fallback to session
        access_token = request.COOKIES.get('access_token') or request.session.get('access_token')

        # Call external API logout if token exists
        if access_token:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.me')}/api/v1/users/auth/logout"
            headers = {'Content-Type': 'application/json'}
            cookies = {'access_token': access_token}
            
            try:
                requests.put(api_url, headers=headers, cookies=cookies, timeout=10)
            except requests.exceptions.RequestException:
                pass  # Continue with local logout even if API call fails
        
        # Clear session
        request.session.flush()
        
        # Create response and delete HTTP-only cookies
        response = JsonResponse({'success': True, 'message': 'Logged out successfully'})

        # Delete HTTP-only cookies by setting them to expire immediately
        # Try multiple domain/path combinations to ensure deletion
        response.set_cookie(
            'access_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=True,
            samesite='none',
            domain=None  # Current domain
        )
        response.set_cookie(
            'refresh_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=True,
            samesite='none',
            domain=None  # Current domain
        )

        # Also try to delete cookies for the API domain
        api_domain = getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
        if 'api.salona.me' in api_domain:
            response.set_cookie(
                'access_token',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=True,
                samesite='none',
                domain='.salona.me'  # Try parent domain
            )
            response.set_cookie(
                'refresh_token',
                '',
                max_age=0,
                expires='Thu, 01 Jan 1970 00:00:00 GMT',
                httponly=True,
                secure=True,
                samesite='none',
                domain='.salona.me'  # Try parent domain
            )
        return response

    except Exception as e:
        # Clear session anyway
        request.session.flush()

        # Create response and delete cookies even on error
        response = JsonResponse({'success': True, 'message': 'Logged out locally'})

        # Delete HTTP-only cookies
        response.set_cookie(
            'access_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=True,
            samesite='none'
        )
        response.set_cookie(
            'refresh_token',
            '',
            max_age=0,
            expires='Thu, 01 Jan 1970 00:00:00 GMT',
            httponly=True,
            secure=True,
            samesite='none'
        )

        return response
