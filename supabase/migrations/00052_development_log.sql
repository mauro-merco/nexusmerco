-- ============================================
-- MIGRATION 00052: Development Log
-- ============================================
-- Tabla para registrar cambios de desarrollo, commits, implementaciones
-- SOLO para desarrollo/código, NO para actividad de usuarios

-- ─── Tabla principal ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS development_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_hash TEXT, -- Hash del commit (ej: "4889c85")
  title TEXT NOT NULL, -- Título corto del cambio
  description TEXT NOT NULL, -- Descripción detallada (markdown permitido)
  category TEXT NOT NULL, -- feature | fix | refactor | docs | style | test | chore
  files_changed TEXT[], -- Array de archivos modificados
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Metadata adicional
  tags TEXT[], -- Etiquetas: ["ui", "calendario", "dark-mode"]
  pr_url TEXT, -- URL del PR si existe
  deployed BOOLEAN DEFAULT false, -- Si ya está en producción
  deployed_at TIMESTAMPTZ
);

-- ─── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_dev_log_created ON development_log(created_at DESC);
CREATE INDEX idx_dev_log_category ON development_log(category);
CREATE INDEX idx_dev_log_author ON development_log(author_id);
CREATE INDEX idx_dev_log_deployed ON development_log(deployed);

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────

ALTER TABLE development_log ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede LEER el log de desarrollo
CREATE POLICY "Usuarios autenticados pueden leer development_log"
  ON development_log FOR SELECT
  TO authenticated
  USING (true);

-- Solo admins y operadores pueden INSERTAR
CREATE POLICY "Admins y operadores pueden insertar en development_log"
  ON development_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operador')
    )
  );

-- Solo admins y operadores pueden ACTUALIZAR
CREATE POLICY "Admins y operadores pueden actualizar development_log"
  ON development_log FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'operador')
    )
  );

-- Solo admins pueden ELIMINAR
CREATE POLICY "Solo admins pueden eliminar development_log"
  ON development_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ─── Comentarios ─────────────────────────────────────────────────────────────

COMMENT ON TABLE development_log IS 'Registro de cambios de desarrollo, commits e implementaciones de código';
COMMENT ON COLUMN development_log.category IS 'Tipo de cambio: feature, fix, refactor, docs, style, test, chore';
COMMENT ON COLUMN development_log.deployed IS 'Indica si el cambio ya está desplegado en producción';
