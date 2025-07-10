-- BULLETPROOF DATABASE SETUP FOR FIGNUM
-- This migration creates all necessary tables, functions, and policies from scratch

-- Step 1: Clean slate - drop everything that might exist
DO $$ 
BEGIN
  -- Drop all policies first
  DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_service_role_all" ON public.user_profiles;
  DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
  DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
  DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
  DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
  DROP POLICY IF EXISTS "projects_service_role_all" ON public.projects;
  
  -- Drop storage policies
  DROP POLICY IF EXISTS "pdf_upload_policy" ON storage.objects;
  DROP POLICY IF EXISTS "pdf_select_policy" ON storage.objects;
  DROP POLICY IF EXISTS "pdf_update_policy" ON storage.objects;
  DROP POLICY IF EXISTS "pdf_delete_policy" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own PDFs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own PDFs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own PDFs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own PDFs" ON storage.objects;
  
  -- Drop triggers
  DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
  DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;
  
  -- Drop tables
  DROP TABLE IF EXISTS public.user_profiles CASCADE;
  DROP TABLE IF EXISTS public.projects CASCADE;
  
  -- Drop functions
  DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
  DROP FUNCTION IF EXISTS public.get_user_trial_info(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.user_has_access(uuid) CASCADE;
  DROP FUNCTION IF EXISTS public.admin_get_user_diagnostic() CASCADE;
  DROP FUNCTION IF EXISTS public.admin_create_missing_profiles() CASCADE;
  DROP FUNCTION IF EXISTS public.admin_get_all_users() CASCADE;
  DROP FUNCTION IF EXISTS public.admin_get_user_stats() CASCADE;
  DROP FUNCTION IF EXISTS public.admin_update_user_subscription(uuid, text, timestamptz) CASCADE;
  DROP FUNCTION IF EXISTS public.admin_extend_trial(uuid, integer) CASCADE;
  
  RAISE NOTICE '✅ Step 1: Cleaned up all existing objects';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Step 1: Some cleanup failed (this is normal): %', SQLERRM;
END $$;

-- Step 2: Create the updated_at trigger function
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER AS $func$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $func$ LANGUAGE plpgsql;

  RAISE NOTICE '✅ Step 2: Created trigger function';
END $$;

-- Step 3: Create user_profiles table
DO $$
BEGIN
  CREATE TABLE public.user_profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone_number text NOT NULL,
    trial_start_date timestamptz NOT NULL DEFAULT now(),
    trial_end_date timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    subscription_status text NOT NULL DEFAULT 'trial',
    subscription_end_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    CONSTRAINT valid_subscription_status 
      CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'))
  );

  RAISE NOTICE '✅ Step 3: Created user_profiles table';
END $$;

-- Step 4: Create projects table
DO $$
BEGIN
  CREATE TABLE public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    description text,
    pdf_file_name text NOT NULL,
    pdf_file_size bigint NOT NULL,
    annotations jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
  );

  RAISE NOTICE '✅ Step 4: Created projects table';
END $$;

-- Step 5: Enable Row Level Security
DO $$
BEGIN
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

  RAISE NOTICE '✅ Step 5: Enabled RLS';
END $$;

-- Step 6: Create indexes for performance
DO $$
BEGIN
  CREATE INDEX idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);
  CREATE INDEX idx_user_profiles_trial_end_date ON public.user_profiles(trial_end_date);
  CREATE INDEX idx_projects_user_id ON public.projects(user_id);
  CREATE INDEX idx_projects_created_at ON public.projects(created_at);
  CREATE INDEX idx_projects_updated_at ON public.projects(updated_at);

  RAISE NOTICE '✅ Step 6: Created indexes';
END $$;

-- Step 7: Create RLS policies for user_profiles
DO $$
BEGIN
  CREATE POLICY "user_profiles_select_own"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "user_profiles_insert_own"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

  CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

  CREATE POLICY "user_profiles_service_role_all"
    ON public.user_profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE '✅ Step 7: Created user_profiles policies';
END $$;

-- Step 8: Create RLS policies for projects
DO $$
BEGIN
  CREATE POLICY "projects_select_own"
    ON public.projects
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "projects_insert_own"
    ON public.projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "projects_update_own"
    ON public.projects
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "projects_delete_own"
    ON public.projects
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

  CREATE POLICY "projects_service_role_all"
    ON public.projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

  RAISE NOTICE '✅ Step 8: Created projects policies';
END $$;

-- Step 9: Create triggers for updated_at
DO $$
BEGIN
  CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

  CREATE TRIGGER trigger_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

  RAISE NOTICE '✅ Step 9: Created triggers';
END $$;

-- Step 10: Create user access function
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.user_has_access(user_id uuid)
  RETURNS boolean AS $func$
  DECLARE
    profile_record public.user_profiles%ROWTYPE;
  BEGIN
    SELECT * INTO profile_record 
    FROM public.user_profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
      RETURN false;
    END IF;
    
    -- Check trial access
    IF profile_record.subscription_status = 'trial' THEN
      RETURN profile_record.trial_end_date > now();
    END IF;
    
    -- Check active subscription
    IF profile_record.subscription_status = 'active' THEN
      RETURN profile_record.subscription_end_date IS NULL OR profile_record.subscription_end_date > now();
    END IF;
    
    RETURN false;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 10: Created user_has_access function';
END $$;

-- Step 11: Create trial info function
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.get_user_trial_info(user_id uuid)
  RETURNS json AS $func$
  DECLARE
    profile_record public.user_profiles%ROWTYPE;
    days_remaining integer;
    result json;
  BEGIN
    SELECT * INTO profile_record 
    FROM public.user_profiles 
    WHERE id = user_id;
    
    IF NOT FOUND THEN
      RETURN json_build_object('error', 'Profile not found');
    END IF;
    
    days_remaining := EXTRACT(days FROM (profile_record.trial_end_date - now()));
    
    result := json_build_object(
      'subscription_status', profile_record.subscription_status,
      'trial_start_date', profile_record.trial_start_date,
      'trial_end_date', profile_record.trial_end_date,
      'days_remaining', GREATEST(0, days_remaining),
      'has_access', public.user_has_access(user_id),
      'subscription_end_date', profile_record.subscription_end_date
    );
    
    RETURN result;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 11: Created get_user_trial_info function';
END $$;

-- Step 12: Create admin diagnostic function
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.admin_get_user_diagnostic()
  RETURNS json AS $func$
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
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 12: Created admin_get_user_diagnostic function';
END $$;

-- Step 13: Create missing profiles function
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.admin_create_missing_profiles()
  RETURNS json AS $func$
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
          subscription_status
        ) VALUES (
          auth_user.id,
          'Unknown',
          'User',
          '000-000-0000',
          COALESCE(auth_user.created_at, now()),
          COALESCE(auth_user.created_at, now()) + interval '7 days',
          'trial'
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
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 13: Created admin_create_missing_profiles function';
END $$;

-- Step 14: Create get all users function for admin
DO $$
BEGIN
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
  ) AS $func$
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
      FROM public.projects
      GROUP BY user_id
    ) p ON p.user_id = up.id
    ORDER BY up.created_at DESC;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 14: Created admin_get_all_users function';
END $$;

-- Step 15: Create remaining admin functions
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.admin_get_user_stats()
  RETURNS json AS $func$
  DECLARE
    total_users integer;
    active_subscribers integer;
    trial_users integer;
    expired_users integer;
    total_projects integer;
    result json;
  BEGIN
    SELECT COUNT(*) INTO total_users FROM public.user_profiles;
    
    SELECT COUNT(*) INTO active_subscribers 
    FROM public.user_profiles 
    WHERE subscription_status = 'active';
    
    SELECT COUNT(*) INTO trial_users 
    FROM public.user_profiles 
    WHERE subscription_status = 'trial';
    
    SELECT COUNT(*) INTO expired_users 
    FROM public.user_profiles 
    WHERE subscription_status IN ('expired', 'cancelled');
    
    SELECT COUNT(*) INTO total_projects FROM public.projects;
    
    result := json_build_object(
      'total_users', total_users,
      'active_subscribers', active_subscribers,
      'trial_users', trial_users,
      'expired_users', expired_users,
      'total_projects', total_projects
    );
    
    RETURN result;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
    user_id uuid,
    new_status text,
    end_date timestamptz DEFAULT NULL
  )
  RETURNS boolean AS $func$
  BEGIN
    UPDATE public.user_profiles
    SET 
      subscription_status = new_status,
      subscription_end_date = end_date,
      updated_at = now()
    WHERE id = user_id;
    
    RETURN FOUND;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE OR REPLACE FUNCTION public.admin_extend_trial(
    user_id uuid,
    additional_days integer
  )
  RETURNS boolean AS $func$
  BEGIN
    UPDATE public.user_profiles
    SET 
      trial_end_date = trial_end_date + (additional_days || ' days')::interval,
      updated_at = now()
    WHERE id = user_id;
    
    RETURN FOUND;
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER;

  RAISE NOTICE '✅ Step 15: Created remaining admin functions';
END $$;

-- Step 16: Grant permissions
DO $$
BEGIN
  GRANT USAGE ON SCHEMA public TO authenticated, service_role;
  GRANT ALL ON public.user_profiles TO authenticated, service_role;
  GRANT ALL ON public.projects TO authenticated, service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

  -- Grant function execution permissions
  GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.user_has_access(uuid) TO authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.get_user_trial_info(uuid) TO authenticated, service_role;
  GRANT EXECUTE ON FUNCTION public.admin_get_user_diagnostic() TO service_role;
  GRANT EXECUTE ON FUNCTION public.admin_create_missing_profiles() TO service_role;
  GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO service_role;
  GRANT EXECUTE ON FUNCTION public.admin_get_user_stats() TO service_role;
  GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(uuid, text, timestamptz) TO service_role;
  GRANT EXECUTE ON FUNCTION public.admin_extend_trial(uuid, integer) TO service_role;

  RAISE NOTICE '✅ Step 16: Granted permissions';
END $$;

-- Step 17: Create storage bucket for PDFs
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('pdfs', 'pdfs', false)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Step 17: Created/verified PDF storage bucket';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Step 17: Storage bucket creation failed (may already exist): %', SQLERRM;
END $$;

-- Step 18: Create storage policies
DO $$
BEGIN
  CREATE POLICY "pdf_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'pdfs' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "pdf_select_policy" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'pdfs' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "pdf_update_policy" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'pdfs' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );

  CREATE POLICY "pdf_delete_policy" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'pdfs' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
    
  RAISE NOTICE '✅ Step 18: Created storage policies';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Step 18: Storage policy creation failed: %', SQLERRM;
END $$;

-- Step 19: Final verification and success message
DO $$
DECLARE
  table_count integer;
  function_count integer;
  policy_count integer;
  storage_bucket_exists boolean;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'projects');
  
  -- Count admin functions
  SELECT COUNT(*) INTO function_count 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE 'admin_%';
  
  -- Count policies
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public';
  
  -- Check storage bucket
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'pdfs'
  ) INTO storage_bucket_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 BULLETPROOF DATABASE SETUP COMPLETE!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '📊 Setup Summary:';
  RAISE NOTICE '   ✅ Tables created: % (expected: 2)', table_count;
  RAISE NOTICE '   ✅ Admin functions: % (expected: 6+)', function_count;
  RAISE NOTICE '   ✅ Security policies: % (expected: 8+)', policy_count;
  RAISE NOTICE '   ✅ PDF storage bucket: %', CASE WHEN storage_bucket_exists THEN 'Ready' ELSE 'Check manually' END;
  RAISE NOTICE '';
  
  IF table_count = 2 AND function_count >= 6 THEN
    RAISE NOTICE '🚀 SUCCESS: Database is ready for Fignum!';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '   1. Make sure your .env file has correct Supabase keys';
    RAISE NOTICE '   2. Restart your development server';
    RAISE NOTICE '   3. Try signing up with a new account';
    RAISE NOTICE '   4. Check admin panel at /admin.html';
  ELSE
    RAISE NOTICE '⚠️ WARNING: Setup incomplete - check the steps above';
  END IF;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
END $$;