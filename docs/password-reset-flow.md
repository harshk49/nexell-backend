# Password Reset Flow

## Overview

The password reset flow allows users to reset their password when they've forgotten it. This document outlines the necessary components and steps involved.

## Data Model Extensions

The User model already includes these fields to support password reset:

- `passwordResetToken`: String - Stores the hashed reset token
- `passwordResetExpires`: Date - Token expiration time (typically 10 minutes from creation)

## Endpoints

### 1. Request Password Reset (`POST /api/auth/forgotpassword`)

**Purpose**: Initiates the password reset process by requesting a reset token.

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

**Process**:

1. Find user with provided email
2. Generate a random reset token
3. Hash the token and save to user record with expiration time
4. Send email with reset link containing the unhashed token

**Response**:

- Success (200): `{ "status": "success", "message": "Token sent to email" }`
- Error (404): `{ "status": "fail", "message": "There is no user with that email" }`

### 2. Reset Password (`PATCH /api/auth/resetpassword/:token`)

**Purpose**: Validates the token and updates the user's password.

**URL Params**:

- `token`: The unhashed password reset token

**Request Body**:

```json
{
  "password": "newPassword123"
}
```

**Process**:

1. Hash the token from URL parameter
2. Find user with matching hashed token that hasn't expired
3. Update user's password
4. Clear the reset token and expiration fields
5. Update passwordChangedAt timestamp
6. Log user in (send JWT)

**Response**:

- Success (200): `{ "status": "success", "token": "jwt_token", "data": { "user": {...} } }`
- Error (400): `{ "status": "fail", "message": "Token is invalid or has expired" }`

## Email Service

A service will be created to:

1. Format and send password reset emails
2. Include a link with the reset token: `https://nexell-app.com/reset-password/{token}`
3. Include instructions and expiration information

## Security Considerations

1. Token expiration: 10 minutes from creation
2. One-time use tokens (invalidated after use)
3. Server-side validation of password strength
4. Rate limiting on the forgot password endpoint
5. Token hashing in the database (never store raw tokens)
6. Token sent via email only, not exposed in API responses in production

## Future Enhancements

1. Notification when password is changed
2. Activity logs for security events
3. Require current password for logged-in users changing password
4. Multi-factor authentication integration
