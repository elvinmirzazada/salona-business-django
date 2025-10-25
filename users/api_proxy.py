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
        api_base = getattr(settings, 'API_BASE_URL', 'https://api.salona.app')
        # Remove leading slash from path if present
        if path.startswith('/'):
            path = path[1:]
        return f"{api_base}/{path}"
    
    def forward_request(self, request, path):
        """Forward the request to the external API"""
        api_url = self.get_api_url(path)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        
        # Get cookies from session (stored by previous requests)
        cookies = {}
        if hasattr(request, 'session'):
            access_token = request.session.get('access_token')
            refresh_token = request.session.get('refresh_token')
            
            if access_token:
                cookies['access_token'] = access_token
            if refresh_token:
                cookies['refresh_token'] = refresh_token
        
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
            
            # Handle cookies from the API response
            if response.cookies:
                for cookie_name, cookie_value in response.cookies.items():
                    if cookie_name in ['access_token', 'refresh_token']:
                        request.session[cookie_name] = cookie_value
            
            # Return the API response
            django_response = JsonResponse(
                response.json() if response.content else {},
                status=response.status_code,
                safe=False
            )
            
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
@require_http_methods(["POST", "PUT"])
def logout_proxy(request):
    """Handle logout by clearing session and calling API logout"""
    try:
        # Get tokens from session
        access_token = request.session.get('access_token')
        
        # Call external API logout if token exists
        if access_token:
            api_url = f"{getattr(settings, 'API_BASE_URL', 'https://api.salona.app')}/api/v1/users/auth/logout"
            headers = {'Content-Type': 'application/json'}
            cookies = {'access_token': access_token}
            
            try:
                requests.put(api_url, headers=headers, cookies=cookies, timeout=10)
            except requests.exceptions.RequestException:
                pass  # Continue with local logout even if API call fails
        
        # Clear session
        request.session.flush()
        
        return JsonResponse({'success': True, 'message': 'Logged out successfully'})
        
    except Exception as e:
        # Clear session anyway
        request.session.flush()
        return JsonResponse({'success': True, 'message': 'Logged out locally'})
