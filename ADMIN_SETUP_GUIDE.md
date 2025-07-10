# 🔐 Secure Admin System Setup Guide

## Overview

This secure admin system provides:
- ✅ **Role-Based Access Control (RBAC)** with user, admin, and super_admin roles
- ✅ **Comprehensive Audit Logging** of all admin actions
- ✅ **Session Management** with automatic expiration
- ✅ **Rate Limiting** to prevent brute force attacks
- ✅ **Input Validation** and sanitization
- ✅ **User Management** with lock/unlock capabilities
- ✅ **Security Monitoring** and logging

## Step 1: Apply Database Migration

1. **Go to your Supabase dashboard**
2. **Navigate to SQL Editor**
3. **Click "New Query"**
4. **Copy and paste the entire migration from `supabase/migrations/20250620000000_secure_admin_system.sql`**
5. **Click "Run"**
6. **Wait for "SUCCESS" message**

## Step 2: Create Your First Admin User

1. **Sign up a regular user** through your app
2. **Go to Supabase dashboard → Table Editor → user_profiles**
3. **Find the user you just created**
4. **Edit the user and change their `role` to `admin` or `super_admin`**
5. **Save the changes**

## Step 3: Access the Admin Panel

1. **Go to:** `http://localhost:5173/admin.html`
2. **Login with:**
   - Username: `admin`
   - Password: `fignum2024!`
3. **You should see the secure admin dashboard**

## Features Overview

### User Management
- **View all users** with detailed information
- **Edit user profiles** (name, phone, role, subscription)
- **Lock/unlock user accounts** for security
- **Delete user accounts** with confirmation
- **Filter and search** users by various criteria
- **Export user data** to CSV

### Role-Based Access Control
- **User**: Regular app users
- **Admin**: Can manage users and view logs
- **Super Admin**: Full administrative access

### Audit Logging
- **All admin actions** are automatically logged
- **View detailed logs** with timestamps and details
- **Track user modifications** with before/after data
- **Monitor login/logout events**
- **IP address and user agent tracking**

### Security Features
- **Rate limiting** on login attempts
- **Session management** with automatic expiration
- **Input validation** and sanitization
- **Password strength requirements**
- **Account locking** after failed attempts

### Session Management
- **8-hour session duration** by default
- **Automatic session cleanup**
- **Session token validation**
- **Secure logout** with audit trail

## Database Functions

The system includes these secure functions:

### User Management
- `admin_get_all_users_secure()` - Get all users with security info
- `admin_update_user_secure(user_id, updates)` - Update user with logging
- `admin_lock_user(user_id, duration)` - Lock user account
- `admin_unlock_user(user_id)` - Unlock user account
- `admin_delete_user(user_id)` - Delete user with logging

### Audit & Logging
- `log_admin_action(admin_id, action, target_user_id, details)` - Log admin actions
- `get_admin_logs(limit, offset, admin_filter, action_filter)` - Get audit logs

### Security
- `is_admin(user_id)` - Check if user has admin privileges
- `create_admin_session(admin_id, token, ip, user_agent)` - Create admin session
- `cleanup_expired_sessions()` - Remove expired sessions

## Security Best Practices

### For Production Use:

1. **Change Default Credentials**
   ```typescript
   // In AdminApp.tsx, update:
   const ADMIN_CREDENTIALS = {
     username: 'your_secure_username',
     password: 'your_very_secure_password_123!',
     role: 'super_admin'
   };
   ```

2. **Enable HTTPS**
   - Always use HTTPS in production
   - Secure cookie settings
   - HSTS headers

3. **Environment Variables**
   ```env
   VITE_ADMIN_USERNAME=your_secure_username
   VITE_ADMIN_PASSWORD=your_secure_password
   VITE_SESSION_SECRET=your_session_secret_key
   ```

4. **Rate Limiting**
   - The system includes built-in rate limiting
   - 5 failed attempts = 30-minute block
   - Configurable in `adminSecurity.ts`

5. **Session Security**
   - Sessions expire after 8 hours
   - Secure token generation
   - Automatic cleanup of expired sessions

6. **Input Validation**
   - All inputs are sanitized
   - SQL injection prevention
   - XSS protection

## Monitoring & Alerts

### Security Events Logged:
- Login attempts (success/failure)
- User modifications
- Account locks/unlocks
- User deletions
- Session events
- Unauthorized access attempts

### Audit Trail Includes:
- Timestamp of action
- Admin who performed action
- Target user (if applicable)
- IP address and user agent
- Detailed change information
- Before/after data for modifications

## Troubleshooting

### Common Issues:

1. **"Access denied: Admin privileges required"**
   - Make sure the user has `admin` or `super_admin` role in user_profiles table

2. **"Function does not exist"**
   - Ensure the migration was applied successfully
   - Check Supabase logs for any errors

3. **Login fails with correct credentials**
   - Check browser console for errors
   - Verify Supabase connection
   - Check rate limiting status

4. **Audit logs not appearing**
   - Verify the user has admin privileges
   - Check if the logging functions are working
   - Look for errors in browser console

### Debug Steps:

1. **Check Supabase connection**
2. **Verify user role in database**
3. **Check browser console for errors**
4. **Test database functions in SQL Editor**
5. **Review audit logs for any security events**

## API Reference

### Admin Functions

```sql
-- Check if user is admin
SELECT public.is_admin('user-uuid-here');

-- Get all users (admin only)
SELECT * FROM public.admin_get_all_users_secure();

-- Update user (admin only)
SELECT public.admin_update_user_secure(
  'user-uuid',
  '{"role": "admin", "subscription_status": "active"}'::jsonb
);

-- Lock user account
SELECT public.admin_lock_user('user-uuid', '1 hour'::interval);

-- Get audit logs
SELECT * FROM public.get_admin_logs(50, 0, null, null);
```

This secure admin system provides enterprise-level security and audit capabilities for your Fignum application!