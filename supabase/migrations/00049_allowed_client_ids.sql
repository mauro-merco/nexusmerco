-- ============================================
-- Migration 00049: Add allowed_client_ids column to users
-- ============================================
-- This migration adds strict permission controls:
-- 1. allowed_client_ids: array of client IDs this user can access (NULL = all clients for admin/operador)
-- 2. Enforces that users can ONLY see modules in their visible_modules array (no role defaults)

-- Add allowed_client_ids column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS allowed_client_ids TEXT[];

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_allowed_client_ids ON users USING GIN (allowed_client_ids);

-- Add comment
COMMENT ON COLUMN users.allowed_client_ids IS 'Array of client IDs this user can access. NULL means all clients (for admin/operador). Empty array means no clients.';
