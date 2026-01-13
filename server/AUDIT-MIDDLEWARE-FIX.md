# Audit Middleware User Detection Fix

## Issue
You were seeing warnings like:
```
⚠️ Audit middleware: Using fallback user ID for unknown user
```

Even though you were logged in as `atul_dev`.

## Root Cause Analysis

The audit middleware extracts user information from:
1. `req.currentUser` (if set by auth middleware)
2. `req.user` (if set by passport/session)
3. Request headers: `user-id`, `username`, `user-role`
4. Request body: `userId`, `username`, `userRole`

The warning appears when the username is "unknown", which can happen if:
- Headers are not being sent
- Headers are being sent with different casing
- The request is made before authentication
- The request bypasses the axios interceptor

## Changes Made

### 1. Case-Insensitive Header Access
**File:** `server/middleware/auditTrail.mjs`

Added header normalization to handle case sensitivity:
```javascript
// Normalize headers to lowercase for case-insensitive access
const normalizedHeaders = {};
Object.keys(req.headers).forEach(key => {
  normalizedHeaders[key.toLowerCase()] = req.headers[key];
});
```

### 2. Additional Header Fallbacks
Added support for alternative header names:
- `x-username` as fallback for `username`
- `x-user-role` as fallback for `user-role`

### 3. Improved Debug Logging
Now only logs when username is actually "unknown", showing:
- Which endpoint triggered the warning
- All available headers
- What was extracted from body
- Complete user info object

### 4. Better Warning Messages
The warning now includes:
- The endpoint that triggered it
- The username value
- The generated user ID

## How to Verify

1. **Check the server console** - You should now see detailed debug logs only when username is "unknown"
2. **Look for the endpoint** - The warning will show which API endpoint is being called without proper headers
3. **Verify headers** - The debug log will show all headers being sent

## Expected Behavior

### ✅ Normal Requests (After Login)
- No warnings
- Headers properly extracted: `atul_dev`
- Unique user ID created/retrieved

### ⚠️ Requests Without Auth
Some requests might legitimately not have user info:
- Initial page loads
- Public endpoints
- Health checks
- Static file requests

These will show the warning with the endpoint name, which helps identify if it's expected or not.

## Next Steps

If you still see warnings:
1. Check the debug output to see which endpoint is triggering it
2. Verify that endpoint should have user authentication
3. Check if the axios interceptor is being applied to that request
4. Look for any requests made outside of axios (e.g., fetch, XMLHttpRequest)

## Client-Side Headers (Already Correct)

The client is correctly setting headers in `App.jsx`:
```javascript
config.headers["username"] = user.username || "unknown";
config.headers["user-id"] = user._id || "unknown";
config.headers["user-role"] = user.role || "unknown";
```

This is working correctly for authenticated requests.
