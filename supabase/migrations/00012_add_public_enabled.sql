-- Migration 00012: Add public landing page support
-- Allows each client to have a public shareable link

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS public_description TEXT DEFAULT '';
