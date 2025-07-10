-- Fix RLS policy violation for user profile creation
-- This migration creates a secure RPC function that bypasses RLS for profile creation

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.create_user_profile_secure(text, text, text);

-- Create the secure profile creation function
CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_first_name text,
  p_last_name text,
  p_phone_number text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  v_user_id uuid;
  v_profile public.user_profiles;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated - cannot create profile';
  END IF;
  
  -- Check if profile already exists
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = v_user_id;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Profile already exists for this user';
  END IF;
  
  -- Insert the new profile (this will bypass RLS due to SECURITY DEFINER)
  INSERT INTO public.user_profiles (
    id,
    first_name,
    last_name,
    phone_number,
    trial_start_date,
    trial_end_date,
    subscription_status,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_first_name,
    p_last_name,
    p_phone_number,
    now(),
    now() + interval '7 days',
    'trial',
    now(),
    now()
  )
  RETURNING * INTO v_profile;
  
  RETURN v_profile;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO service_role;

-- Verify the function was created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'create_user_profile_secure'
  ) THEN
    RAISE NOTICE '✅ create_user_profile_secure function created successfully';
  ELSE
    RAISE EXCEPTION '❌ Failed to create create_user_profile_secure function';
  END IF;
END $$;

-- Success message
SELECT 'SUCCESS: RLS profile creation fix applied!' as result;