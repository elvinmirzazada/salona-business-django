"""
Views for the main Salona application
"""
from django.shortcuts import render
from django.views.generic import TemplateView


def home(request):
    """Home page view for Salona business management system"""
    context = {
        'page_title': 'Salona - Professional Beauty Business Management',
        'features': [
            {
                'title': 'Smart Booking System',
                'description': 'Effortless appointment scheduling with automated confirmations and reminders',
                'icon': 'fas fa-calendar-alt'
            },
            {
                'title': 'Client Management', 
                'description': 'Comprehensive customer profiles with service history and preferences',
                'icon': 'fas fa-users'
            },
            {
                'title': 'Staff Coordination',
                'description': 'Manage your team schedules, services, and availability seamlessly',
                'icon': 'fas fa-user-friends'
            },
            {
                'title': 'Service Catalog',
                'description': 'Organize your treatments, pricing, and service packages professionally',
                'icon': 'fas fa-cut'
            },
            {
                'title': 'Real-time Notifications',
                'description': 'Stay updated with instant notifications for bookings and business activities',
                'icon': 'fas fa-bell'
            },
            {
                'title': 'Analytics Dashboard',
                'description': 'Track performance, revenue, and business insights with detailed analytics',
                'icon': 'fas fa-chart-line'
            }
        ]
    }
    return render(request, 'home/index.html', context)
