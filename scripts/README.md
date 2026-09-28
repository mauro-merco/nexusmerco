# 📜 Scripts del Proyecto

Este directorio contiene scripts útiles para el mantenimiento y operación del Nexus Marketing Dashboard.

---

## 📊 Development Log

### `add-dev-log-entry.sql`

Script SQL para agregar entradas al Development Log (tabla `development_log`).

**Uso:**
1. Ve a Supabase SQL Editor: https://supabase.com/dashboard/project/cahxpueogsatmmijprnc/sql
2. Abre el archivo `add-dev-log-entry.sql`
3. Copia y pega el contenido completo
4. Click en **"Run"**

**Contenido actual:**
- ✅ 5 entradas de la sesión de desarrollo del 28 de Septiembre 2026
- Toggle dark mode en calendario público (4889c85)
- Sistema Development Log (2415bb6)
- Documentación Development Log (d1afbdf)
- Mejoras en documentos (ba5354b)
- Reporte de deploy (68f27fe)

**Verificación:**
Al final del script hay una query SELECT que muestra todas las entradas agregadas.

---

## 🔄 Agregar nuevas entradas

Para agregar nuevas entradas al Development Log en el futuro:

### Método 1: Via SQL (Recomendado para múltiples entradas)

```sql
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
  'abc1234',
  'Título corto del cambio',
  'Descripción detallada del cambio.
  
  Puede incluir múltiples líneas,
  bullets, y markdown.',
  'feature', -- feature | fix | refactor | docs | style | test | chore
  ARRAY['src/path/to/file1.ts', 'src/path/to/file2.tsx'],
  ARRAY['tag1', 'tag2', 'tag3'],
  true, -- false si aún no está deployed
  NOW() -- o NULL si no está deployed
);
```

### Método 2: Via API (Recomendado para entradas individuales)

```bash
POST /api/development-log
Headers: Authorization: Bearer <tu-token>
Body:
{
  "commit_hash": "abc1234",
  "title": "Título corto del cambio",
  "description": "Descripción detallada...",
  "category": "feature",
  "files_changed": ["src/file1.ts", "src/file2.tsx"],
  "tags": ["tag1", "tag2"],
  "deployed": true
}
```

### Método 3: Via UI

1. Ve a Settings → tab "Desarrollo"
2. (Futuro: botón "Nueva entrada" - por implementar)

---

## 📂 Estructura de scripts

```
scripts/
├── README.md                    # Este archivo
├── add-dev-log-entry.sql        # Agregar entradas al Development Log
└── (futuros scripts aquí)
```

---

## 🏷️ Categorías del Development Log

| Categoría | Uso | Ejemplo |
|-----------|-----|---------|
| `feature` | Nueva funcionalidad | "Agregar filtro de clientes" |
| `fix` | Corrección de bugs | "Arreglar título editable" |
| `refactor` | Refactorización | "Optimizar queries de DB" |
| `docs` | Documentación | "Agregar README de APIs" |
| `style` | Cambios de UI/CSS | "Mejorar diseño de cards" |
| `test` | Testing | "Agregar tests unitarios" |
| `chore` | Mantenimiento | "Actualizar dependencias" |

---

## 🎯 Mejores Prácticas

1. **Agrega una entrada después de cada commit importante**
2. **Usa descripciones claras y detalladas**
3. **Lista todos los archivos modificados relevantes**
4. **Agrega tags útiles para búsqueda futura**
5. **Marca como deployed solo cuando esté en producción**
6. **Incluye el commit hash para trazabilidad**

---

## 🔗 Referencias

- Development Log Setup: `../DEVELOPMENT_LOG_SETUP.md`
- Migración: `../supabase/migrations/00052_development_log.sql`
- API: `../src/app/api/development-log/route.ts`
- Componente UI: `../src/components/development-log-panel.tsx`
