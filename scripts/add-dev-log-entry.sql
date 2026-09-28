-- Script para agregar entradas al Development Log
-- Ejecutar en Supabase SQL Editor

-- =============================================================================
-- ENTRADA 1: Toggle Dark Mode en Calendario Público (Commit 4889c85)
-- =============================================================================

INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed,
  deployed_at
) VALUES (
  '4889c85',
  'Toggle dark/light mode en calendario público',
  'Se agregó switch de tema en la página del calendario público:

**Cambios implementados:**
- Toggle en header del calendario (junto al mes y botón salir)
- Toggle en pantalla de login/guest (esquina superior derecha)
- Importar useTheme de theme-provider
- Iconos Sun/Moon de lucide-react
- Tema persistente en localStorage
- Sincronizado con el tema del dashboard principal
- Accesible con aria-label para lectores de pantalla

**Impacto:** Los usuarios del calendario público (clientes y guests) pueden cambiar entre light/dark mode desde cualquier pantalla sin necesidad de estar logueados en el dashboard principal.',
  'feature',
  ARRAY['src/app/c/[token]/page.tsx'],
  ARRAY['ui', 'calendario', 'dark-mode', 'accesibilidad', 'ux'],
  true,
  NOW()
);

-- =============================================================================
-- ENTRADA 2: Sistema Development Log (Commit 2415bb6)
-- =============================================================================

INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed,
  deployed_at
) VALUES (
  '2415bb6',
  'Sistema de reporte de desarrollo (Development Log)',
  'Implementación completa de un sistema de tracking de cambios de código y desarrollo:

**Migration 00052 - Nueva tabla development_log:**
- Campos: commit_hash, title, description, category, files_changed, author_id
- Metadata adicional: tags, pr_url, deployed, deployed_at
- RLS: lectura para todos los usuarios, escritura solo admin/operador
- Índices optimizados por fecha, categoría, autor, estado deployed

**API /api/development-log:**
- GET: con filtros por días (7/14/30/60/90), categoría, deployed status
- POST: crear entrada (solo admin/operador)
- PUT: marcar como deployed (solo admin/operador)
- Enriquecimiento automático con datos de autor (nombre, avatar)
- Límite de 500 entradas, ordenadas por fecha descendente

**Componente DevelopmentLogPanel:**
- UI completa para visualizar el log de desarrollo
- Filtros interactivos: rango de días, categoría, estado deployed
- Vista agrupada por fecha con formato legible en español
- Badges por categoría con iconos y colores distintivos
- Chips de deployed/pendiente con indicadores visuales
- Detalles expandibles: archivos modificados, commit hash, PR URL, tags
- Avatar y nombre del autor para cada entrada
- Diseño con gradientes tech y hover effects

**Integración en Settings:**
- Nueva tab "Desarrollo" visible para admin y operador
- Montado en src/app/(dashboard)/settings/page.tsx

**Diferenciación:**
- Este log es SOLO para desarrollo (commits, features, fixes, refactors)
- NO registra actividad de usuarios (eso sigue en /api/activity-log)
- Permite tener un historial técnico separado del operacional',
  'feature',
  ARRAY[
    'supabase/migrations/00052_development_log.sql',
    'src/app/api/development-log/route.ts',
    'src/components/development-log-panel.tsx',
    'src/app/(dashboard)/settings/page.tsx'
  ],
  ARRAY['sistema', 'logging', 'desarrollo', 'reporte', 'ui', 'api'],
  true,
  NOW()
);

-- =============================================================================
-- ENTRADA 3: Documentación Development Log (Commit d1afbdf)
-- =============================================================================

INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed,
  deployed_at
) VALUES (
  'd1afbdf',
  'Guía completa del Development Log',
  'Documentación exhaustiva del sistema de reporte de desarrollo:

**Contenido del archivo DEVELOPMENT_LOG_SETUP.md:**
- Propósito y alcance del sistema (solo desarrollo, NO usuarios)
- Instrucciones paso a paso de setup inicial
- Cómo aplicar la migración 00052 en Supabase
- Guía de uso desde UI y API
- Scripts SQL listos para copiar y pegar
- Workflow recomendado para commits futuros
- Tabla de categorías con colores, iconos y ejemplos
- Checklist post-deploy para verificación
- URLs de referencia (Supabase, production, settings)
- Mejores prácticas de documentación técnica

**Objetivo:**
Proveer al equipo de desarrollo con documentación clara y completa para adoptar el sistema de logging de manera consistente y eficiente.',
  'docs',
  ARRAY['DEVELOPMENT_LOG_SETUP.md'],
  ARRAY['documentacion', 'guia', 'setup', 'desarrollo'],
  true,
  NOW()
);

-- =============================================================================
-- ENTRADA 4: Mejoras en Documentos (Commit ba5354b)
-- =============================================================================

INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed,
  deployed_at
) VALUES (
  'ba5354b',
  'Mejoras en documentos: títulos editables y filtro de clientes',
  'Resolución de dos problemas reportados en la sección de documentos:

**Problema 1: Título no se podía editar claramente**
- Input de título ahora muestra borde visible cuando es editable
- Estados hover y focus con borde primary y ring 2px para mejor feedback visual
- Distingue claramente entre modo edición (con borde) y solo lectura (sin borde, transparente)
- Transiciones suaves entre estados
- className dinámico basado en canEdit para mejor UX

**Problema 2: No se podía filtrar documentos por cliente**
- Nuevo selector dropdown de clientes en la vista de lista
- Ubicado junto al campo de búsqueda
- Opciones: "Todos los clientes", "Sin cliente", + lista completa de clientes
- Filtro reactivo que funciona en combinación con búsqueda por título
- Icono Building2 para identificación visual inmediata
- Layout responsive: columna en mobile, fila en desktop
- Estado del filtro persiste durante la sesión

**Mejoras de UX adicionales:**
- Lógica de filtro combinado (search AND client)
- Variable de estado clientFilter con valor inicial vacío
- Función filter mejorada con matchesSearch y matchesClient
- Mejor feedback visual en todos los estados de interacción',
  'fix',
  ARRAY['src/app/(dashboard)/documentos/page.tsx'],
  ARRAY['documentos', 'ux', 'filtros', 'ui', 'edicion'],
  true,
  NOW()
);

-- =============================================================================
-- ENTRADA 5: Reporte de Deploy y Configuración Vercel (Commit 68f27fe)
-- =============================================================================

INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed,
  deployed_at
) VALUES (
  '68f27fe',
  'Reporte completo de deploy y documentación técnica',
  'Documentación exhaustiva de todos los cambios implementados en la sesión de desarrollo:

**Archivo DEPLOY_REPORT_2026_09_28.md:**
- Resumen ejecutivo de los 5 commits principales
- Detalle completo de archivos creados y modificados
- Descripción del impacto de cada cambio
- Build status y verificación exitosa
- Migración pendiente (00052_development_log)
- Checklist de verificación post-deploy
- Diagnóstico del problema de deploy en Vercel
- Estadísticas completas (~900 líneas agregadas, 30 eliminadas)
- Próximos pasos y recomendaciones

**Problema diagnosticado:**
El proyecto original en Vercel no estaba correctamente conectado a GitHub, causando que los pushes no triggerearan deploys automáticos.

**Solución implementada:**
- Nuevo proyecto creado con Vercel CLI
- Configuración correcta de 22 variables de entorno
- Script PowerShell automatizado (add-vercel-env.ps1)
- Deploy exitoso con todos los cambios incluidos
- Conexión Git verificada y funcional

**Valor agregado:**
Este reporte sirve como documentación histórica de la sesión de desarrollo y como referencia para troubleshooting futuro de problemas de deployment.',
  'docs',
  ARRAY['DEPLOY_REPORT_2026_09_28.md'],
  ARRAY['deploy', 'vercel', 'troubleshooting', 'documentacion', 'devops'],
  true,
  NOW()
);

-- =============================================================================
-- Verificación: Consultar todas las entradas agregadas
-- =============================================================================

SELECT 
  commit_hash,
  title,
  category,
  array_length(files_changed, 1) as files_count,
  deployed,
  created_at
FROM development_log
ORDER BY created_at DESC
LIMIT 10;
