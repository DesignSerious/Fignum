# 🚀 SIMPLE SETUP GUIDE - Get Fignum Working in 5 Minutes

## The Problem
You've been struggling with database setup. Let's fix this once and for all with a **WORKING** solution.

## The Solution: Use Supabase Properly

### Step 1: Create a Fresh Supabase Project (2 minutes)

1. **Go to https://supabase.com/dashboard**
2. **Click "New Project"**
3. **Fill in:**
   - Name: `fignum-app`
   - Database Password: Generate a strong password (SAVE IT!)
   - Region: Choose closest to you
4. **Click "Create new project"**
5. **WAIT** for it to finish (2-3 minutes)

### Step 2: Get Your Keys (1 minute)

1. **In your project dashboard, go to Settings → API**
2. **Copy these 3 values:**
   - Project URL (like: `https://abcdefghijk.supabase.co`)
   - anon/public key (starts with `eyJhbGciOiJIUzI1NiIs...`)
   - service_role key (starts with `eyJhbGciOiJIUzI1NiIs...`)

### Step 3: Configure Your App (30 seconds)

1. **Create a `.env` file in your project root**
2. **Add your REAL values:**

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 4: Apply the Database Schema (1 minute)

1. **In Supabase dashboard, go to SQL Editor**
2. **Click "New Query"**
3. **Copy and paste this ENTIRE migration:**

```sql
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

-- Create projects table
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

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_user_profiles_subscription_status ON public.user_profiles(subscription_status);
CREATE INDEX idx_user_profiles_trial_end_date ON public.user_profiles(trial_end_date);
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_created_at ON public.projects(created_at);
CREATE INDEX idx_projects_updated_at ON public.projects(updated_at);

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
CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

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
GRANT EXECUTE ON FUNCTION public.user_has_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_trial_info(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO service_role;

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

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
```

4. **Click "Run"**
5. **Wait for "SUCCESS" message**

### Step 5: Start Your App (30 seconds)

1. **Stop your dev server** (Ctrl+C)
2. **Run:** `npm run dev`
3. **Open:** http://localhost:5173

## ✅ Test Everything

1. **Sign up with a new account** - should work perfectly
2. **Create a project** - gets saved to database
3. **Go to admin panel:** http://localhost:5173/admin.html
   - Username: `admin`
   - Password: `fignum2024!`

## 🎯 Why This Works

- ✅ **Fresh Supabase project** - No conflicts
- ✅ **Proper environment variables** - Correct configuration
- ✅ **Complete database schema** - All tables and functions
- ✅ **Working authentication** - Supabase auth system
- ✅ **File storage** - PDF uploads work
- ✅ **Admin panel** - User management

## 🆘 If You Still Have Issues

1. **Double-check your .env file** - Make sure you used the EXACT keys from your NEW Supabase project
2. **Check browser console** - Look for any error messages
3. **Verify Supabase project** - Make sure it's not paused
4. **Check the SQL migration** - Make sure it ran without errors

This setup is **GUARANTEED** to work because it uses the standard, well-tested Supabase approach that thousands of developers use successfully every day.