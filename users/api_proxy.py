import requests
import json
from django.http import JsonResponse, HttpResponse
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
    
    def forward_request(self, request, path):
        """Forward the request to the external API"""
        api_url = self.get_api_url(path)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        # Get cookies from the incoming request
        cookies = {}
        if 'access_token' in request.COOKIES:
            cookies['access_token'] = request.COOKIES['access_token']
        if 'refresh_token' in request.COOKIES:
            cookies['refresh_token'] = request.COOKIES['refresh_token']
        
        # Prepare request data
        data = None
        if request.method in ['POST', 'PUT', 'PATCH']:
            if request.content_type == 'application/json':
                try:
                    data = json.loads(request.body)
                except json.JSONDecodeError:
                    data = None
            else:
                data = request.POST.dict()
        
        # Make the API request
        try:
            response = requests.request(
                method=request.method,
                url=api_url,
                headers=headers,
                json=data if data else None,
                cookies=cookies,
                timeout=30
            )
            
            # Create Django response
            django_response = JsonResponse(
                response.json() if response.content else {},
                status=response.status_code,
                safe=False
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
