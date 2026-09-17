-- Add ads calendar module to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ads_calendar_enabled boolean DEFAULT false;

-- Ads ideas (same structure as social_ideas, separate table for clean separation)
CREATE TABLE IF NOT EXISTS ads_ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  brief TEXT DEFAULT '',
  eje_contenido TEXT DEFAULT '',
  copy_text TEXT DEFAULT '',
  responsable TEXT DEFAULT 'mau',
  post_type TEXT NOT NULL,
  status TEXT DEFAULT 'borrador',
  publish_date DATE NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ecommerce dates: named color-coded date ranges shown in the ADS calendar
CREATE TABLE IF NOT EXISTS ecommerce_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (service role has full access; anon/authenticated cannot touch these directly)
ALTER TABLE ads_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecommerce_dates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ads_ideas' AND policyname = 'service role full access ads_ideas') THEN
    CREATE POLICY "service role full access ads_ideas" ON ads_ideas FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ecommerce_dates' AND policyname = 'service role full access ecommerce_dates') THEN
    CREATE POLICY "service role full access ecommerce_dates" ON ecommerce_dates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
