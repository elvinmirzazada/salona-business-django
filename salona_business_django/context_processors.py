"""
Context processors for making settings available to templates
"""
from django.conf import settings


def api_config(request):
    """Make API configuration available to all templates"""
    return {
        'API_BASE_URL': settings.API_BASE_URL,
    }
