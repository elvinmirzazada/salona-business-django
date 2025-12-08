"""
Custom template tags for optimized static file handling
"""
import hashlib
import os
from django import template
from django.conf import settings
from django.contrib.staticfiles.storage import staticfiles_storage
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def static_versioned(path):
    """
    Generate a static file URL with version hash for cache busting
    Usage: {% static_versioned 'css/styles.css' %}
    """
    try:
        # Get the static file URL
        url = staticfiles_storage.url(path)
        
        # In production, WhiteNoise manifest handles versioning
        if not settings.DEBUG:
            return url
            
        # In development, add file modification time as version
        try:
            static_path = staticfiles_storage.path(path)
            if os.path.exists(static_path):
                mtime = int(os.path.getmtime(static_path))
                separator = '&' if '?' in url else '?'
                return f"{url}{separator}v={mtime}"
        except (AttributeError, NotImplementedError):
            pass
            
        return url
    except Exception:
        return path


@register.simple_tag
def preload_css(path, media='all'):
    """
    Generate preload link for CSS with proper attributes
    Usage: {% preload_css 'css/styles.css' %}
    """
    url = static_versioned(path)
    return mark_safe(
        f'<link rel="preload" href="{url}" as="style" media="{media}" '
        f'onload="this.onload=null;this.rel=\'stylesheet\'">'
        f'<noscript><link rel="stylesheet" href="{url}" media="{media}"></noscript>'
    )


@register.simple_tag
def preload_js(path):
    """
    Generate preload link for JavaScript
    Usage: {% preload_js 'js/script.js' %}
    """
    url = static_versioned(path)
    return mark_safe(
        f'<link rel="preload" href="{url}" as="script">'
    )


@register.simple_tag
def inline_css(path):
    """
    Inline small CSS files directly into HTML for critical CSS
    Usage: {% inline_css 'css/critical.css' %}
    """
    try:
        if settings.DEBUG:
            # In development, just link the file
            url = static_versioned(path)
            return mark_safe(f'<link rel="stylesheet" href="{url}">')
            
        # In production, try to inline if file is small
        static_path = staticfiles_storage.path(path)
        if os.path.exists(static_path) and os.path.getsize(static_path) < 10240:  # 10KB
            with open(static_path, 'r', encoding='utf-8') as f:
                css_content = f.read()
            return mark_safe(f'<style>{css_content}</style>')
    except Exception:
        pass
    
    # Fallback to regular link
    url = static_versioned(path)
    return mark_safe(f'<link rel="stylesheet" href="{url}">')


@register.inclusion_tag('partials/resource_hints.html')
def resource_hints():
    """
    Generate resource hints for better performance
    Usage: {% resource_hints %}
    """
    return {
        'dns_prefetch_domains': [
            '//fonts.googleapis.com',
            '//fonts.gstatic.com',
            '//cdnjs.cloudflare.com',
        ],
        'preconnect_domains': [
            'https://fonts.gstatic.com',
        ]
    }


@register.simple_tag
def cache_bust_hash(content):
    """
    Generate a hash for cache busting based on content
    Usage: {% cache_bust_hash 'some content' %}
    """
    return hashlib.md5(content.encode('utf-8')).hexdigest()[:8]
