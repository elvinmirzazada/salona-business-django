/**
 * Dashboard Reports and Analytics
 * Handles chart rendering, data visualization, and export functionality
 */

// Chart instances
let bookingsChart = null;
let revenueChart = null;
let statusChart = null;
let servicesChart = null;

// Chart colors
const chartColors = {
    primary: 'rgba(124, 58, 237, 0.8)',
    secondary: 'rgba(244, 63, 94, 0.8)',
    success: 'rgba(34, 197, 94, 0.8)',
    warning: 'rgba(251, 146, 60, 0.8)',
    info: 'rgba(59, 130, 246, 0.8)',
    purple: 'rgba(168, 85, 247, 0.8)',
    pink: 'rgba(236, 72, 153, 0.8)',
    cyan: 'rgba(6, 182, 212, 0.8)',
};

/**
 * Initialize dashboard on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard Reports Initializing...');
    console.log('Reports Data:', window.reportsData);

    if (window.reportsData && Object.keys(window.reportsData).length > 0) {
        updateMetrics(window.reportsData);
        renderCharts(window.reportsData);
        updateStaffPerformanceTable(window.reportsData);
    } else {
        showNoDataMessage();
    }

    // Period selector event listeners
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            changePeriod(period);
        });
    });

    // Export button event listeners
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportToPDF);
    document.getElementById('export-excel-btn')?.addEventListener('click', exportToExcel);
});

/**
 * Update metric cards with report data
 */
function updateMetrics(data) {
    // Total Bookings
    document.getElementById('metric-total-bookings').textContent = data.total_bookings || 0;

    // Bookings Change
    const bookingsChange = data.comparison?.bookings_change || 0;
    updateChangeIndicator('metric-bookings-change', bookingsChange);

    // Total Revenue
    const revenue = data.total_revenue || 0;
    document.getElementById('metric-total-revenue').textContent = formatCurrency(revenue);

    // Revenue Change
    const revenueChange = data.comparison?.revenue_change || 0;
    updateChangeIndicator('metric-revenue-change', revenueChange);

    // Completed Bookings
    document.getElementById('metric-completed').textContent = data.completed_bookings || 0;

    // Completion Rate
    const completionRate = data.total_bookings > 0
        ? ((data.completed_bookings / data.total_bookings) * 100).toFixed(1)
        : 0;
    document.getElementById('metric-completion-rate').textContent = `${completionRate}% completion rate`;

    // Average Booking Value
    const avgValue = data.average_booking_value || 0;
    document.getElementById('metric-avg-value').textContent = formatCurrency(avgValue);
}

/**
 * Update change indicator with arrow and color
 */
function updateChangeIndicator(elementId, changePercent) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const isPositive = changePercent >= 0;
    const icon = element.querySelector('i');
    const span = element.querySelector('span');

    if (icon) {
        icon.className = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
    }

    if (span) {
        span.textContent = `${Math.abs(changePercent).toFixed(1)}%`;
    }

    element.className = `metric-change ${isPositive ? 'positive' : 'negative'}`;
}

/**
 * Render all charts
 */
function renderCharts(data) {
    renderBookingsChart(data);
    renderRevenueChart(data);
    renderStatusChart(data);
    renderServicesChart(data);
}

/**
 * Render bookings over time chart
 */
function renderBookingsChart(data) {
    const ctx = document.getElementById('bookings-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (bookingsChart) {
        bookingsChart.destroy();
    }

    // Prepare data
    const bookingsByDay = data.bookings_by_day || {};
    const labels = Object.keys(bookingsByDay).sort();
    const values = labels.map(date => bookingsByDay[date]);

    bookingsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(date => formatDate(date)),
            datasets: [{
                label: 'Bookings',
                data: values,
                borderColor: chartColors.primary,
                backgroundColor: chartColors.primary.replace('0.8', '0.1'),
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Render revenue over time chart
 */
function renderRevenueChart(data) {
    const ctx = document.getElementById('revenue-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (revenueChart) {
        revenueChart.destroy();
    }

    // Prepare data
    const revenueByDay = data.revenue_by_day || {};
    const labels = Object.keys(revenueByDay).sort();
    const values = labels.map(date => revenueByDay[date]);

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(date => formatDate(date)),
            datasets: [{
                label: 'Revenue (€)',
                data: values,
                backgroundColor: chartColors.secondary,
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 },
                    callbacks: {
                        label: function(context) {
                            return 'Revenue: €' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '€' + value;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Render booking status distribution chart
 */
function renderStatusChart(data) {
    const ctx = document.getElementById('status-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (statusChart) {
        statusChart.destroy();
    }

    const statusBreakdown = data.status_breakdown || {};
    const labels = Object.keys(statusBreakdown).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    const values = Object.values(statusBreakdown);

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    chartColors.success,
                    chartColors.warning,
                    chartColors.secondary,
                    chartColors.info,
                    chartColors.purple
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 }
                }
            }
        }
    });
}

/**
 * Render top services chart
 */
function renderServicesChart(data) {
    const ctx = document.getElementById('services-chart');
    if (!ctx) return;

    // Destroy existing chart
    if (servicesChart) {
        servicesChart.destroy();
    }

    const bookingsByService = data.bookings_by_service || {};

    // Sort by count and take top 10
    const sortedServices = Object.entries(bookingsByService)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10);

    const labels = sortedServices.map(([name]) => name);
    const values = sortedServices.map(([, data]) => data.count);

    servicesChart = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Bookings',
                data: values,
                backgroundColor: chartColors.info,
                borderRadius: 6,
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 14 },
                    bodyFont: { size: 13 }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

/**
 * Update staff performance table
 */
function updateStaffPerformanceTable(data) {
    const tbody = document.getElementById('staff-performance-tbody');
    if (!tbody) return;

    const bookingsByStaff = data.bookings_by_staff || {};
    const entries = Object.entries(bookingsByStaff);

    if (entries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-gray-500">
                    No staff performance data available
                </td>
            </tr>
        `;
        return;
    }

    // Sort by revenue
    entries.sort((a, b) => b[1].revenue - a[1].revenue);

    tbody.innerHTML = entries.map(([staffId, staffData]) => {
        const avgPerBooking = staffData.count > 0 ? staffData.revenue / staffData.count : 0;
        return `
            <tr>
                <td class="font-medium">${staffData.name}</td>
                <td>${staffData.count}</td>
                <td>${formatCurrency(staffData.revenue)}</td>
                <td>${formatCurrency(avgPerBooking)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Change reporting period
 */
async function changePeriod(period) {
    // Update active button
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`period-${period}`)?.classList.add('active');

    // Show loading state
    showLoadingState();

    try {
        // Fetch new data
        const response = await fetch(`${window.location.pathname}?period=${period}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const result = await response.json();

        if (result.reports_data) {
            window.reportsData = result.reports_data;
            updateMetrics(result.reports_data);
            renderCharts(result.reports_data);
            updateStaffPerformanceTable(result.reports_data);
        } else {
            showNoDataMessage();
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        showErrorMessage('Failed to load reports data');
    }
}

/**
 * Export to PDF
 */
async function exportToPDF() {
    // Using html2pdf.js library or server-side generation
    // For now, show a message
    alert('PDF export functionality coming soon! This will generate a comprehensive PDF report with all charts and data.');

    // TODO: Implement PDF export
    // Option 1: Use html2pdf.js on client side
    // Option 2: Send data to server and generate PDF using ReportLab (Python)
}

/**
 * Export to Excel
 */
async function exportToExcel() {
    if (!window.reportsData || Object.keys(window.reportsData).length === 0) {
        alert('No data available to export');
        return;
    }

    try {
        // Create CSV content
        let csv = '';

        // Summary section
        csv += 'BUSINESS ANALYTICS REPORT\n';
        csv += `Period: ${window.reportsData.period}\n`;
        csv += `Date Range: ${window.reportsData.start_date} to ${window.reportsData.end_date}\n\n`;

        csv += 'SUMMARY METRICS\n';
        csv += 'Metric,Value\n';
        csv += `Total Bookings,${window.reportsData.total_bookings}\n`;
        csv += `Completed Bookings,${window.reportsData.completed_bookings}\n`;
        csv += `Cancelled Bookings,${window.reportsData.cancelled_bookings}\n`;
        csv += `Pending Bookings,${window.reportsData.pending_bookings}\n`;
        csv += `Total Revenue,€${window.reportsData.total_revenue.toFixed(2)}\n`;
        csv += `Average Booking Value,€${window.reportsData.average_booking_value.toFixed(2)}\n\n`;

        // Status breakdown
        csv += 'STATUS BREAKDOWN\n';
        csv += 'Status,Count\n';
        Object.entries(window.reportsData.status_breakdown).forEach(([status, count]) => {
            csv += `${status},${count}\n`;
        });
        csv += '\n';

        // Staff performance
        csv += 'STAFF PERFORMANCE\n';
        csv += 'Staff Member,Bookings,Revenue,Avg Per Booking\n';
        Object.entries(window.reportsData.bookings_by_staff).forEach(([staffId, data]) => {
            const avg = data.count > 0 ? (data.revenue / data.count).toFixed(2) : '0.00';
            csv += `${data.name},${data.count},€${data.revenue.toFixed(2)},€${avg}\n`;
        });
        csv += '\n';

        // Services
        csv += 'TOP SERVICES\n';
        csv += 'Service,Bookings,Revenue\n';
        Object.entries(window.reportsData.bookings_by_service).forEach(([service, data]) => {
            csv += `${service},${data.count},€${data.revenue.toFixed(2)}\n`;
        });

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `salona-report-${window.reportsData.period}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        alert('Failed to export data. Please try again.');
    }
}

/**
 * Show loading state
 */
function showLoadingState() {
    document.querySelectorAll('.metric-value').forEach(el => {
        el.textContent = '...';
    });
}

/**
 * Show no data message
 */
function showNoDataMessage() {
    console.warn('No reports data available');
    // Keep the UI visible but show zero values
    updateMetrics({
        total_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        pending_bookings: 0,
        total_revenue: 0,
        average_booking_value: 0,
        bookings_by_day: {},
        revenue_by_day: {},
        bookings_by_staff: {},
        bookings_by_service: {},
        status_breakdown: {},
        comparison: { bookings_change: 0, revenue_change: 0 }
    });
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    console.error(message);
    // Could implement a toast notification here
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return '€' + parseFloat(amount).toFixed(2);
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

