-- Nexus Marketing OS - Supabase Schema
-- Run this in your Supabase SQL Editor

-- 0. Extend auth.users with a public profile
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'team', 'client')) DEFAULT 'team',
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 1. Clients (brands the agency manages)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'onboarding')) DEFAULT 'active',
  logo_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Client-team assignments (many-to-many)
CREATE TABLE public.client_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_team ENABLE ROW LEVEL SECURITY;

-- 3. Weekly inputs (the Monday wizard)
CREATE TABLE public.weekly_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  metrics_json JSONB NOT NULL DEFAULT '{}',
  context_notes TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('draft', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weekly_inputs ENABLE ROW LEVEL SECURITY;

-- 4. Optimizations logged per weekly input
CREATE TABLE public.optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  weekly_input_id UUID NOT NULL REFERENCES public.weekly_inputs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  expected_impact TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;

-- 5. Tasks (Kanban board)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('todo', 'in-progress', 'done')) DEFAULT 'todo',
  due_date DATE,
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 6. Integrations (API connection status per client)
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  google_connected BOOLEAN DEFAULT FALSE,
  meta_connected BOOLEAN DEFAULT FALSE,
  shopify_connected BOOLEAN DEFAULT FALSE,
  tiktok_connected BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- 7. AI insight logs
CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_weekly_inputs_client_date ON public.weekly_inputs(client_id, week_start_date DESC);
CREATE INDEX idx_optimizations_weekly ON public.optimizations(weekly_input_id);
CREATE INDEX idx_tasks_client ON public.tasks(client_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_client_team_user ON public.client_team(user_id);
CREATE INDEX idx_ai_insights_client ON public.ai_insights(client_id);

-- Basic RLS policies (example – extend for production)

-- Users: can read own profile
CREATE POLICY users_read_own ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_read_all_admin ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Clients: team members assigned + admin see all
CREATE POLICY clients_select_assigned ON public.clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.client_team WHERE client_id = id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Clients: admin full access
CREATE POLICY clients_insert_admin ON public.clients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY clients_update_admin ON public.clients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Helper: auto-create integration row on client insert
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.integrations (client_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client();
