# UTC Timezone Implementation Guide

## Overview

This document describes how the application handles UTC timezone conversion for external API requests and responses. The backend services use UTC time zone exclusively, while the browser displays times in the user's local timezone.

## Architecture

### Frontend (JavaScript)
- Converts local browser times to UTC before sending to backend
- Converts UTC responses back to local browser timezone for display

### Backend (Django)
- Converts incoming request parameters to UTC format
- Forwards UTC-formatted data to external API services
- Expects all responses from external API to be in UTC

## Implementation Details

### Frontend: `static/js/utils.js`

The `Utils` module provides timezone conversion utilities:

#### Key Functions

1. **`convertToUTC(localDateTime)`**
   - Converts a local datetime string or Date object to UTC ISO format
   - Input formats: `"YYYY-MM-DD HH:mm"` or `Date` object
   - Output: ISO 8601 UTC string (e.g., `"2024-12-07T15:30:00Z"`)
   - Returns `null` for invalid input

   ```javascript
   // Example usage
   const localTime = "2024-12-07 14:30"; // User's local time
   const utcTime = Utils.convertToUTC(localTime);
   // Result: "2024-12-07T18:30:00Z" (if timezone is -4:00)
   ```

2. **`convertFromUTC(utcDateTime)`**
   - Converts UTC datetime string to local timezone
   - Input: ISO 8601 UTC string (e.g., `"2024-12-07T18:30:00Z"`)
   - Output: Local datetime string in format `"YYYY-MM-DD HH:mm"`
   - Returns `null` for invalid input

   ```javascript
   // Example usage
   const utcTime = "2024-12-07T18:30:00Z";
   const localTime = Utils.convertFromUTC(utcTime);
   // Result: "2024-12-07 14:30" (if timezone is -4:00)
   ```

3. **`convertTimeParamsToUTC(data)`**
   - Recursively scans an object and converts all time-related fields to UTC
   - Automatically detects time fields by name patterns
   - Returns a new object without mutating the original

   ```javascript
   // Example usage
   const bookingData = {
     service_id: 123,
     start_time: "2024-12-07 14:30",
     end_time: "2024-12-07 15:30",
     customer: {
       name: "John",
       created_at: "2024-12-01 10:00"
     }
   };
   
   const utcData = Utils.convertTimeParamsToUTC(bookingData);
   // Result: All time fields converted to UTC ISO format
   ```

4. **`convertTimeResponseToLocal(data)`**
   - Recursively converts UTC timestamps in response data to local timezone
   - Used to process API responses before displaying to user
   - Handles nested objects and arrays

   ```javascript
   // Example usage
   const response = {
     id: 1,
     booking: {
       start_time: "2024-12-07T18:30:00Z",
       end_time: "2024-12-07T19:30:00Z"
     }
   };
   
   const localData = Utils.convertTimeResponseToLocal(response);
   // All time fields now in local timezone
   ```

5. **`getTimezone()`**
   - Returns the browser's timezone name (e.g., `"America/New_York"`)
   - Uses `Intl.DateTimeFormat()` for accuracy

6. **`getTimezoneOffset()`**
   - Returns timezone offset in minutes
   - Negative for west of UTC, positive for east

#### Detected Time Fields

The conversion functions automatically detect and process these field patterns:
- `*time` (start_time, end_time, booking_time, etc.)
- `*date*time` (start_date_time, end_date_time, etc.)
- `*_at` (created_at, updated_at, started_at, ended_at, etc.)
- `start*`, `end*`, `begin*`, `from*`, `to*`
- `scheduled*`, `appointment*`, `booking*`
- `datetime`, `date_time`

### Frontend: `static/js/api-client.js`

The `APIClient` class uses UTC conversion for write operations:

#### Methods with UTC Conversion

```javascript
// Create/Update methods that handle time parameters
async createBooking(bookingData) {
    const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(bookingData) : bookingData;
    return this.request('/users/api/v1/bookings/users/create_booking', {
        method: 'POST',
        body: JSON.stringify(utcData)
    });
}

async updateBooking(bookingId, bookingData) {
    const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(bookingData) : bookingData;
    return this.request(`/users/api/v1/bookings/${bookingId}`, {
        method: 'PUT',
        body: JSON.stringify(utcData)
    });
}

async updateTimeOff(timeOffId, timeOffData) {
    const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(timeOffData) : timeOffData;
    return this.request(`/users/api/v1/users/time-offs/${timeOffId}`, {
        method: 'PUT',
        body: JSON.stringify(utcData)
    });
}
```

### Backend: `users/api_proxy.py` and `customers/api_proxy.py`

Both proxy files implement `ensure_utc_params()` method:

#### Method: `ensure_utc_params(data)`

```python
@staticmethod
def ensure_utc_params(data):
    """
    Recursively convert all time-related parameters to UTC format.
    Looks for common time field names and converts them to ISO 8601 UTC format.
    """
```

**Features:**
- Recursively processes dictionaries and lists
- Detects time fields by name patterns (similar to JavaScript)
- Validates ISO 8601 format
- Preserves non-time data unchanged
- Returns processed data for API request

**Usage in Forward Request:**

```python
def forward_request(self, request, path):
    # ...
    # Convert query parameters to UTC
    params = self.ensure_utc_params(request.GET.dict() if request.GET else None)
    
    # Convert POST/PUT/PATCH body data to UTC
    if request.method in ['POST', 'PUT', 'PATCH']:
        if request.content_type == 'application/json':
            data = json.loads(request.body)
            data = self.ensure_utc_params(data)  # Convert to UTC
    
    # Send to external API with UTC data
    response = requests.request(
        method=request.method,
        url=api_url,
        headers=headers,
        json=data,  # Already in UTC
        params=params,  # Already in UTC
        cookies=cookies,
        timeout=30
    )
```

## Usage Examples

### Example 1: Creating a Booking

**Frontend (JavaScript):**
```javascript
// User inputs: 2024-12-07 14:30 (local time in EST, UTC-5)
const bookingData = {
  service_id: 123,
  start_time: "2024-12-07 14:30",
  end_time: "2024-12-07 15:30"
};

// Converted to UTC before sending
const utcData = Utils.convertTimeParamsToUTC(bookingData);
// utcData.start_time = "2024-12-07T19:30:00Z"
// utcData.end_time = "2024-12-07T20:30:00Z"

await api.createBooking(utcData);
```

**Backend (Django):**
```python
# Request arrives with UTC data
# ensure_utc_params validates and passes through UTC format
# Forwards to external API with UTC timestamps
```

**External API:**
- Receives: `"2024-12-07T19:30:00Z"` (UTC)
- Stores in UTC

**Response (if fetching):**
```javascript
// API returns UTC: "2024-12-07T19:30:00Z"
const response = await api.getBookingById(bookingId);
const localData = Utils.convertTimeResponseToLocal(response);
// localData.start_time = "2024-12-07 14:30" (converted back to EST)
```

### Example 2: Getting Bookings with Date Filter

**Frontend:**
```javascript
const params = {
  start_date: "2024-12-01",  // Date only, no conversion needed
  status: "confirmed"
};

// Query parameters are also converted
const utcParams = Utils.convertTimeParamsToUTC(params);
await api.getBookings(utcParams);
```

**Backend:**
```python
# Query params processed through ensure_utc_params
# Validates any time-related filters
# Forwards to API with UTC format
```

## Time Field Detection Patterns

### JavaScript (`utils.js`)
```javascript
const timeFieldPatterns = [
    /^(start|begin|from).*time$/i,
    /^(end|to).*time$/i,
    /^(start|begin|from).*date.*time$/i,
    /^(end|to).*date.*time$/i,
    /^(scheduled|appointment|booking).*time$/i,
    /^(start|begin|from)_date_time$/i,
    /^(end|to)_date_time$/i,
    /^start_at$/i,
    /^end_at$/i,
    /^started_at$/i,
    /^ended_at$/i,
    /^created_at$/i,
    /^updated_at$/i,
    /^datetime$/i,
    /^date_time$/i
];
```

### Python (`api_proxy.py`)
```python
time_field_patterns = [
    'time', 'date', 'datetime', 'start', 'end', 'begin', 'from', 'to',
    'created', 'updated', 'scheduled', 'appointment', 'booking',
    'started_at', 'ended_at', 'created_at', 'updated_at', 'start_at', 'end_at'
]
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Local Timezone)                  │
│                                                               │
│  User Input: "2024-12-07 14:30"                             │
│       ↓                                                       │
│  Utils.convertTimeParamsToUTC()                             │
│       ↓                                                       │
│  UTC: "2024-12-07T19:30:00Z"                                │
└─────────────────────────────────────────────────────────────┘
               ↓ HTTP Request (JSON with UTC)
┌─────────────────────────────────────────────────────────────┐
│              Django Proxy (Backend)                           │
│                                                               │
│  Receives: {"start_time": "2024-12-07T19:30:00Z"}           │
│       ↓                                                       │
│  ensure_utc_params() - Validates & Passes Through           │
│       ↓                                                       │
│  Forwards: {"start_time": "2024-12-07T19:30:00Z"}           │
└─────────────────────────────────────────────────────────────┘
               ↓ HTTP Request (JSON with UTC)
┌─────────────────────────────────────────────────────────────┐
│           External API Service (UTC Timezone)                │
│                                                               │
│  Receives & Stores: "2024-12-07T19:30:00Z" (UTC)            │
│       ↓                                                       │
│  Processing in UTC                                          │
│       ↓                                                       │
│  Response: "2024-12-07T19:30:00Z"                           │
└─────────────────────────────────────────────────────────────┘
               ↓ HTTP Response (JSON with UTC)
┌─────────────────────────────────────────────────────────────┐
│              Django Proxy (Backend)                           │
│                                                               │
│  Returns: {"start_time": "2024-12-07T19:30:00Z"}            │
└─────────────────────────────────────────────────────────────┘
               ↓ HTTP Response (JSON with UTC)
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Local Timezone)                  │
│                                                               │
│  Receives: {"start_time": "2024-12-07T19:30:00Z"}           │
│       ↓                                                       │
│  Utils.convertTimeResponseToLocal()                         │
│       ↓                                                       │
│  Display: "2024-12-07 14:30" (Local Time)                   │
└─────────────────────────────────────────────────────────────┘
```

## Testing Timezone Conversion

### Browser Console Test
```javascript
// Test conversion to UTC
const local = "2024-12-07 14:30";
const utc = Utils.convertToUTC(local);
console.log(utc); // Should be ISO 8601 UTC format

// Test conversion back to local
const back = Utils.convertFromUTC(utc);
console.log(back); // Should match original

// Test object conversion
const data = {
  start_time: "2024-12-07 14:30",
  nested: { end_time: "2024-12-07 15:30" }
};
const converted = Utils.convertTimeParamsToUTC(data);
console.log(converted); // All time fields should be UTC
```

### Browser Information
```javascript
// Check timezone
console.log("Timezone:", Utils.getTimezone());
console.log("Offset (minutes):", Utils.getTimezoneOffset());
```

## Important Notes

1. **ISO 8601 Format**: All UTC times use ISO 8601 format with 'Z' suffix (e.g., `2024-12-07T19:30:00Z`)

2. **No Double Conversion**: 
   - Frontend converts to UTC before sending
   - Backend validates (doesn't convert again)
   - External API expects UTC

3. **Query Parameters**: Both frontend and backend handle UTC conversion for query parameters

4. **Nested Objects**: Both conversion functions recursively handle nested objects and arrays

5. **Null Safety**: All functions safely handle null/undefined values

6. **Data Immutability**: Frontend conversion functions create new objects, preserving originals

7. **Field Detection**: Automatic field detection covers common naming patterns, but custom field names may need manual handling

## Troubleshooting

### Times Off by Several Hours
- Check browser timezone is correct: `Utils.getTimezone()`
- Verify API is using UTC: Check API documentation
- Inspect network requests to confirm UTC format is being sent

### Field Not Converting
- Check field name matches one of the detection patterns
- Add custom logic for non-standard field names
- Use explicit conversion: `Utils.convertToUTC(value)`

### Double Conversion Issues
- Ensure you're not converting data multiple times
- Check that API responses are already in UTC before manual conversion

## Future Enhancements

1. Add custom field name configuration
2. Add timezone serialization to API responses
3. Add localization for date/time display formats
4. Add daylight saving time handling documentation

