/*
  # Admin Functions for User Management
  
  1. New Functions
    - `admin_get_all_users_secure` - Get all users with security info
    - `admin_update_user_secure` - Update user with logging
    - `admin_lock_user` - Lock user account
    - `admin_unlock_user` - Unlock user account
    - `admin_delete_user` - Delete user with logging
    - `log_admin_action` - Log admin actions
    - `get_admin_logs` - Get audit logs
  
  2. New Tables
    - `admin_logs` - Audit trail for admin actions
  
  3. Security
    - All functions run with SECURITY DEFINER to bypass RLS
    - Comprehensive logging of all admin actions
    - Role-based access control
*/

-- Create admin logs table
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  admin_email text,
  action_type text NOT NULL,
  target_user_id uuid,
  target_user_email text,
  action_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_logs
CREATE POLICY "admin_logs_service_role_all"
  ON public.admin_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add role column to user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- Add login_attempts and locked_until columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'login_attempts'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN login_attempts integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN locked_until timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  admin_id uuid,
  action_type text,
  target_user_id uuid,
  action_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_email text;
  v_target_email text;
  v_log_id uuid;
BEGIN
  -- Get admin email if admin_id is provided
  IF admin_id IS NOT NULL THEN
    SELECT email INTO v_admin_email FROM auth.users WHERE id = admin_id;
  END IF;
  
  -- Get target user email if target_user_id is provided
  IF target_user_id IS NOT NULL THEN
    SELECT email INTO v_target_email FROM auth.users WHERE id = target_user_id;
  END IF;
  
  -- Insert log entry
  INSERT INTO public.admin_logs (
    admin_id,
    admin_email,
    action_type,
    target_user_id,
    target_user_email,
    action_details,
    timestamp
  )
  VALUES (
    admin_id,
    v_admin_email,
    action_type,
    target_user_id,
    v_target_email,
    action_details,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to get admin logs
CREATE OR REPLACE FUNCTION public.get_admin_logs(
  limit_count integer DEFAULT 100,
  offset_count integer DEFAULT 0,
  admin_filter uuid DEFAULT NULL,
  action_filter text DEFAULT NULL
)
RETURNS SETOF public.admin_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.admin_logs
  WHERE 
    (admin_filter IS NULL OR admin_id = admin_filter) AND
    (action_filter IS NULL OR action_type = action_filter)
  ORDER BY timestamp DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = user_id;
  RETURN v_role IN ('admin', 'super_admin');
END;
$$;

-- Function to get all users with security info
CREATE OR REPLACE FUNCTION public.admin_get_all_users_secure()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone_number text,
  role text,
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  subscription_status text,
  subscription_end_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  last_login timestamptz,
  login_attempts integer,
  locked_until timestamptz,
  project_count bigint,
  days_remaining integer,
  has_access boolean,
  is_locked boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    COALESCE(au.email::text, 'unknown@example.com') as email,
    up.first_name,
    up.last_name,
    up.phone_number,
    COALESCE(up.role, 'user') as role,
    up.trial_start_date,
    up.trial_end_date,
    up.subscription_status,
    up.subscription_end_date,
    up.created_at,
    up.updated_at,
    au.last_sign_in_at as last_login,
    COALESCE(up.login_attempts, 0) as login_attempts,
    up.locked_until,
    COALESCE(p.project_count, 0) as project_count,
    GREATEST(0, EXTRACT(days FROM (up.trial_end_date - now()))::integer) as days_remaining,
    public.user_has_access(up.id) as has_access,
    COALESCE(up.locked_until > now(), false) as is_locked
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as project_count
    FROM public.projects
    GROUP BY user_id
  ) p ON p.user_id = up.id
  ORDER BY up.created_at DESC;
END;
$$;

-- Function to update user securely
CREATE OR REPLACE FUNCTION public.admin_update_user_secure(
  target_user_id uuid,
  updates jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_data jsonb;
  v_admin_id uuid;
BEGIN
  -- Get current user data for logging
  SELECT row_to_json(up)::jsonb INTO v_old_data
  FROM public.user_profiles up
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Get admin ID
  v_admin_id := auth.uid();
  
  -- Update user profile
  UPDATE public.user_profiles
  SET
    first_name = COALESCE(updates->>'first_name', first_name),
    last_name = COALESCE(updates->>'last_name', last_name),
    phone_number = COALESCE(updates->>'phone_number', phone_number),
    role = COALESCE(updates->>'role', role),
    subscription_status = COALESCE(updates->>'subscription_status', subscription_status),
    subscription_end_date = CASE 
      WHEN updates->>'subscription_end_date' IS NOT NULL 
      THEN (updates->>'subscription_end_date')::timestamptz 
      ELSE subscription_end_date 
    END,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    v_admin_id,
    'update_user',
    target_user_id,
    jsonb_build_object(
      'old_data', v_old_data,
      'updates', updates
    )
  );
  
  RETURN true;
END;
$$;

-- Function to lock user account
CREATE OR REPLACE FUNCTION public.admin_lock_user(
  target_user_id uuid,
  lock_duration interval DEFAULT interval '1 hour'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get admin ID
  v_admin_id := auth.uid();
  
  -- Lock the user
  UPDATE public.user_profiles
  SET
    locked_until = now() + lock_duration,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    v_admin_id,
    'lock_user',
    target_user_id,
    jsonb_build_object(
      'lock_duration', lock_duration,
      'locked_until', (now() + lock_duration)
    )
  );
  
  RETURN true;
END;
$$;

-- Function to unlock user account
CREATE OR REPLACE FUNCTION public.admin_unlock_user(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get admin ID
  v_admin_id := auth.uid();
  
  -- Unlock the user
  UPDATE public.user_profiles
  SET
    locked_until = NULL,
    login_attempts = 0,
    updated_at = now()
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    v_admin_id,
    'unlock_user',
    target_user_id,
    '{}'::jsonb
  );
  
  RETURN true;
END;
$$;

-- Function to delete user
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_id uuid;
  v_user_data jsonb;
BEGIN
  -- Get admin ID
  v_admin_id := auth.uid();
  
  -- Get user data for logging
  SELECT row_to_json(up)::jsonb INTO v_user_data
  FROM public.user_profiles up
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Delete user's projects
  DELETE FROM public.projects
  WHERE user_id = target_user_id;
  
  -- Delete user profile
  DELETE FROM public.user_profiles
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_action(
    v_admin_id,
    'delete_user',
    target_user_id,
    jsonb_build_object(
      'user_data', v_user_data
    )
  );
  
  -- Note: We don't delete from auth.users here as that requires service_role
  -- The application will need to call auth.admin.deleteUser separately
  
  RETURN true;
END;
$$;

-- Function to get user diagnostic info
CREATE OR REPLACE FUNCTION public.admin_get_user_diagnostic()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_auth_users integer := 0;
  total_profiles integer := 0;
  users_without_profiles integer := 0;
  result json;
BEGIN
  -- Count auth users safely
  BEGIN
    SELECT COUNT(*) INTO total_auth_users FROM auth.users;
  EXCEPTION WHEN OTHERS THEN
    total_auth_users := 0;
  END;
  
  -- Count profiles safely
  BEGIN
    SELECT COUNT(*) INTO total_profiles FROM public.user_profiles;
  EXCEPTION WHEN OTHERS THEN
    total_profiles := 0;
  END;
  
  -- Count users without profiles safely
  BEGIN
    SELECT COUNT(*) INTO users_without_profiles 
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON up.id = au.id
    WHERE up.id IS NULL;
  EXCEPTION WHEN OTHERS THEN
    users_without_profiles := 0;
  END;
  
  result := json_build_object(
    'total_auth_users', total_auth_users,
    'total_profiles', total_profiles,
    'users_without_profiles', users_without_profiles,
    'profile_completion_rate', 
    CASE 
      WHEN total_auth_users = 0 THEN 0
      ELSE ROUND((total_profiles::decimal / total_auth_users::decimal) * 100, 2)
    END
  );
  
  RETURN result;
END;
$$;

-- Function to create missing profiles
CREATE OR REPLACE FUNCTION public.admin_create_missing_profiles()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created_count integer := 0;
  auth_user RECORD;
  result json;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.created_at
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.user_profiles (
        id,
        first_name,
        last_name,
        phone_number,
        trial_start_date,
        trial_end_date,
        subscription_status,
        role
      ) VALUES (
        auth_user.id,
        'Unknown',
        'User',
        '000-000-0000',
        COALESCE(auth_user.created_at, now()),
        COALESCE(auth_user.created_at, now()) + interval '7 days',
        'trial',
        'user'
      );
      
      created_count := created_count + 1;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
  
  result := json_build_object(
    'created_profiles', created_count,
    'message', 'Successfully created ' || created_count || ' missing profiles'
  );
  
  RETURN result;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.admin_logs TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.log_admin_action(uuid, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_logs(integer, integer, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users_secure() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_secure(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_lock_user(uuid, interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_unlock_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_user_diagnostic() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_missing_profiles() TO service_role;

-- Success message
SELECT 'SUCCESS: Admin functions created successfully!' as result;