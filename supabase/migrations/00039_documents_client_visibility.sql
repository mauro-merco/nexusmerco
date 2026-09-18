-- 00039: Any user with an @mercodigital.com email can view client-linked documents.
-- Client documents (documents.client_id IS NOT NULL) become team-visible:
-- owner, people explicitly shared, admins/operadores, or any @mercodigital.com member.
DROP POLICY IF EXISTS documents_select ON public.documents;
CREATE POLICY documents_select ON public.documents FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.document_shares ds WHERE ds.document_id = documents.id AND ds.user_id = auth.uid())
    OR (
      client_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND LOWER(u.email) LIKE '%@mercodigital.com')
    )
  );