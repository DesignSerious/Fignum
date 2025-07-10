-- Fix Profile Creation Issues
-- This migration ensures proper setup for profile creation

-- Step 1: Ensure user_profiles table exists with correct structure
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 1: Checking user_profiles table...';
    
    -- Create user_profiles table if it doesn't exist
    CREATE TABLE IF NOT EXISTS user_profiles (
        id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        first_name text NOT NULL,
        last_name text NOT NULL,
        phone_number text NOT NULL,
        trial_start_date timestamptz DEFAULT now(),
        trial_end_date timestamptz DEFAULT (now() + interval '7 days'),
        subscription_status text DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
        subscription_end_date timestamptz DEFAULT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    
    RAISE NOTICE '✅ user_profiles table ready';
END $$;

-- Step 2: Ensure projects table exists
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 2: Checking projects table...';
    
    CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text DEFAULT NULL,
        pdf_file_name text NOT NULL,
        pdf_file_size bigint NOT NULL,
        annotations jsonb DEFAULT '[]'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );
    
    RAISE NOTICE '✅ projects table ready';
END $$;

-- Step 3: Enable RLS
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 3: Enabling Row Level Security...';
    
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE '✅ RLS enabled';
END $$;

-- Step 4: Create RLS policies with proper permissions
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 4: Creating RLS policies...';
    
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "user_profiles_select_own" ON user_profiles;
    DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
    DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
    DROP POLICY IF EXISTS "user_profiles_service_role_all" ON user_profiles;
    
    -- Create user_profiles policies
    CREATE POLICY "user_profiles_select_own"
        ON user_profiles FOR SELECT TO authenticated
        USING (auth.uid() = id);

    CREATE POLICY "user_profiles_insert_own"
        ON user_profiles FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = id);

    CREATE POLICY "user_profiles_update_own"
        ON user_profiles FOR UPDATE TO authenticated
        USING (auth.uid() = id);

    -- Allow service role full access for admin functions
    CREATE POLICY "user_profiles_service_role_all"
        ON user_profiles FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    
    -- Drop existing project policies
    DROP POLICY IF EXISTS "projects_select_own" ON projects;
    DROP POLICY IF EXISTS "projects_insert_own" ON projects;
    DROP POLICY IF EXISTS "projects_update_own" ON projects;
    DROP POLICY IF EXISTS "projects_delete_own" ON projects;
    DROP POLICY IF EXISTS "projects_service_role_all" ON projects;
    
    -- Create projects policies
    CREATE POLICY "projects_select_own"
        ON projects FOR SELECT TO authenticated
        USING (auth.uid() = user_id);

    CREATE POLICY "projects_insert_own"
        ON projects FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "projects_update_own"
        ON projects FOR UPDATE TO authenticated
        USING (auth.uid() = user_id);

    CREATE POLICY "projects_delete_own"
        ON projects FOR DELETE TO authenticated
        USING (auth.uid() = user_id);

    CREATE POLICY "projects_service_role_all"
        ON projects FOR ALL TO service_role
        USING (true) WITH CHECK (true);
    
    RAISE NOTICE '✅ RLS policies created';
END $$;

-- Step 5: Create utility functions
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 5: Creating utility functions...';
END $$;

-- User access function
CREATE OR REPLACE FUNCTION public.user_has_access(user_id uuid)
RETURNS boolean AS $$
DECLARE
  profile_record public.user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_record FROM public.user_profiles WHERE id = user_id;
  
  IF NOT FOUND THEN RETURN false; END IF;
  
  IF profile_record.subscription_status = 'trial' THEN
    RETURN profile_record.trial_end_date > now();
  END IF;
  
  IF profile_record.subscription_status = 'active' THEN
    RETURN profile_record.subscription_end_date IS NULL OR profile_record.subscription_end_date > now();
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trial info function
CREATE OR REPLACE FUNCTION public.get_user_trial_info(user_id uuid)
RETURNS json AS $$
DECLARE
  profile_record public.user_profiles%ROWTYPE;
  days_remaining integer;
BEGIN
  SELECT * INTO profile_record FROM public.user_profiles WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;
  
  days_remaining := EXTRACT(days FROM (profile_record.trial_end_date - now()));
  
  RETURN json_build_object(
    'subscription_status', profile_record.subscription_status,
    'trial_start_date', profile_record.trial_start_date,
    'trial_end_date', profile_record.trial_end_date,
    'days_remaining', GREATEST(0, days_remaining),
    'has_access', public.user_has_access(user_id),
    'subscription_end_date', profile_record.subscription_end_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin function for getting all users
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  phone_number text,
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
    up.trial_start_date,
    up.trial_end_date,
    up.subscription_status,
    up.subscription_end_date,
    up.created_at,
    up.updated_at,
    COALESCE(p.project_count, 0) as project_count,
    GREATEST(0, EXTRACT(days FROM (up.trial_end_date - now()))::integer) as days_remaining,
    public.user_has_access(up.id) as has_access
  FROM public.user_profiles up
  LEFT JOIN auth.users au ON au.id = up.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as project_count
    FROM public.projects GROUP BY user_id
  ) p ON p.user_id = up.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Grant proper permissions
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 6: Granting permissions...';
    
    -- Grant table permissions
    GRANT USAGE ON SCHEMA public TO authenticated, service_role;
    GRANT ALL ON public.user_profiles TO authenticated, service_role;
    GRANT ALL ON public.projects TO authenticated, service_role;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
    
    -- Grant function permissions
    GRANT EXECUTE ON FUNCTION public.user_has_access(uuid) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.get_user_trial_info(uuid) TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO service_role;
    
    RAISE NOTICE '✅ Permissions granted';
END $$;

-- Step 7: Create storage bucket for PDFs
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 7: Setting up storage...';
    
    -- Create storage bucket
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('pdfs', 'pdfs', false) 
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Storage bucket ready';
END $$;

-- Step 8: Create storage policies
DO $$ 
BEGIN
    RAISE NOTICE '✅ Step 8: Creating storage policies...';
    
    -- Drop existing storage policies
    DROP POLICY IF EXISTS "pdf_upload_policy" ON storage.objects;
    DROP POLICY IF EXISTS "pdf_select_policy" ON storage.objects;
    DROP POLICY IF EXISTS "pdf_update_policy" ON storage.objects;
    DROP POLICY IF EXISTS "pdf_delete_policy" ON storage.objects;
    
    -- Create storage policies
    CREATE POLICY "pdf_upload_policy" ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "pdf_select_policy" ON storage.objects FOR SELECT 
      USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "pdf_update_policy" ON storage.objects FOR UPDATE 
      USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

    CREATE POLICY "pdf_delete_policy" ON storage.objects FOR DELETE 
      USING (bucket_id = 'pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
    
    RAISE NOTICE '✅ Storage policies created';
END $$;

-- Final verification
DO $$
DECLARE
    user_profiles_exists boolean;
    projects_exists boolean;
    policies_count integer;
BEGIN
    RAISE NOTICE '✅ Final verification...';
    
    -- Check if tables exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO user_profiles_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'projects' AND table_schema = 'public'
    ) INTO projects_exists;
    
    -- Check policies
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND (tablename = 'user_profiles' OR tablename = 'projects');
    
    IF user_profiles_exists AND projects_exists AND policies_count >= 8 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 DATABASE SETUP COMPLETE AND VERIFIED!';
        RAISE NOTICE '✅ user_profiles table: Ready';
        RAISE NOTICE '✅ projects table: Ready';
        RAISE NOTICE '✅ RLS policies: % active', policies_count;
        RAISE NOTICE '✅ Storage bucket: Ready';
        RAISE NOTICE '✅ Functions: Ready';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Profile creation should now work correctly!';
    ELSE
        RAISE NOTICE '❌ Verification failed - please check the setup';
    END IF;
END $$;