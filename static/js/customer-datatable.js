/**
 * Customers DataTable Manager - Handles customer data display with DataTables
 * Uses API client for all backend communication
 */

class CustomersDataTable {
    constructor() {
        this.customers = [];
        this.customersTable = null;
    }

    /**
     * Get translations with fallback defaults
     */
    get translations() {
        return window.customerTranslations || {
            name: 'Name',
            email: 'Email',
            phone: 'Phone',
            totalBookings: 'Total Bookings',
            lastVisit: 'Last Visit',
            failedToLoad: 'Failed to load customers',
            noCustomers: 'No customers found.',
            loadingRecords: 'Loading customers data...',
            processing: 'Processing...',
            search: 'Search customers:',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_ to _END_ of _TOTAL_ customers',
            infoEmpty: 'Showing 0 to 0 of 0 customers',
            infoFiltered: '(filtered from _MAX_ total customers)',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous'
            }
        };
    }

    /**
     * Initialize the customers DataTable
     */
    async init() {
        try {
            this.initializeCustomersDataTable();
        } catch (error) {
            console.error('Failed to initialize customers manager:', error);
            this.showError(this.translations.failedToLoad);
        }
    }

    /**
     * Initialize DataTable for customers
     */
    initializeCustomersDataTable() {
        const self = this;

        // Show loading state initially
        $('#customers-loading').show();
        $('#customers-table-container').hide();
        $('#customers-empty').hide();

        this.customersTable = $('#customers-table').DataTable({
            ajax: {
                url: '/users/api/v1/companies/customers',
                type: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                dataSrc: function(json) {
                    // Handle the API response format
                    if (json && json.data) {
                        self.customers = json.data;

                        // Hide loading and show table if we have data
                        $('#customers-loading').hide();
                        if (json.data.length > 0) {
                            $('#customers-table-container').show();
                            $('#customers-empty').hide();
                        } else {
                            $('#customers-table-container').hide();
                            $('#customers-empty').show();
                        }

                        return json.data;
                    }

                    // No data case
                    $('#customers-loading').hide();
                    $('#customers-table-container').hide();
                    $('#customers-empty').show();
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load customers data:', error);
                    self.showError(self.translations.failedToLoad);
                    $('#customers-loading').hide();
                    $('#customers-table-container').hide();
                    $('#customers-empty').show();
                }
            },
            columns: [
                {
                    data: null,
                    render: function(data, type, row) {
                        const firstName = row.first_name || '';
                        const lastName = row.last_name || '';
                        const fullName = `${firstName} ${lastName}`.trim();
                        return fullName || '-';
                    }
                },
                {
                    data: 'email',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                {
                    data: 'phone',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                {
                    data: 'total_bookings',
                    render: function(data, type, row) {
                        return data !== undefined && data !== null ? data : '0';
                    }
                },
                {
                    data: 'last_visit',
                    render: function(data, type, row) {
                        if (data) {
                            const date = new Date(data);
                            return date.toLocaleDateString();
                        }
                        return '-';
                    }
                }
            ],
            responsive: true,
            pageLength: 10,
            lengthChange: true,
            searching: true,
            ordering: true,
            autoWidth: true,
            scrollResize: true,
            scrollY: 'auto',
            language: {
                emptyTable: self.translations.noCustomers,
                loadingRecords: self.translations.loadingRecords,
                processing: self.translations.processing,
                search: self.translations.search,
                lengthMenu: self.translations.lengthMenu,
                info: self.translations.info,
                infoEmpty: self.translations.infoEmpty,
                infoFiltered: self.translations.infoFiltered,
                paginate: self.translations.paginate
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            drawCallback: function(settings) {
                // Hide loading state when table is drawn
                $('#customers-loading').hide();

                // Show/hide empty state based on data
                const api = this.api();
                const data = api.rows({page: 'current'}).data();

                if (data.length === 0 && api.page.info().recordsTotal === 0) {
                    $('#customers-table-container').hide();
                    $('#customers-empty').show();
                } else {
                    $('#customers-table-container').show();
                    $('#customers-empty').hide();
                }
            }
        });
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'error');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.textContent = message;
            alertContainer.innerHTML = '';
            alertContainer.appendChild(alertDiv);

            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
    }

    /**
     * Reload the customers table
     */
    reloadTable() {
        if (this.customersTable) {
            this.customersTable.ajax.reload(null, false); // false = keep current page
        }
    }
}

// Make it globally available
window.CustomersDataTable = CustomersDataTable;

