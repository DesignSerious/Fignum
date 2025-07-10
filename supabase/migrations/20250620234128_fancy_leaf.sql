/*
  # Complete Fignum Database Setup
  
  This migration creates all necessary tables, functions, and policies for Fignum.
  
  1. Tables
    - user_profiles: User account information and trial status
    - projects: Patent annotation projects
  
  2. Security
    - Row Level Security (RLS) enabled
    - Users can only access their own data
    - Service role has full access for admin functions
  
  3. Functions
    - create_user_profile_secure: Secure profile creation
    - get_user_trial_info: Get user trial information
    - user_has_access: Check if user has active access
    - admin functions for user management
  
  4. Storage
    - PDF storage bucket with proper policies
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
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

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
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

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_end_date ON public.user_profiles(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON public.projects(updated_at);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_role_all" ON public.user_profiles;
DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
DROP POLICY IF EXISTS "projects_service_role_all" ON public.projects;

-- Create RLS policies for user_profiles
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

-- Create RLS policies for projects
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

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS trigger_projects_updated_at ON public.projects;

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create secure profile creation function
CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_first_name text,
  p_last_name text,
  p_phone_number text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_profile public.user_profiles;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  SELECT * INTO v_profile FROM public.user_profiles WHERE id = v_user_id;
  
  IF FOUND THEN
    RAISE EXCEPTION 'Profile already exists for this user';
  END IF;
  
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

-- Create user access function
CREATE OR REPLACE FUNCTION public.user_has_access(user_id uuid)
RETURNS boolean AS $$
DECLARE
  profile_record public.user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_record 
  FROM public.user_profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  IF profile_record.subscription_status = 'trial' THEN
    RETURN profile_record.trial_end_date > now();
  END IF;
  
  IF profile_record.subscription_status = 'active' THEN
    RETURN profile_record.subscription_end_date IS NULL OR profile_record.subscription_end_date > now();
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trial info function
CREATE OR REPLACE FUNCTION public.get_user_trial_info(user_id uuid)
RETURNS json AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin functions
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
    FROM public.projects
    GROUP BY user_id
  ) p ON p.user_id = up.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT ALL ON public.projects TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_trial_info(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO service_role;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "pdf_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "pdf_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "pdf_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "pdf_delete_policy" ON storage.objects;

-- Create storage policies
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

-- Success message
SELECT 'SUCCESS: Fignum database setup complete!' as result;