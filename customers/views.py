from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from datetime import datetime
import requests
import json
import logging
from .api_proxy import APIProxyView

logger = logging.getLogger(__name__)


def get_api_url(endpoint):
    """Helper function to construct API URL"""
    base_url = getattr(settings, 'API_BASE_URL', 'https://api.salona.me/api')
    # Remove trailing /api if present and add it back
    base_url = base_url.rstrip('/api').rstrip('/')
    return f"{base_url}/api/v1/{endpoint.lstrip('/')}"


def fetch_services(company_id):
    """Fetch services for a company from API"""
    try:
        api_url = get_api_url(f"services/companies/{company_id}/services")
        response = requests.get(api_url, timeout=10)
        
        if response.ok:
            data = response.json()
            if data.get('success') and data.get('data'):
                return data['data']
        else:
            logger.error(f"Failed to fetch services: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching services: {e}")
    return []


def fetch_professionals(company_id):
    """Fetch professionals (staff) for a company from API"""
    try:
        api_url = get_api_url(f"services/companies/{company_id}/users")
        response = requests.get(api_url, timeout=10)
        
        if response.ok:
            data = response.json()
            if data.get('success') and data.get('data'):
                return data['data']
        else:
            logger.error(f"Failed to fetch professionals: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching professionals: {e}")
    return []


def fetch_company_details(company_id):
    """Fetch company details from API"""
    try:
        api_url = get_api_url(f"companies/{company_id}")
        response = requests.get(api_url, timeout=10)

        if response.ok:
            data = response.json()
            if data.get('success') and data.get('data'):
                return data['data']
        else:
            logger.error(f"Failed to fetch company details: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching company details: {e}")
    return None

def fetch_company_address(company_id):
    """Fetch company address from API"""
    try:
        api_url = get_api_url(f"companies/{company_id}/address")
        response = requests.get(api_url, timeout=10)

        if response.ok:
            data = response.json()
            if data.get('success') and data.get('data'):
                return data['data']
        else:
            logger.error(f"Failed to fetch company address: {response.status_code}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching company address: {e}")
    return None


def get_professional_name(company_id, professional_id):
    """Get professional name by ID"""
    if professional_id == 'any':
        return "Any Professional"
    
    professionals = fetch_professionals(company_id)
    for item in professionals:
        if item.get('user') and item['user'].get('id') == professional_id:
            first_name = item['user'].get('first_name', '')
            last_name = item['user'].get('last_name', '')
            return f"{first_name} {last_name}".strip() or "Professional"
    
    return "Professional"


def get_services_details(company_id, service_ids):
    """Get details for selected services"""
    services = []
    total_price = 0
    
    all_services = fetch_services(company_id)
    
    for category in all_services:
        for service in category.get('services', []):
            if service['id'] in service_ids:
                price = (service.get('discount_price') or service.get('price') or 0) / 100
                services.append({
                    'id': service['id'],
                    'name': service['name'],
                    'price': price,
                    'duration': service.get('duration', 60)
                })
                total_price += float(price)
    
    return services, total_price


def format_time_12h(time_24h):
    """Convert 24h time format to 12h format with AM/PM"""
    time_parts = time_24h.split(':')
    hour = int(time_parts[0])
    minute = time_parts[1] if len(time_parts) > 1 else '00'
    am_pm = 'AM' if hour < 12 else 'PM'
    hour = hour % 12
    if hour == 0:
        hour = 12
    return f"{hour}:{minute} {am_pm}"


def booking(request, company_id):
    company = fetch_company_details(company_id)
    company_name = company.get('name', 'Salon') if company else 'Salon'
    if request.method == 'POST':
        step = request.POST.get('step', '1')

        if step == '1':
            # Process step 1 (services selection)
            selected_services = request.POST.get('selected_services', '')

            # Store selected services in session
            request.session['selected_services'] = selected_services

            # Move to step 2
            return render(request, 'customers/booking_step2.html', {
                'company_id': company_id,
                'today': datetime.now().strftime('%Y-%m-%d'),
            })

        elif step == '2':
            # Process step 2 (professional & time selection)
            selected_professional = request.POST.get('selected_professional', '')
            selected_date = request.POST.get('selected_date', '')
            selected_time_slot = request.POST.get('selected_time_slot', '')

            # Store selections in session
            request.session['selected_professional'] = selected_professional
            request.session['selected_date'] = selected_date
            request.session['selected_time_slot'] = selected_time_slot

            # Fetch service details for the review page
            selected_services_ids = request.session.get('selected_services', '').split(',')
            selected_services_ids = [sid for sid in selected_services_ids if sid]  # Remove empty strings
            
            services, total_price = get_services_details(company_id, selected_services_ids)

            # Format date and time for display
            booking_date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
            booking_date = booking_date_obj.strftime('%A, %B %d, %Y')
            booking_time = format_time_12h(selected_time_slot)

            # Get professional name
            professional_name = get_professional_name(company_id, selected_professional)

            # Move to step 3 (review)
            return render(request, 'customers/booking_step3.html', {
                'company_id': company_id,
                'booking_date': booking_date,
                'booking_time': booking_time,
                'professional_name': professional_name,
                'services': services,
                'total_price': total_price
            })

        elif step == '3':
            # Process final booking submission
            first_name = request.POST.get('first_name', '')
            last_name = request.POST.get('last_name', '')
            customer_email = request.POST.get('email', '')
            customer_phone = request.POST.get('phone', '')
            customer_notes = request.POST.get('notes', '')

            # Get all data from session
            selected_services = request.session.get('selected_services', '').split(',')
            selected_services = [sid for sid in selected_services if sid]  # Remove empty strings
            selected_professional = request.session.get('selected_professional', '')
            selected_date = request.session.get('selected_date', '')
            selected_time = request.session.get('selected_time_slot', '')

            # For AJAX requests, return JSON response
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'message': 'Booking submitted successfully',
                    'redirect_url': f"/customers/booking/{company_id}/confirmation"
                })

            # Format date and time for display
            booking_date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
            booking_date = booking_date_obj.strftime('%A, %B %d, %Y')
            booking_time = format_time_12h(selected_time)

            # Get service details
            services_json, total_price = get_services_details(company_id, selected_services)
            
            # Add notes field to services
            for service in services_json:
                service['notes'] = ''

            # Get professional name
            professional_name = get_professional_name(company_id, selected_professional)

            # Render the review page with all data
            return render(request, 'customers/booking_step3.html', {
                'company_id': company_id,
                'booking_date': booking_date,
                'booking_date_iso': selected_date,
                'booking_time': booking_time,
                'booking_time_value': selected_time,
                'professional_name': professional_name,
                'professional_id': selected_professional,
                'services': services_json,
                'services_json': json.dumps(services_json),
                'total_price': total_price
            })
    # Initial request - show step 1 (service selection)
    return render(request, 'customers/booking.html', {
        'company_id': company_id,
        'company_name': company_name,
        'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
    })


def booking_single_page(request, company_id):
    """
    Renders the single-page booking experience without page refreshes between steps
    """
    # Fetch company details
    company = fetch_company_details(company_id)
    company_name = company.get('name', 'Salon') if company else 'Salon'

    return render(request, 'customers/booking_single_page.html', {
        'company_id': company_id,
        'company_name': company_name,
    })


def booking_confirmation(request, company_id):
    """
    Renders the booking confirmation page after successful booking
    """
    # Fetch company details
    company = fetch_company_details(company_id)

    if not company:
        return render(request, 'customers/booking_confirmation.html', {
            'company_id': company_id,
            'company_name': 'Salon',
            'error': 'Company not found'
        })

    company_name = company.get('name', 'Salon')

    # Get booking_id from query parameters
    booking_id = request.GET.get('booking_id')

    # Fetch company address from dedicated address endpoint
    address_data = fetch_company_address(company_id)

    # Get venue information from address data
    venue_address = ''
    venue_city = ''
    venue_postal_code = ''
    venue_country = ''
    venue_phone = company.get('phone', '')  # Phone comes from company details

    if address_data:
        venue_address = address_data.get('address', '')
        venue_city = address_data.get('city', '')
        venue_postal_code = address_data.get('zip', '')  # API uses 'zip' field
        venue_country = address_data.get('country', '')

    # Generate Google Maps link if address exists
    venue_maps_link = None
    if venue_address:
        full_address = f"{venue_address}, {venue_postal_code} {venue_city}".strip(', ')
        if venue_country:
            full_address += f", {venue_country}"
        venue_maps_link = f"https://www.google.com/maps/search/?api=1&query={full_address.replace(' ', '+')}"

    context = {
        'company_id': company_id,
        'company_name': company_name,
        'booking_id': booking_id,
        'venue_address': venue_address,
        'venue_city': venue_city,
        'venue_postal_code': venue_postal_code,
        'venue_country': venue_country,
        'venue_phone': venue_phone,
        'venue_maps_link': venue_maps_link,
        'API_BASE_URL': getattr(settings, 'API_BASE_URL', 'https://api.salona.me')
    }

    return render(request, 'customers/booking_confirmation.html', context)
