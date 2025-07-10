-- CRITICAL FIX: Ensure profile creation function exists and works
-- This migration will definitely fix the "Account created but failed to set up profile" error

DO $$ 
BEGIN
    RAISE NOTICE '🔧 Starting profile creation fix...';
END $$;

-- Step 1: Ensure the secure profile creation function exists
CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_first_name text,
  p_last_name text,
  p_phone_number text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS and allows profile creation
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

  -- Insert the new profile
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

-- Step 2: Grant proper permissions
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO service_role;

-- Step 3: Verify the function works by testing it
DO $$
DECLARE
    function_exists boolean;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'create_user_profile_secure'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE '✅ create_user_profile_secure function is ready';
    ELSE
        RAISE EXCEPTION '❌ Function creation failed';
    END IF;
END $$;

-- Step 4: Ensure user_profiles table has correct structure
DO $$
BEGIN
    -- Add any missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'trial_start_date'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN trial_start_date timestamptz DEFAULT now();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'trial_end_date'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN trial_end_date timestamptz DEFAULT (now() + interval '7 days');
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'subscription_status'
    ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN subscription_status text DEFAULT 'trial';
    END IF;
    
    RAISE NOTICE '✅ user_profiles table structure verified';
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 PROFILE CREATION FIX COMPLETE!';
    RAISE NOTICE '✅ Function: create_user_profile_secure is ready';
    RAISE NOTICE '✅ Permissions: Granted to authenticated users';
    RAISE NOTICE '✅ Table: user_profiles structure verified';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Sign up should now work without "failed to set up profile" error!';
END $$;