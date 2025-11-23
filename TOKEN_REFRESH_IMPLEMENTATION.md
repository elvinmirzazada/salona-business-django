# Token Refresh Implementation Summary

## Overview
Implemented automatic token refresh functionality to handle expired access tokens seamlessly. When an access token expires, the system automatically attempts to refresh it using the refresh token stored in HTTP-only cookies.

## Implementation Details

### Backend (Django) - `users/api_proxy.py`

#### New Methods Added to `APIProxyView`:

1. **`refresh_access_token(request)`**
   - Attempts to refresh the access token using the refresh token from cookies
   - Calls `/api/v1/users/auth/refresh-token` endpoint
   - Returns tuple: `(success: bool, new_access_token: str|None, new_refresh_token: str|None)`

2. **`clear_auth_cookies(response)`**
   - Clears all authentication cookies by setting them to expire
   - Used when token refresh fails to ensure clean logout

3. **Enhanced `forward_request(request, path, retry_count=0)`**
   - Detects 401 errors with "Access token has expired" message
   - Automatically attempts token refresh
   - Retries the original request with new tokens
   - Sets new tokens as HTTP-only cookies
   - If refresh fails, clears all cookies and returns 401

#### Flow:
```
API Request → 401 Error → Check if "Access token has expired" → 
Refresh Token → Success → Retry Request with New Token → 
Return Response with New Cookies

OR

API Request → 401 Error → Check if "Access token has expired" → 
Refresh Token → Failed → Clear All Cookies → Return 401
```

### Backend (Django) - `users/views.py`

#### New Methods Added to `GeneralView`:

1. **`refresh_access_token(request)`**
   - Attempts to refresh the access token using the refresh token from cookies
   - Calls `/api/v1/users/auth/refresh-token` endpoint
   - Returns tuple: `(success: bool, new_access_token: str|None, new_refresh_token: str|None)`

2. **`make_authenticated_request(request, url, method='GET', data=None, retry_count=0)`**
   - Universal method for making authenticated API requests with automatic token refresh
   - Supports GET, POST, and PUT methods
   - Detects 401 errors with "Access token has expired" message
   - Automatically attempts token refresh on expired tokens
   - Retries the original request with new tokens
   - Returns tuple: `(success: bool, response_data: dict|None, updated_cookies: dict|None)`

3. **Updated Methods Using Token Refresh:**
   - `get_current_user(request)` - Now uses `make_authenticated_request()` with automatic refresh
   - `get_unread_notifications_count(request)` - Now uses `make_authenticated_request()` with automatic refresh
   - `get_staff(request)` - Now uses `make_authenticated_request()` with automatic refresh

#### Benefits:
- All Django view methods that fetch data now automatically handle token expiration
- No more silent logouts when tokens expire
- Users get seamless experience without interruption
- Cookies are automatically updated when refresh occurs

### Frontend (JavaScript) - `static/js/api-client.js`

#### New Properties:
- `isRefreshing`: Flag to prevent multiple simultaneous refresh attempts
- `refreshSubscribers`: Queue to hold pending requests during token refresh

#### New Methods:

1. **`refreshToken()`**
   - Makes POST request to `/users/api/v1/users/auth/refresh-token`
   - Returns boolean indicating success/failure

2. **`performLogout()`**
   - Calls logout endpoint to clear server-side cookies
   - Redirects to login page

3. **`subscribeTokenRefresh(callback)`**
   - Adds request to queue while token is being refreshed

4. **`onTokenRefreshed()`**
   - Executes all queued requests after successful token refresh

5. **Enhanced `request(url, options)`**
   - Detects 401 errors with "Access token has expired" message
   - Prevents multiple simultaneous refresh attempts using `isRefreshing` flag
   - Queues requests if refresh is already in progress
   - Automatically retries failed requests after successful token refresh
   - Logs out user if token refresh fails

6. **`handleResponse(response)`**
   - Extracted response parsing logic for reuse

#### Flow:
```
API Request → 401 Error → Check "Access token has expired" → 
Is Already Refreshing? → Yes → Queue Request
                       → No → Start Refresh → 
Success → Retry Request + Execute Queue → Return Response

OR

API Request → 401 Error → Check "Access token has expired" → 
Refresh Token → Failed → Logout → Redirect to Login
```

## Security Features

1. **HTTP-Only Cookies**: All tokens are stored in HTTP-only cookies, preventing XSS attacks
2. **Automatic Cleanup**: Failed refresh attempts automatically clear all authentication cookies
3. **Single Refresh Attempt**: Prevents infinite loops by limiting retry to once per request
4. **Request Queuing**: Prevents race conditions when multiple requests fail simultaneously

## Token Expiration Handling

### When Access Token Expires:
1. API returns 401 with detail: "Access token has expired"
2. System automatically calls refresh endpoint with refresh token
3. If successful: New tokens are saved to HTTP-only cookies
4. Original request is retried with new tokens
5. User continues working without interruption

### When Refresh Token Fails:
1. All authentication cookies are cleared
2. User is logged out
3. User is redirected to login page

## Cookie Configuration

### Access Token:
- **Max Age**: 6 hours (21,600 seconds)
- **HttpOnly**: true
- **Secure**: true (in production)
- **SameSite**: Strict

### Refresh Token:
- **Max Age**: 24 hours (86,400 seconds)
- **HttpOnly**: true
- **Secure**: true (in production)
- **SameSite**: Strict

## Testing Recommendations

1. **Test Token Expiration**: Verify automatic refresh when access token expires
2. **Test Refresh Failure**: Ensure proper logout when refresh token is invalid
3. **Test Concurrent Requests**: Verify request queuing works correctly
4. **Test Manual Logout**: Ensure all cookies are cleared properly
5. **Test Security**: Verify tokens are not accessible via JavaScript
6. **Test Django Views**: Verify that page loads don't cause unexpected logouts when tokens expire

## API Endpoint Used

**POST** `/api/v1/users/auth/refresh-token`
- **Request**: Includes `refresh_token` in HTTP-only cookie
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "access_token": "new_access_token",
      "refresh_token": "new_refresh_token"
    }
  }
  ```

## Implementation Layers

### Layer 1: API Proxy (`api_proxy.py`)
- Handles all API requests from frontend JavaScript
- Automatically refreshes tokens and retries requests
- Returns updated cookies to browser

### Layer 2: Django Views (`views.py`)
- Handles server-side rendering requests
- Uses `make_authenticated_request()` for all API calls
- Automatically refreshes tokens during page loads
- Updates cookies in request object for subsequent calls

### Layer 3: Frontend (`api-client.js`)
- Handles client-side AJAX requests
- Queues concurrent requests during refresh
- Logs out user if refresh fails

## Benefits

1. **Seamless User Experience**: Users don't experience interruptions due to token expiration
2. **Enhanced Security**: Tokens stored in HTTP-only cookies
3. **Automatic Cleanup**: Failed refresh attempts trigger logout
4. **No Code Changes Required**: Existing API calls automatically benefit from token refresh
5. **Race Condition Prevention**: Request queuing prevents multiple refresh attempts
6. **Server-Side Support**: Django views now handle token refresh during page loads
7. **Consistent Behavior**: Same refresh logic across all layers (proxy, views, frontend)

## Notes

- Token refresh is attempted only once per request to prevent infinite loops
- The retry_count parameter in backend prevents recursion
- The isRefreshing flag in frontend prevents concurrent refresh attempts
- All queued requests are executed after successful token refresh
- Django views update request.COOKIES when tokens are refreshed
- The `make_authenticated_request()` helper standardizes API calls in views
