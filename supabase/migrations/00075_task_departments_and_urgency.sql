-- 00075: Task departments, SLA, urgency, and dependencies

-- Add new columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN department TEXT,
  ADD COLUMN start_date TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN sla_hours INTEGER DEFAULT 48,
  ADD COLUMN is_urgent BOOLEAN DEFAULT false,
  ADD COLUMN blocked_by_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create index for urgent tasks per department
CREATE INDEX idx_tasks_department_urgent ON public.tasks(department, is_urgent) WHERE is_urgent = true AND status NOT IN ('cerrada', 'problemas');

-- Create index for blocking relationships
CREATE INDEX idx_tasks_blocked_by ON public.tasks(blocked_by_task_id) WHERE blocked_by_task_id IS NOT NULL;

-- Add department check constraint
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_department_check CHECK (
    department IN (
      'diseno_redes',
      'diseno_ads',
      'diseno_web',
      'pauta_google',
      'pauta_meta',
      'pauta_tiktok',
      'contenido_copy',
      'contenido_estrategia',
      'desarrollo_web',
      'desarrollo_ecommerce',
      'atencion_consultas',
      'atencion_reportes'
    ) OR department IS NULL
  );

-- Update existing tasks with default department based on task_type
UPDATE public.tasks
SET department = CASE
  WHEN task_type LIKE 'redes_%' THEN 'diseno_redes'
  WHEN task_type LIKE 'ads_%' THEN 'pauta_meta'
  WHEN task_type LIKE 'web_%' THEN 'desarrollo_web'
  WHEN task_type LIKE 'ecommerce_%' THEN 'desarrollo_ecommerce'
  WHEN task_type LIKE 'contenido_%' THEN 'contenido_copy'
  ELSE 'diseno_redes'
END
WHERE department IS NULL;
