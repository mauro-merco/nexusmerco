BEGIN;
CREATE TABLE public.roadmap_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 8000),
  outcome text NOT NULL CHECK (char_length(outcome) BETWEEN 1 AND 4000),
  scope text NOT NULL CHECK (char_length(scope) BETWEEN 1 AND 8000),
  position integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'propuesta' CHECK (status IN ('propuesta','en_evaluacion','planificada','en_curso','completada','descartada')),
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.roadmap_votes (
  initiative_id uuid NOT NULL REFERENCES public.roadmap_initiatives(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  choice text NOT NULL CHECK (choice IN ('yes','no')),
  PRIMARY KEY (initiative_id, user_id)
);
CREATE TABLE public.roadmap_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.roadmap_initiatives(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX roadmap_comments_initiative_idx ON public.roadmap_comments(initiative_id, created_at);
ALTER TABLE public.roadmap_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_comments ENABLE ROW LEVEL SECURITY;
-- Writes go through authenticated API handlers, including ownership and admin checks.
CREATE POLICY roadmap_initiatives_read ON public.roadmap_initiatives FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY roadmap_votes_read ON public.roadmap_votes FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY roadmap_comments_read ON public.roadmap_comments FOR SELECT TO authenticated USING (public.is_staff());
INSERT INTO public.roadmap_initiatives (position,title,description,outcome,scope) VALUES
(1,'Mi día','Unificar el trabajo personal que hoy está distribuido entre tareas, redes y ADS.','Cada integrante identifica su siguiente acción y sus vencimientos sin recorrer varios módulos.','Primero: bandeja por responsable con pendientes de hoy, vencidos y próximos. Luego: accesos al detalle original y filtros por cliente. Listo cuando no duplique entidades y respete roles y permisos.'),
(2,'Centro de aprobaciones','Reunir las piezas y tareas que necesitan una decisión del equipo o del cliente.','Reducir esperas y hacer visible quién debe aprobar qué.','Primero: bandeja por cliente, estado y antigüedad. Luego: aprobar o pedir cambios con motivo e historial. Listo cuando cada decisión actualice la entidad original y su notificación, sin saltar permisos.'),
(3,'Ficha operativa del cliente','Concentrar responsables, objetivos, acuerdos, materiales y enlaces vigentes por cliente.','Que cualquier integrante autorizado pueda retomar una cuenta con contexto.','Primero: resumen editable, responsables y enlaces. Luego: conectar documentos y actividad existente. Listo cuando la ficha tenga una fuente única y los permisos del cliente se conserven.'),
(4,'Entregables mensuales','Comparar lo acordado para cada cliente con las piezas y tareas efectivamente entregadas.','Detectar desvíos del alcance mensual antes del cierre.','Primero: definir entregables por mes y vincular trabajo existente. Luego: avance por tipo y pendientes. Listo cuando no cuente duplicados ni confunda publicación con entrega aprobada.'),
(5,'Bloqueos y dependencias','Hacer explícito qué trabajo espera material, una decisión o una tarea previa.','Destrabar trabajo con un responsable y una próxima acción claros.','Primero: motivo, responsable del desbloqueo y fecha de seguimiento. Luego: dependencias entre tareas con prevención de ciclos. Listo cuando un bloqueo sea visible desde el trabajo y la bandeja personal.'),
(6,'Plantillas, recurrencias y automatizaciones','Evitar cargar manualmente los procesos que se repiten por cliente.','Ahorrar preparación sin generar trabajo duplicado o notificaciones innecesarias.','Primero: plantillas de tareas con roles y checklist. Luego: recurrencias con previsualización, pausa e idempotencia. Automatizaciones solo después de validar los flujos con el equipo.'),
(7,'Capacidad del equipo','Planificar la carga con esfuerzo estimado, disponibilidad y contexto, no con cantidad de tareas.','Distribuir compromisos de manera realista sin convertir la actividad en un ranking de personas.','Primero: acordar unidad de esfuerzo y disponibilidad semanal. Luego: vista de carga por equipo y alertas de sobreasignación. Listo cuando contemple ausencias y distinga estimación de tiempo real.'),
(8,'Comentarios conectados y resolución','Distinguir un comentario leído de un pedido efectivamente resuelto.','Evitar perder decisiones o asumir que un visto significa trabajo terminado.','Primero: marcar pedidos como pendientes o resueltos con responsable. Luego: enlazar comentarios con acciones y decisiones. Listo cuando el visto siga siendo independiente y se pueda abrir el contexto original.'),
(9,'Confiabilidad y consistencia transversal','Alinear permisos, estados, errores y comportamiento entre módulos.','Que el sistema no muestre información vacía como si fuera un resultado válido cuando falló una operación.','Primero: inventario de flujos críticos y errores visibles con reintento. Luego: coherencia de estados, permisos y enlaces internos/públicos. Avanzar por módulo, sin una reescritura general.'),
(10,'Reporte mensual para el cliente','Conectar resultados, entregables y próximos pasos en un informe entendible.','Cerrar el mes con una explicación verificable de lo hecho y de lo que sigue.','Primero: resumen de entregables y métricas con período y fuente explícitos. Luego: conclusiones editables y exportación. Listo cuando use ventanas comparables y no invente datos faltantes.');
COMMIT;
