-- Fix user profiles creation and policies
-- This migration ensures user profiles are created properly during signup

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to create their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can manage all user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_role_all" ON public.user_profiles;

-- Ensure the user_profiles table has the role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN role text DEFAULT 'user';
  END IF;
END $$;

-- Create the secure profile creation function
CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_first_name text,
  p_last_name text,
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  user_id uuid;
  result_data json;
BEGIN
  -- Get the user ID from the current authenticated session
  SELECT auth.uid() INTO user_id;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = user_id) THEN
    -- Return existing profile
    SELECT to_json(up.*) INTO result_data
    FROM public.user_profiles up
    WHERE id = user_id;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Profile already exists',
      'data', result_data
    );
  END IF;

  -- Insert into user_profiles table
  INSERT INTO public.user_profiles (
    id,
    first_name,
    last_name,
    phone_number,
    trial_start_date,
    trial_end_date,
    subscription_status,
    role,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    p_first_name,
    p_last_name,
    p_phone_number,
    now(),
    (now() + interval '7 days'),
    'trial',
    'user',
    now(),
    now()
  );

  -- Get the created profile
  SELECT to_json(up.*) INTO result_data
  FROM public.user_profiles up
  WHERE id = user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'data', result_data
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for user_profiles
CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_insert_own"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_update_own"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "user_profiles_service_role_all"
  ON public.user_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO service_role;

-- Create a function to get all users for admin (enhanced)
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
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
  project_count bigint,
  days_remaining integer,
  has_access boolean
) AS $$
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
    COALESCE(p.project_count, 0) as project_count,
    GREATEST(0, EXTRACT(days FROM (up.trial_end_date - now()))::integer) as days_remaining,
    (up.subscription_status = 'active' OR 
     (up.subscription_status = 'trial' AND up.trial_end_date > now())) as has_access
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as project_count
    FROM public.projects
    GROUP BY user_id
  ) p ON p.user_id = up.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to execute admin function
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO service_role;

-- Success message
SELECT 'SUCCESS: User profiles system fixed!' as result;