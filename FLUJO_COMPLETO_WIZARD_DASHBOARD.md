# Flujo Completo: Wizard → Dashboard Ejecutivo

## ✅ LÓGICA ACTUAL IMPLEMENTADA

El sistema **YA ESTÁ CONFIGURADO** para funcionar exactamente como lo describiste:

### 1. Usuario sube archivos en el Wizard (`/wizard`)

```
Usuario → Selecciona cliente → Sube CSVs → Sistema parsea y guarda
```

**Componente**: `src/components/wizard-form.tsx`
**API**: `src/app/api/upload-csv/route.ts`

### 2. Los archivos se procesan y guardan en Supabase

Cuando subes un CSV en el wizard:

1. **Se parsea** con `parseCSV()` para detectar el tipo (Google Ads, Meta Ads, GA4, GC)
2. **Se guarda en múltiples tablas**:
   - `weekly_inputs`: Totales agregados por semana
   - `campaign_metrics`: Campañas individuales
   - `ga4_traffic`: Fuentes de tráfico
   - `gc_metrics` + `gc_daily`: Gestión comercial
   - `uploaded_files`: Registro del archivo subido

### 3. El Dashboard lee desde Supabase

**Componente**: `src/app/(dashboard)/clients/[id]/executive-dashboard.tsx`
**Data Helper**: `src/lib/data-helper.ts` (RECIÉN ACTUALIZADO)

El `data-helper.ts` ahora:
- ✅ Lee datos de Supabase (NO del file system)
- ✅ Combina datos de todas las tablas
- ✅ Convierte a formato `ParsedMetrics` para compatibilidad
- ✅ Agrega métricas automáticamente

---

## FLUJO PASO A PASO

### Paso 1: Subir Archivos en el Wizard

```
1. Usuario va a /wizard
2. Selecciona un cliente (ej: "Multipoint")
3. Arrastra/selecciona archivos CSV:
   - Google Ads Campañas.csv
   - Meta Ads Campañas.csv
   - GA4 Tráfico.csv
   - Gestión Comercial Abril.csv
4. El wizard detecta automáticamente el tipo de cada archivo
5. Muestra preview de las métricas
6. Usuario hace click en "Guardar"
```

### Paso 2: Procesamiento Backend

```typescript
// src/app/api/upload-csv/route.ts

1. Recibe CSV raw text
2. Parsea con parseCSV() → detecta tipo
3. Guarda en weekly_inputs (totales)
4. Guarda en campaign_metrics (campañas individuales)
5. Guarda en ga4_traffic (si es GA4)
6. Guarda en gc_metrics (si es GC)
7. Registra en uploaded_files
```

### Paso 3: Ver Dashboard

```
1. Usuario va a /clients/[id]
2. ExecutiveDashboard se carga
3. Llama a getClientMetrics(clientId)
4. data-helper.ts:
   - Lee weekly_inputs
   - Lee campaign_metrics
   - Lee ga4_traffic
   - Lee gc_metrics
   - Combina todo en AggregatedMetrics
5. Componentes visualizan:
   - HeroKPIs: Facturación, Inversión, ROAS, Órdenes
   - FunnelAcquisition: Tráfico por canal
   - TopPerformers: Ranking de campañas
   - AgencyEffort: Optimizaciones
```

---

## EJEMPLO PRÁCTICO

### Subir datos de Multipoint

```bash
# 1. Inicializar cliente
curl -X POST http://localhost:3000/api/clients/init-multipoint

# 2. Obtener ID del cliente
# (desde la consola del navegador)
fetch('/api/clients')
  .then(res => res.json())
  .then(data => console.log(data.data.find(c => c.name === 'Multipoint')))
# Resultado: { id: "abc-123-...", name: "Multipoint", ... }
```

### Subir archivos en el Wizard

1. Ve a `http://localhost:3000/wizard`
2. Selecciona "Multipoint" en el dropdown
3. Arrastra estos archivos:
   - `Google Ads - Campañas - Abril 2026.csv`
   - `Meta Ads - Campañas - Abril 2026.csv`
   - `GA4 - Tráfico - Abril 2026.csv`
   - `Multipoint - Gestión Comercial - Abril 2026.csv`
4. El wizard muestra:
   ```
   ✓ Google Ads - Campañas (15 campañas)
   ✓ Meta Ads - Campañas (8 campañas)
   ✓ GA4 - Tráfico (12 fuentes)
   ✓ Gestión Comercial (30 días)
   ```
5. Click "Guardar 4 archivo(s) en Supabase"

### Ver el Dashboard

1. Ve a `http://localhost:3000/clients/abc-123-...`
2. El dashboard muestra:
   - **Hero KPIs**: Facturación $150,000 | Inversión $45,000 | ROAS 3.33x | Órdenes 450
   - **Funnel**: Pauta 80% sesiones | Orgánico 20% sesiones (mejor CR)
   - **Top Performers**: Tabla con las 15 mejores campañas por ROAS
   - **Agency Effort**: 47 optimizaciones realizadas

---

## DIFERENCIAS CON EL SISTEMA ANTERIOR

### ❌ ANTES (File System)
```
Archivos → src/csv/multipoint/ → data-helper lee archivos → Dashboard
```
**Problema**: Requería copiar archivos manualmente al servidor

### ✅ AHORA (Supabase)
```
Wizard → Parsea CSV → Guarda en Supabase → data-helper lee DB → Dashboard
```
**Ventaja**: Todo desde la UI, sin acceso al servidor

---

## TABLAS DE SUPABASE UTILIZADAS

### 1. `weekly_inputs`
Totales agregados por semana y cliente:
```sql
client_id, week_start_date, 
google_ads_spend, google_ads_conversions, google_ads_revenue,
meta_ads_spend, meta_ads_conversions, meta_ads_revenue
```

### 2. `campaign_metrics`
Campañas individuales:
```sql
client_id, week_start_date, platform, campaign_name,
impressions, clicks, cost, conversions, revenue, roas
```

### 3. `ga4_traffic`
Fuentes de tráfico:
```sql
client_id, week_start_date, source,
sessions, events, revenue
```

### 4. `gc_metrics` + `gc_daily`
Gestión comercial:
```sql
-- gc_metrics
client_id, month, proy_facturacion, proy_ordenes, proy_roas, ...

-- gc_daily
gc_metrics_id, dia, facturacion, ordenes, roas, ...
```

### 5. `uploaded_files`
Registro de archivos subidos:
```sql
client_id, filename, source_type, week_start_date, month,
row_count, summary (JSONB)
```

---

## VERIFICAR QUE FUNCIONA

### 1. Verificar que el wizard guarda datos

```javascript
// Después de subir archivos en el wizard
fetch('/api/weekly-inputs?client_id=abc-123')
  .then(res => res.json())
  .then(data => console.log('Datos guardados:', data));
```

### 2. Verificar que el dashboard lee datos

```javascript
// En la página del dashboard
fetch('/api/client-metrics?clientId=abc-123')
  .then(res => res.json())
  .then(data => console.log('Métricas agregadas:', data));
```

### 3. Verificar archivos subidos

```javascript
fetch('/api/uploaded-files?client_id=abc-123')
  .then(res => res.json())
  .then(data => console.log('Archivos:', data));
```

---

## RESUMEN

✅ **La lógica YA ESTÁ IMPLEMENTADA**:
1. Wizard sube CSVs → Guarda en Supabase
2. Dashboard lee de Supabase → Muestra métricas
3. Todo funciona desde la UI, sin necesidad de acceso al servidor

✅ **Cambios realizados**:
- `data-helper.ts` ahora lee de Supabase en lugar del file system
- Convierte datos de las tablas a formato `ParsedMetrics`
- Mantiene compatibilidad con todos los componentes existentes

✅ **Próximos pasos**:
1. Subir archivos CSV reales en el wizard
2. Verificar que se guardan en Supabase
3. Ver el dashboard ejecutivo con datos reales
