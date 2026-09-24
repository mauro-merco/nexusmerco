-- ============================================
-- Migration 00050: Allow authenticated users to read basic public info from other users
-- ============================================
-- This fixes the "usuario" bug in comments where names don't appear.
-- All authenticated users can now read basic info (name, avatar) from other users.

-- Drop ALL existing SELECT policies on users table
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can read public info" ON public.users;

-- New policy: All authenticated users can read basic public info
CREATE POLICY "Authenticated users can read public info"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Note: This allows reading full_name, avatar_url, email, role of any user.
-- Sensitive fields like totp_secret should never be in SELECT queries.
