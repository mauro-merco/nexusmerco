# Guía Rápida: Cómo Cargar Archivos CSV

## Opción 1: Copiar Archivos Manualmente (MÁS RÁPIDO)

### Paso 1: Crear la estructura de carpetas

Abre una terminal en la raíz del proyecto y ejecuta:

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\analytics\mensual"
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\analytics\semanal"
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\google-ads\mensual"
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\google-ads\semanal"
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\meta\mensual"
New-Item -ItemType Directory -Force -Path "src\csv\multipoint\meta\semanal"

# Linux/Mac
mkdir -p src/csv/multipoint/{analytics,google-ads,meta}/{mensual,semanal}
```

### Paso 2: Copiar tus archivos CSV

Copia tus archivos a las carpetas correspondientes:

**Gestión Comercial** → `src/csv/multipoint/`
```
Ejemplo: Multipoint - Gestión Comercial - Abril 2026.csv
```

**Google Analytics** → `src/csv/multipoint/analytics/mensual/` o `semanal/`
```
Ejemplo: GA4-Trafico-Abril-2026.csv
```

**Google Ads** → `src/csv/multipoint/google-ads/mensual/` o `semanal/`
```
Ejemplo: GoogleAds-Campañas-Abril-2026.csv
```

**Meta Ads** → `src/csv/multipoint/meta/mensual/` o `semanal/`
```
Ejemplo: Meta-Campañas-Abril-2026.csv
```

### Paso 3: Verificar

```bash
# Windows
dir src\csv\multipoint /s

# Linux/Mac
ls -R src/csv/multipoint/
```

Deberías ver tus archivos listados en las carpetas correctas.

---

## Opción 2: Usar el Explorador de Archivos (Windows)

1. Navega a la carpeta del proyecto
2. Abre `src/csv/`
3. Crea la carpeta `multipoint` si no existe
4. Dentro de `multipoint`, crea las subcarpetas:
   - `analytics/mensual`
   - `analytics/semanal`
   - `google-ads/mensual`
   - `google-ads/semanal`
   - `meta/mensual`
   - `meta/semanal`
5. Arrastra y suelta tus archivos CSV en las carpetas correspondientes

---

## Opción 3: Usar el Wizard Existente (Requiere modificación)

El sistema ya tiene un wizard en `/wizard`, pero actualmente solo guarda en la base de datos.

Para que también guarde archivos localmente, necesitas modificar:

`src/app/api/upload-csv/route.ts`

Agrega al final del procesamiento:

```typescript
// Guardar archivo localmente también
const fs = require('fs').promises;
const path = require('path');

const targetDir = path.join(
  process.cwd(),
  'src',
  'csv',
  clientId.toLowerCase(),
  sourceType === 'google_analytics' ? 'analytics' : 
  sourceType.startsWith('google_ads') ? 'google-ads' : 
  sourceType.startsWith('meta_ads') ? 'meta' : '',
  period // 'mensual' o 'semanal'
);

await fs.mkdir(targetDir, { recursive: true });
await fs.writeFile(
  path.join(targetDir, filename),
  csvContent
);
```

---

## ¿Qué archivos necesitas?

### Mínimo para que funcione el dashboard:

1. **Al menos 1 archivo de Gestión Comercial** (para KPIs principales)
   - Ubicación: `src/csv/multipoint/`
   - Ejemplo: `Multipoint - Gestión Comercial - Abril 2026.csv`

2. **Archivos de Google Analytics** (para Funnel de Adquisición)
   - Ubicación: `src/csv/multipoint/analytics/mensual/`
   - Formato: Exportación de GA4 con columnas de tráfico

3. **Archivos de Google Ads y/o Meta Ads** (para Top Performers)
   - Ubicación: `src/csv/multipoint/google-ads/mensual/` y/o `src/csv/multipoint/meta/mensual/`
   - Formato: Exportación de campañas con métricas

### Opcional:

- Archivos semanales en las carpetas `semanal/` para análisis más granular

---

## Verificar que funciona

1. Inicia el servidor:
```bash
npm run dev
```

2. Inicializa el cliente Multipoint:
```bash
curl -X POST http://localhost:3000/api/clients/init-multipoint
```

3. Obtén el ID del cliente:
```javascript
// En la consola del navegador
fetch('/api/clients')
  .then(res => res.json())
  .then(data => console.log(data.data.find(c => c.name === 'Multipoint')));
```

4. Navega a `/clients/[ID]` y deberías ver el dashboard con datos

---

## Troubleshooting

### "No se pudieron cargar las métricas"

**Problema**: No encuentra los archivos CSV

**Solución**:
1. Verifica que la carpeta sea `src/csv/multipoint/` (todo en minúsculas)
2. Asegúrate de que los archivos sean `.csv` (no `.CSV` o `.txt`)
3. Revisa la consola del servidor para ver errores específicos

### "Los datos están vacíos"

**Problema**: Los archivos no se están parseando correctamente

**Solución**:
1. Verifica que los CSVs tengan el formato correcto (columnas esperadas)
2. Revisa que no haya caracteres especiales en los nombres de archivo
3. Mira los logs del servidor para ver warnings de parseo

### "Error al leer archivos"

**Problema**: Permisos de archivo o ruta incorrecta

**Solución**:
```bash
# Dar permisos de lectura (Linux/Mac)
chmod -R 755 src/csv/

# Verificar que la ruta existe
ls -la src/csv/multipoint/
```

---

## Ejemplo Completo

```
src/csv/multipoint/
├── Multipoint - Gestión Comercial - Abril 2026.csv
├── Multipoint - Gestión Comercial - Mayo 2026.csv
├── analytics/
│   ├── mensual/
│   │   ├── GA4-Trafico-Abril-2026.csv
│   │   └── GA4-Trafico-Mayo-2026.csv
│   └── semanal/
│       ├── GA4-Trafico-18-25-Mayo.csv
│       └── GA4-Trafico-25-Mayo-1-Junio.csv
├── google-ads/
│   ├── mensual/
│   │   ├── GoogleAds-Campañas-Abril-2026.csv
│   │   └── GoogleAds-Campañas-Mayo-2026.csv
│   └── semanal/
│       └── GoogleAds-Campañas-18-25-Mayo.csv
└── meta/
    ├── mensual/
    │   ├── Meta-Campañas-Abril-2026.csv
    │   └── Meta-Campañas-Mayo-2026.csv
    └── semanal/
        └── Meta-Campañas-18-25-Mayo.csv
```

Con esta estructura, el dashboard cargará y agregará automáticamente todos los datos.
