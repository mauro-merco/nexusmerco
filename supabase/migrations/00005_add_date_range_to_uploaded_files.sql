ALTER TABLE uploaded_files
  ADD COLUMN IF NOT EXISTS date_from DATE,
  ADD COLUMN IF NOT EXISTS date_to DATE;

CREATE INDEX IF NOT EXISTS idx_uploaded_files_date_range ON uploaded_files(client_id, date_from, date_to);
