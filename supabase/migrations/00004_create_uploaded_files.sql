CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  source_type TEXT NOT NULL,
  week_start_date DATE,
  month TEXT,
  row_count INTEGER DEFAULT 0,
  file_size INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_client_week ON uploaded_files(client_id, week_start_date);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_client_month ON uploaded_files(client_id, month);

ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own client uploaded files" ON uploaded_files;
CREATE POLICY "Users can view their own client uploaded files"
  ON uploaded_files FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team'))
    OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND client_id = uploaded_files.client_id)
  );

DROP POLICY IF EXISTS "Users can insert uploaded files" ON uploaded_files;
CREATE POLICY "Users can insert uploaded files"
  ON uploaded_files FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));

DROP POLICY IF EXISTS "Users can delete uploaded files" ON uploaded_files;
CREATE POLICY "Users can delete uploaded files"
  ON uploaded_files FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'team')));
