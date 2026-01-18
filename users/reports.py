"""
Reports and Analytics Module
Handles data aggregation and report generation for the dashboard
"""
import requests
from datetime import datetime, timedelta
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ReportsManager:
    """Manages report generation and data aggregation"""

    def __init__(self, access_token):
        self.access_token = access_token
        self.api_base = getattr(settings, 'API_BASE_URL', 'https://api.salona.me')

    def get_header(self):
        """Get standard headers for API requests"""
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }

    def fetch_bookings(self, start_date, end_date=None):
        """
        Fetch bookings from the API for a given date range

        Args:
            start_date: Start date string (YYYY-MM-DD)
            end_date: Optional end date string (YYYY-MM-DD)

        Returns:
            List of bookings or None if error
        """
        try:
            query_params = {
                'start_date': start_date,
            }
            if end_date:
                query_params['end_date'] = end_date

            api_url = f"{self.api_base}/api/v1/bookings"
            cookies = {'access_token': self.access_token}

            response = requests.get(
                api_url,
                params=query_params,
                headers=self.get_header(),
                cookies=cookies,
                timeout=15
            )

            if response.status_code == 200:
                data = response.json()
                return data.get('data', [])
            return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching bookings: {str(e)}")
            return None

    def generate_bookings_report(self, period='week'):
        """
        Generate comprehensive bookings report

        Args:
            period: 'week', 'month', 'year', or 'custom'

        Returns:
            Dictionary containing report data
        """
        today = datetime.now()

        # Calculate date range based on period
        if period == 'week':
            start_date = today - timedelta(days=7)
            previous_start = start_date - timedelta(days=7)
        elif period == 'month':
            start_date = today - timedelta(days=30)
            previous_start = start_date - timedelta(days=30)
        elif period == 'year':
            start_date = today - timedelta(days=365)
            previous_start = start_date - timedelta(days=365)
        else:  # Default to week
            start_date = today - timedelta(days=7)
            previous_start = start_date - timedelta(days=7)

        # Fetch current period bookings
        current_bookings = self.fetch_bookings(
            start_date.strftime('%Y-%m-%d'),
            today.strftime('%Y-%m-%d')
        )

        # Fetch previous period bookings for comparison
        previous_bookings = self.fetch_bookings(
            previous_start.strftime('%Y-%m-%d'),
            start_date.strftime('%Y-%m-%d')
        )

        if current_bookings is None:
            return None

        # Calculate metrics
        report = {
            'period': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': today.strftime('%Y-%m-%d'),
            'total_bookings': 0,
            'completed_bookings': 0,
            'cancelled_bookings': 0,
            'pending_bookings': 0,
            'total_revenue': 0.0,
            'average_booking_value': 0.0,
            'bookings_by_day': {},
            'revenue_by_day': {},
            'bookings_by_staff': {},
            'bookings_by_service': {},
            'status_breakdown': {
                'completed': 0,
                'pending': 0,
                'cancelled': 0,
                'confirmed': 0,
                'no_show': 0
            },
            'comparison': {
                'bookings_change': 0,
                'revenue_change': 0
            }
        }

        # Process current period bookings
        for booking in current_bookings:
            report['total_bookings'] += 1
            booking['total_price'] = float(booking.get('total_price', 0) or 0) / 100  # Convert cents to dollars
            # Count by status
            status = booking.get('status', 'pending').lower()
            if status in report['status_breakdown']:
                report['status_breakdown'][status] += 1

            if status == 'completed':
                report['completed_bookings'] += 1
            elif status == 'cancelled':
                report['cancelled_bookings'] += 1
            else:
                report['pending_bookings'] += 1

            # Calculate revenue (only for completed bookings)
            if status == 'completed':
                price = float(booking.get('total_price', 0) or 0)
                report['total_revenue'] += price

            # Group by day
            booking_date = booking.get('start_at', '')[:10]  # Extract date part
            if booking_date:
                report['bookings_by_day'][booking_date] = report['bookings_by_day'].get(booking_date, 0) + 1
                if status == 'completed':
                    price = float(booking.get('total_price', 0) or 0)
                    report['revenue_by_day'][booking_date] = report['revenue_by_day'].get(booking_date, 0) + price

            # Group by staff
            services = booking.get('booking_services', [])
            for service in services:
                staff_id = service.get('assigned_staff', {}).get('id', 'Unassigned')
                first_name = service.get('assigned_staff', {}).get('first_name', None)
                last_name = service.get('assigned_staff', {}).get('last_name', None)
                staff_name = (f"{first_name} {last_name}".strip()) if first_name or last_name else 'Unassigned'
                if staff_id not in report['bookings_by_staff']:
                    report['bookings_by_staff'][staff_id] = {
                        'name': staff_name,
                        'count': 0,
                        'revenue': 0.0
                    }
                report['bookings_by_staff'][staff_id]['count'] += 1
                if status == 'completed':
                    price = float(booking.get('total_price', 0) or 0)
                    report['bookings_by_staff'][staff_id]['revenue'] += price

            # Group by service
            for service in services:
                service_name = service.get('category_service', {}).get('name', 'Unknown')
                if service_name not in report['bookings_by_service']:
                    report['bookings_by_service'][service_name] = {
                        'count': 0,
                        'revenue': 0.0
                    }
                report['bookings_by_service'][service_name]['count'] += 1
                if status == 'completed':
                    service_price = float(service.get('price', 0) or 0)
                    report['bookings_by_service'][service_name]['revenue'] += service_price

        # Calculate averages
        if report['completed_bookings'] > 0:
            report['average_booking_value'] = report['total_revenue'] / report['completed_bookings']

        # Calculate comparison with previous period
        if previous_bookings:
            prev_total = len(previous_bookings)
            prev_revenue = sum(
                float(b.get('total_price', 0) or 0)
                for b in previous_bookings
                if b.get('status', '').lower() == 'completed'
            )

            if prev_total > 0:
                report['comparison']['bookings_change'] = (
                    (report['total_bookings'] - prev_total) / prev_total * 100
                )

            if prev_revenue > 0:
                report['comparison']['revenue_change'] = (
                    (report['total_revenue'] - prev_revenue) / prev_revenue * 100
                )

        return report

    def generate_customer_report(self):
        """
        Generate customer analytics report
        Returns customer statistics and trends
        """
        # This will be implemented when we have customer endpoint data
        pass

    def generate_staff_performance_report(self):
        """
        Generate staff performance report
        Returns staff-level metrics and KPIs
        """
        # This will be implemented with more detailed staff data
        pass

