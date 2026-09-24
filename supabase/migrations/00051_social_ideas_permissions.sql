-- ============================================
-- Migration 00051: Allow all authenticated users to edit social ideas
-- ============================================
-- This allows internal team (admin/operador) AND clients to fully edit ideas/tasks,
-- add comments, attachments, change status, etc.

-- Drop restrictive UPDATE policy
DROP POLICY IF EXISTS social_ideas_update ON public.social_ideas;

-- New policy: All authenticated users can update ideas
-- (Team members can edit any idea, clients can edit ideas of their client)
CREATE POLICY social_ideas_update ON public.social_ideas FOR UPDATE
  USING (
    -- Admin/operador can edit any idea
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    -- Clients can edit ideas of their own client
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.client_id = social_ideas.client_id
    )
  );

-- Note: DELETE policy remains admin/operador only for safety
