"""
Custom middleware for enhanced static asset caching
"""
import time
from django.utils.cache import add_never_cache_headers, patch_cache_control
from django.http import HttpResponse


class StaticFilesCacheMiddleware:
    """
    Middleware to add proper cache headers for static files and other assets
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Only process successful responses
        if response.status_code != 200:
            return response
            
        path = request.path
        
        # Handle static files that might not be caught by WhiteNoise
        if path.startswith('/static/'):
            self._add_static_cache_headers(response, path)
        
        # Handle API responses - no caching for dynamic content
        elif path.startswith('/api/'):
            add_never_cache_headers(response)
            response['Pragma'] = 'no-cache'
            
        # Handle HTML pages - short cache with validation
        elif path.endswith(('.html', '/')) or '.' not in path.split('/')[-1]:
            patch_cache_control(
                response,
                public=True,
                max_age=300,  # 5 minutes
                must_revalidate=True
            )
            
        return response
    
    def _add_static_cache_headers(self, response, path):
        """Add appropriate cache headers based on file type"""
        
        # Long cache for versioned assets (CSS, JS, images, fonts)
        if any(path.endswith(ext) for ext in ['.css', '.js', '.png', '.jpg', '.jpeg', 
                                            '.gif', '.ico', '.svg', '.webp', '.woff', 
                                            '.woff2', '.ttf', '.eot']):
            patch_cache_control(
                response,
                public=True,
                max_age=31536000,  # 1 year
                immutable=True
            )
            response['Expires'] = time.strftime(
                '%a, %d %b %Y %H:%M:%S GMT',
                time.gmtime(time.time() + 31536000)
            )
            
        # Medium cache for other static assets
        else:
            patch_cache_control(
                response,
                public=True,
                max_age=86400  # 1 day
            )
            
        # Add security headers for static files
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Add CORS headers for fonts and other cross-origin assets
        if any(path.endswith(ext) for ext in ['.woff', '.woff2', '.ttf', '.eot']):
            response['Access-Control-Allow-Origin'] = '*'
