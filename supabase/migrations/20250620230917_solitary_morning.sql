/*
  # Create secure user profile function

  1. New Functions
    - `create_user_profile_secure` - Securely creates user profiles bypassing RLS
  
  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS for profile creation
    - Only authenticated users can execute the function
    - Function validates user authentication before proceeding
  
  3. Purpose
    - Resolves RLS violation during user signup
    - Ensures new users can create their profiles successfully
*/

-- Function to create a user profile securely
CREATE OR REPLACE FUNCTION public.create_user_profile_secure(
  p_first_name text,
  p_last_name text,
  p_phone_number text
)
RETURNS public.user_profiles
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of its owner (usually postgres), bypassing RLS
AS $$
DECLARE
  v_user_id uuid;
  v_profile public.user_profiles;
BEGIN
  v_user_id := auth.uid(); -- Get the ID of the currently authenticated user

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated.';
  END IF;

  INSERT INTO public.user_profiles (id, first_name, last_name, phone_number)
  VALUES (v_user_id, p_first_name, p_last_name, p_phone_number)
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile_secure(text, text, text) TO authenticated;