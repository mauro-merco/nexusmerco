# Lógica de Carga de Archivos - Dashboard Ejecutivo

## Flujo Completo de Carga de Datos

### 1. ESTRUCTURA DE ARCHIVOS (File System)

Los archivos CSV se almacenan localmente en el proyecto bajo esta estructura:

```
src/csv/[clientId]/
  ├── [Archivos de Gestión Comercial en la raíz]
  ├── analytics/
  │   ├── mensual/
  │   └── semanal/
  ├── google-ads/
  │   ├── mensual/
  │   └── semanal/
  └── meta/
      ├── mensual/
      └── semanal/
```

**Ejemplo para Multipoint**:
```
src/csv/multipoint/
  ├── Multipoint - Gestión Comercial - Abril 2026.csv
  ├── Multipoint - Gestión Comercial - Mayo 2026.csv
  ├── analytics/
  │   ├── mensual/
  │   │   └── GA4-Trafico-Abril-2026.csv
  │   └── semanal/
  │       └── GA4-Trafico-18-25-Mayo.csv
  ├── google-ads/
  │   ├── mensual/
  │   │   └── GoogleAds-Campañas-Abril-2026.csv
  │   └── semanal/
  │       └── GoogleAds-Campañas-18-25-Mayo.csv
  └── meta/
      ├── mensual/
      │   └── Meta-Campañas-Abril-2026.csv
      └── semanal/
          └── Meta-Campañas-18-25-Mayo.csv
```

---

## 2. PROCESO DE CARGA PASO A PASO

### Paso 1: Usuario Navega al Dashboard

```
Usuario → /clients/[id] → ExecutiveDashboard Component
```

### Paso 2: ExecutiveDashboard Solicita Datos

```tsx
// src/app/(dashboard)/clients/[id]/executive-dashboard.tsx
useEffect(() => {
  async function loadData() {
    // Llama a la función del data-helper
    const currentMetrics = await getClientMetrics(clientId, dateRange);
    setMetrics(currentMetrics);
  }
  loadData();
}, [clientId, dateRange]);
```

### Paso 3: Data Helper Lee los Archivos

```tsx
// src/lib/data-helper.ts
export async function getClientMetrics(clientId: string, dateRange?: DateRange) {
  // 1. Cargar todos los CSVs del cliente
  const allFiles = await loadClientCSVs(clientId);
  
  // 2. Filtrar por fecha si se especifica
  const filteredFiles = dateRange 
    ? filterByDateRange(allFiles, dateRange) 
    : allFiles;
  
  // 3. Agregar métricas
  return aggregateMetrics(filteredFiles);
}
```

### Paso 4: loadClientCSVs Lee el File System

```tsx
export async function loadClientCSVs(clientId: string): Promise<ParsedMetrics[]> {
  const basePath = path.join(process.cwd(), 'src', 'csv', clientId.toLowerCase());
  const parsedFiles: ParsedMetrics[] = [];

  // A. Leer archivos de la raíz (Gestión Comercial)
  const rootFiles = await fs.readdir(basePath);
  for (const file of rootFiles) {
    if (file.endsWith('.csv')) {
      const content = await fs.readFile(path.join(basePath, file), 'utf-8');
      const parsed = parseCSV(content); // Detecta tipo y parsea
      parsedFiles.push(parsed);
    }
  }

  // B. Leer subdirectorios (analytics, google-ads, meta)
  const subdirs = ['analytics', 'google-ads', 'meta'];
  for (const subdir of subdirs) {
    // Leer archivos mensuales
    const mensualPath = path.join(basePath, subdir, 'mensual');
    const mensualFiles = await fs.readdir(mensualPath);
    // ... parsear cada archivo
    
    // Leer archivos semanales
    const semanalPath = path.join(basePath, subdir, 'semanal');
    const semanalFiles = await fs.readdir(semanalPath);
    // ... parsear cada archivo
  }

  return parsedFiles;
}
```

### Paso 5: parseCSV Detecta el Tipo de Archivo

```tsx
// src/lib/csv-parser.ts
export function parseCSV(text: string): ParsedMetrics {
  // Detecta automáticamente el tipo de CSV
  const source = detectSource(text);
  
  switch (source) {
    case 'google_ads_campaign':
      return parseGoogleAdsGeneric(text, source);
    case 'meta_ads_campaign':
      return parseMetaAds(text, source);
    case 'google_analytics':
      return parseGoogleAnalytics(text);
    case 'gc_management':
      return parseGC(text);
    default:
      throw new Error('Formato no reconocido');
  }
}
```

### Paso 6: aggregateMetrics Combina Todo

```tsx
export function aggregateMetrics(parsedFiles: ParsedMetrics[]): AggregatedMetrics {
  const result = {
    totalRevenue: 0,
    totalSpend: 0,
    platforms: { google: {}, meta: {}, analytics: {} },
    topCampaigns: [],
    trafficSources: [],
  };

  for (const file of parsedFiles) {
    // Sumar datos de Google Ads
    if (file.source.startsWith('google_ads')) {
      result.platforms.google.spend += file.totals.cost;
      result.platforms.google.revenue += file.totals.revenue;
      // ... agregar campañas
    }
    
    // Sumar datos de Meta Ads
    if (file.source.startsWith('meta_ads')) {
      result.platforms.meta.spend += file.totals.cost;
      // ...
    }
    
    // Procesar datos de Analytics
    if (file.source === 'google_analytics') {
      result.trafficSources.push(...file.meta.traffic);
    }
    
    // Procesar Gestión Comercial
    if (file.source === 'gc_management') {
      result.totalRevenue = file.meta.gc.projections.facturacion;
      result.totalOrders = file.meta.gc.projections.ordenes;
    }
  }

  return result;
}
```

---

## 3. OPCIONES DE CARGA DE ARCHIVOS

### Opción A: Archivos Locales (ACTUAL - Implementado)

**Ventajas**:
- ✅ Simple y directo
- ✅ No requiere base de datos adicional
- ✅ Fácil de versionar con Git
- ✅ Rápido para desarrollo

**Desventajas**:
- ❌ No escalable para producción
- ❌ Requiere acceso al servidor
- ❌ No permite carga desde UI

**Cuándo usar**: Desarrollo, demos, prototipos

---

### Opción B: Upload desde UI + Almacenamiento Local

**Cómo implementar**:

1. **Crear componente de upload**:
```tsx
// src/components/file-uploader.tsx
export function FileUploader({ clientId }: { clientId: string }) {
  const handleUpload = async (files: FileList) => {
    const formData = new FormData();
    formData.append('clientId', clientId);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    await fetch('/api/upload-files', {
      method: 'POST',
      body: formData,
    });
  };

  return (
    <input 
      type="file" 
      multiple 
      accept=".csv"
      onChange={(e) => e.target.files && handleUpload(e.target.files)}
    />
  );
}
```

2. **Crear API endpoint**:
```tsx
// src/app/api/upload-files/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const clientId = formData.get('clientId') as string;
  const files = formData.getAll('files') as File[];
  
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(
      process.cwd(), 
      'src', 
      'csv', 
      clientId.toLowerCase(),
      file.name
    );
    
    await fs.writeFile(filePath, buffer);
  }
  
  return NextResponse.json({ success: true });
}
```

---

### Opción C: Almacenamiento en Supabase Storage

**Cómo implementar**:

1. **Upload a Supabase**:
```tsx
const { data, error } = await supabase.storage
  .from('client-csvs')
  .upload(`${clientId}/${fileName}`, file);
```

2. **Modificar data-helper.ts**:
```tsx
export async function loadClientCSVs(clientId: string) {
  // Listar archivos en Supabase
  const { data: files } = await supabase.storage
    .from('client-csvs')
    .list(clientId);
  
  const parsedFiles = [];
  
  for (const file of files) {
    // Descargar contenido
    const { data } = await supabase.storage
      .from('client-csvs')
      .download(`${clientId}/${file.name}`);
    
    const text = await data.text();
    const parsed = parseCSV(text);
    parsedFiles.push(parsed);
  }
  
  return parsedFiles;
}
```

---

### Opción D: Datos en Base de Datos (Más Escalable)

**Estructura de tablas**:
```sql
-- Tabla de archivos subidos
CREATE TABLE uploaded_files (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  filename TEXT,
  source_type TEXT, -- 'google_ads', 'meta_ads', etc.
  upload_date TIMESTAMPTZ,
  file_url TEXT -- URL en Supabase Storage
);

-- Tabla de métricas procesadas
CREATE TABLE processed_metrics (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  period_start DATE,
  period_end DATE,
  metrics JSONB, -- Métricas agregadas
  created_at TIMESTAMPTZ
);
```

**Flujo**:
1. Usuario sube CSV → Guarda en Supabase Storage
2. Backend procesa CSV → Extrae métricas
3. Guarda métricas en `processed_metrics`
4. Dashboard lee de `processed_metrics` (mucho más rápido)

---

## 4. RECOMENDACIÓN PARA PRODUCCIÓN

### Flujo Híbrido Recomendado:

```
1. Usuario sube CSV desde UI
   ↓
2. Archivo se guarda en Supabase Storage
   ↓
3. Se registra en tabla `uploaded_files`
   ↓
4. Backend procesa el CSV (parseCSV)
   ↓
5. Métricas se guardan en tabla `processed_metrics`
   ↓
6. Dashboard lee de `processed_metrics` (rápido)
   ↓
7. Si necesita re-procesar, descarga de Storage
```

**Ventajas**:
- ✅ Escalable
- ✅ Rápido (lee de DB, no parsea cada vez)
- ✅ Permite re-procesamiento
- ✅ Historial de archivos
- ✅ Accesible desde cualquier lugar

---

## 5. CÓMO CARGAR ARCHIVOS AHORA (Sistema Actual)

### Método 1: Copiar Manualmente

```bash
# 1. Crea la estructura de carpetas
mkdir -p src/csv/multipoint/analytics/mensual
mkdir -p src/csv/multipoint/analytics/semanal
mkdir -p src/csv/multipoint/google-ads/mensual
mkdir -p src/csv/multipoint/google-ads/semanal
mkdir -p src/csv/multipoint/meta/mensual
mkdir -p src/csv/multipoint/meta/semanal

# 2. Copia tus archivos CSV a las carpetas correspondientes
cp /ruta/a/tu/archivo-ga4.csv src/csv/multipoint/analytics/mensual/
cp /ruta/a/tu/archivo-google-ads.csv src/csv/multipoint/google-ads/mensual/
cp /ruta/a/tu/archivo-meta.csv src/csv/multipoint/meta/mensual/
cp /ruta/a/tu/gestion-comercial.csv src/csv/multipoint/
```

### Método 2: Usar el Wizard Existente (Modificado)

El sistema ya tiene un wizard de upload (`/wizard`). Puedes modificarlo para:

1. **Guardar archivos localmente** en lugar de solo en DB
2. **Agregar lógica** para detectar el tipo y moverlo a la carpeta correcta

```tsx
// Modificar src/app/api/upload-csv/route.ts
// Agregar después de procesar:
const targetDir = path.join(
  process.cwd(),
  'src',
  'csv',
  clientId.toLowerCase(),
  sourceType, // 'analytics', 'google-ads', 'meta'
  period // 'mensual' o 'semanal'
);

await fs.mkdir(targetDir, { recursive: true });
await fs.writeFile(
  path.join(targetDir, filename),
  csvContent
);
```

---

## 6. PRÓXIMOS PASOS RECOMENDADOS

1. **Corto plazo**: Usar archivos locales para desarrollo
2. **Mediano plazo**: Implementar upload desde UI que guarde localmente
3. **Largo plazo**: Migrar a Supabase Storage + DB para producción

¿Necesitas ayuda implementando alguna de estas opciones?
