ALTER TABLE development_log
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_dev_log_priority ON development_log(priority);

COMMENT ON COLUMN development_log.priority IS 'Prioridad: critical | high | normal | low';
