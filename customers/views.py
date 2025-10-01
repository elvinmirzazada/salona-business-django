from django.shortcuts import render, redirect
from django.http import JsonResponse
from datetime import datetime, timedelta
import requests
import json

def booking(request, company_id):
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
            services = []
            total_price = 0

            # Format date and time for display
            booking_date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
            booking_date = booking_date_obj.strftime('%A, %B %d, %Y')

            # Format time for display (convert 24h to 12h format)
            time_parts = selected_time_slot.split(':')
            hour = int(time_parts[0])
            minute = time_parts[1]
            am_pm = 'AM' if hour < 12 else 'PM'
            hour = hour % 12
            if hour == 0:
                hour = 12
            booking_time = f"{hour}:{minute} {am_pm}"

            # Get professional name
            professional_name = "Any Professional"
            if selected_professional != 'any':
                try:
                    # Fetch professional details from API
                    response = requests.get(
                        f"http://127.0.0.1:8000/api/v1/services/companies/{company_id}/users",
                    )
                    if response.ok:
                        data = response.json()
                        if data.get('success') and data.get('data'):
                            for item in data['data']:
                                if item.get('user') and item['user'].get('id') == selected_professional:
                                    professional_name = f"{item['user'].get('first_name', '')} {item['user'].get('last_name', '')}"
                                    break
                except Exception as e:
                    print(f"Error fetching professional details: {e}")

            # Try to fetch service details from API
            try:
                response = requests.get(
                    f"http://127.0.0.1:8000/api/v1/services/companies/{company_id}/services",
                )

                if response.ok:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        # Find selected services
                        for category in data['data']:
                            for service in category.get('services', []):
                                if service['id'] in selected_services_ids:
                                    price = service.get('discount_price') or service.get('price') or 0
                                    services.append({
                                        'id': service['id'],
                                        'name': service['name'],
                                        'price': price,
                                        'duration': service.get('duration', 60)
                                    })
                                    total_price += float(price)
            except Exception as e:
                print(f"Error fetching service details: {e}")

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

            # Add formatted data for the template
            booking_date_obj = datetime.strptime(selected_date, '%Y-%m-%d')
            booking_date = booking_date_obj.strftime('%A, %B %d, %Y')

            # Format time for display
            time_parts = selected_time.split(':')
            hour = int(time_parts[0])
            minute = time_parts[1]
            am_pm = 'AM' if hour < 12 else 'PM'
            hour = hour % 12
            if hour == 0:
                hour = 12
            booking_time = f"{hour}:{minute} {am_pm}"

            # Prepare JSON data for the frontend
            services_json = []
            total_price = 0

            # Try to fetch service details from API
            try:
                response = requests.get(
                    f"http://127.0.0.1:8000/api/v1/services/companies/{company_id}/services",
                )

                if response.ok:
                    data = response.json()
                    if data.get('success') and data.get('data'):
                        # Find selected services
                        for category in data['data']:
                            for service in category.get('services', []):
                                if service['id'] in selected_services:
                                    price = service.get('discount_price') or service.get('price') or 0
                                    services_json.append({
                                        'id': service['id'],
                                        'name': service['name'],
                                        'price': price,
                                        'duration': service.get('duration', 60),
                                        'notes': ''
                                    })
                                    total_price += float(price)
            except Exception as e:
                print(f"Error fetching service details: {e}")

            # Get professional name
            professional_name = "Any Professional"
            if selected_professional != 'any':
                try:
                    # Fetch professional details from API
                    response = requests.get(
                        f"http://127.0.0.1:8000/api/v1/services/companies/{company_id}/users",
                    )
                    if response.ok:
                        data = response.json()
                        if data.get('success') and data.get('data'):
                            for item in data['data']:
                                if item.get('user') and item['user'].get('id') == selected_professional:
                                    professional_name = f"{item['user'].get('first_name', '')} {item['user'].get('last_name', '')}"
                                    break
                except Exception as e:
                    print(f"Error fetching professional details: {e}")

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
    })

# Add new single-page booking view
def booking_single_page(request, company_id):
    """
    Renders the single-page booking experience without page refreshes between steps
    """
    return render(request, 'customers/booking_single_page.html', {
        'company_id': company_id,
    })
