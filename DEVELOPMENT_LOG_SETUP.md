# 📝 Development Log - Setup e Instrucciones

## 🎯 Propósito

El **Development Log** es un sistema para registrar **cambios de código, commits e implementaciones**. 

❌ **NO es para:**
- Tareas de usuarios
- Ideas de contenido
- Mensajes internos
- Actividad general (eso sigue en `/api/activity-log`)

✅ **SÍ es para:**
- Commits importantes
- Nuevas features implementadas
- Bugs corregidos
- Refactors de código
- Cambios en la arquitectura
- Documentación técnica

---

## 🚀 Setup Inicial

### 1. Aplicar la migración en Supabase

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/cahxpueogsatmmijprnc
2. Ve a **SQL Editor**
3. Copia y ejecuta el contenido de: `supabase/migrations/00052_development_log.sql`
4. Verifica que la tabla `development_log` se haya creado correctamente

### 2. Verificar acceso

- La nueva tab **"Desarrollo"** aparecerá en **Settings** para usuarios con rol `admin` u `operador`
- Los usuarios con rol `client` NO verán esta tab

---

## 📊 Cómo usar el Development Log

### Desde la UI (Settings → Desarrollo)

1. **Ver el log:**
   - Filtra por días (7/14/30/60/90)
   - Filtra por categoría (feature, fix, refactor, etc.)
   - Filtra por estado (desplegado/pendiente)

2. **Agregar entrada:** (por ahora solo via API o SQL directamente)

### Via API

**Crear entrada:**
```bash
POST /api/development-log
Headers: Authorization: Bearer <tu-token>
Body:
{
  "commit_hash": "4889c85",
  "title": "Toggle dark/light mode en calendario público",
  "description": "Se agregó switch de tema en login y header del calendario\n- Importar useTheme de theme-provider\n- Iconos Sun/Moon de lucide-react\n- Persistencia en localStorage",
  "category": "feature",
  "files_changed": ["src/app/c/[token]/page.tsx"],
  "tags": ["ui", "calendario", "dark-mode"],
  "deployed": true
}
```

**Categorías válidas:**
- `feature` → Nueva funcionalidad
- `fix` → Corrección de bugs
- `refactor` → Refactorización de código
- `docs` → Documentación
- `style` → Cambios de estilo/UI
- `test` → Testing
- `chore` → Mantenimiento/tareas rutinarias

---

## 📝 Primeras Entradas a Agregar

### Entrada 1: Toggle Dark Mode (commit 4889c85)

```sql
INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed
) VALUES (
  '4889c85',
  'Toggle dark/light mode en calendario público',
  'Se agregó switch de tema en la página del calendario público:
- Toggle en header (junto al mes y botón salir)
- Toggle en pantalla de login (esquina superior derecha)
- Importar useTheme y iconos Sun/Moon de lucide-react
- Tema persistente en localStorage sincronizado con dashboard
- Accesible con aria-label para lectores de pantalla',
  'feature',
  ARRAY['src/app/c/[token]/page.tsx'],
  ARRAY['ui', 'calendario', 'dark-mode', 'accesibilidad'],
  true
);
```

### Entrada 2: Sistema Development Log (commit 2415bb6)

```sql
INSERT INTO development_log (
  commit_hash,
  title,
  description,
  category,
  files_changed,
  tags,
  deployed
) VALUES (
  '2415bb6',
  'Sistema de reporte de desarrollo (Development Log)',
  'Nuevo sistema completo para registrar cambios de código y commits:

**Migration 00052:**
- Nueva tabla development_log con RLS
- Campos: commit_hash, title, description, category, files_changed
- Metadata: tags, pr_url, deployed, deployed_at
- Índices optimizados por fecha, categoría, autor, deployed

**API /api/development-log:**
- GET con filtros (días, categoría, deployed)
- POST para crear (solo admin/operador)
- PUT para marcar deployed
- Enriquecimiento con datos de autor

**UI DevelopmentLogPanel:**
- Vista agrupada por fecha
- Filtros múltiples (días, categoría, estado)
- Badges con iconos por categoría
- Detalles expandibles (archivos, commit, PR, tags)
- Integrado en Settings como nueva tab "Desarrollo"

Este log es SOLO para desarrollo, NO para actividad de usuarios.',
  'feature',
  ARRAY[
    'supabase/migrations/00052_development_log.sql',
    'src/app/api/development-log/route.ts',
    'src/components/development-log-panel.tsx',
    'src/app/(dashboard)/settings/page.tsx'
  ],
  ARRAY['sistema', 'reporte', 'desarrollo', 'logging', 'ui'],
  true
);
```

---

## 🔧 Workflow Recomendado

### Después de cada commit importante:

1. **Hacer el commit normalmente:**
   ```bash
   git commit -m "feat: descripción del cambio"
   git push
   ```

2. **Agregar entrada al Development Log:**
   - Via SQL en Supabase (copiar INSERT de arriba)
   - O via API POST /api/development-log
   - O crear un script automatizado

3. **Marcar como deployed después del deploy:**
   ```bash
   PUT /api/development-log
   Body: { "id": "<uuid>", "deployed": true }
   ```

---

## 📂 Estructura de Archivos

```
.
├── supabase/migrations/
│   └── 00052_development_log.sql          # Migración de la tabla
├── src/app/api/
│   └── development-log/
│       └── route.ts                        # API endpoints
├── src/components/
│   └── development-log-panel.tsx          # UI del panel
└── src/app/(dashboard)/settings/
    └── page.tsx                            # Integración en Settings
```

---

## 🎨 Categorías y sus Colores

| Categoría | Label | Color | Ícono |
|-----------|-------|-------|-------|
| `feature` | Nueva Función | Verde (emerald) | ✨ Sparkles |
| `fix` | Corrección | Rojo | 🐛 Bug |
| `refactor` | Refactor | Azul | 🔧 Wrench |
| `docs` | Documentación | Púrpura | 📄 FileText |
| `style` | Estilo | Rosa | ✨ Sparkles |
| `test` | Testing | Naranja | 🧪 TestTube |
| `chore` | Mantenimiento | Gris | 📦 Package |

---

## ✅ Checklist Post-Deploy

- [ ] Migración 00052 aplicada en Supabase
- [ ] Entrada del commit 4889c85 (dark mode toggle) agregada
- [ ] Entrada del commit 2415bb6 (development log system) agregada
- [ ] Tab "Desarrollo" visible en Settings para admin/operador
- [ ] Filtros funcionando correctamente
- [ ] Permisos RLS verificados

---

## 📌 Notas Importantes

1. **Solo admin y operador pueden escribir** en el development_log
2. **Todos los usuarios autenticados pueden leer** el log
3. **Los commits anteriores importantes** deberían agregarse manualmente con su fecha original
4. **Tags útiles:** ui, api, calendario, tareas, documentos, performance, security, etc.
5. **El campo `deployed`** debe actualizarse después de cada deploy a producción

---

## 🔗 URLs Relacionadas

- Supabase Project: https://supabase.com/dashboard/project/cahxpueogsatmmijprnc
- Production App: https://nexusmerco-rho.vercel.app
- Settings → Desarrollo: https://nexusmerco-rho.vercel.app/settings (tab "Desarrollo")
