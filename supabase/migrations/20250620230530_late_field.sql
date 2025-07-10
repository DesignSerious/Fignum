/*
  # Fix User Profiles RLS Policy Violation

  1. Problem
    - The current RLS policies are preventing authenticated users from creating their own profiles
    - The policy conditions may be using incorrect function references

  2. Solution
    - Drop existing problematic policies
    - Recreate policies with correct auth.uid() references
    - Ensure proper permissions for profile creation

  3. Security
    - Users can only create/read/update their own profiles
    - Service role has full access for admin functions
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_role_all" ON public.user_profiles;

-- Recreate RLS policies with correct auth.uid() references
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
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles_service_role_all"
  ON public.user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure proper grants are in place
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Success message
SELECT 'SUCCESS: User profiles RLS policies fixed!' as result;