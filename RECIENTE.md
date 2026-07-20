# Cambios Recientes — Nexus Marketing Dashboard

## 1. Resumen del Semestre (ExecutiveDashboard)

**Archivo:** `src/app/(dashboard)/clients/[id]/executive-dashboard.tsx`

Reescrito completamente. Muestra 4 KPI cards grandes con datos reales de Gestión Comercial:

| KPI | Fuente | Ícono |
|-----|--------|-------|
| Facturación Total | `gc_daily.facturacion` (suma diaria) | `DollarSign` |
| Órdenes | `gc_daily.ordenes` (suma diaria) | `ShoppingCart` |
| Inversión Gestionada | `gc_daily.inversion` (suma diaria) | `TrendingUp` |
| ROAS Negocio Promedio | facturación / inversión (cálculo) | `Target` |

**Funcionalidades:**
- Filtro por mes (botones "Todos los meses" + individuales)
- Acumulativo: suma todos los meses cargados
- Tabla mensual con desglose y fila de total
- Datos vía `useGcMetrics(clientId)` → `/api/gc-metrics`

**No depende** de Google Ads, Meta Ads ni GA4. Solo GC.

## 2. Centro de Control (antes PANEL)

**Archivo:** `src/app/(dashboard)/dashboard/page.tsx`

Rediseñado como hub central:
- Selector de cliente (dropdown)
- ExecutiveDashboard con Resumen del Semestre (seleccionando cliente)
- Acciones: Nuevo Cliente, Cargar CSV, Ver clientes
- Quick info: clientes activos, total, rol, acceso rápido

## 3. Sidebar

**Archivo:** `src/components/sidebar.tsx`

- "PANEL" → "Centro de Control" (`src/i18n/es.ts`)
- "CLIENTES" eliminado del nav (redundante)
- Icono `Building2` y su import removidos

## 4. Raw CSV Storage + Cascade Delete

**Migración:** `supabase/migrations/00006_add_raw_content_to_uploaded_files.sql`
- Agrega `raw_content TEXT` a `uploaded_files`

**API:** `src/app/api/upload-csv/route.ts`
- Guarda el contenido CSV crudo en `raw_content`

**Cascade delete:** Ya funciona a nivel DB — todas las tablas (`weekly_inputs`, `campaign_metrics`, `ga4_traffic`, `gc_metrics`, `gc_daily`, `uploaded_files`, `optimizations`) tienen `ON DELETE CASCADE` sobre `clients(id)`.

## Estructura actual del tab "Resumen General"

```
clients/[id]/page.tsx
  └─ Tabs
       ├─ Resumen General → ExecutiveDashboard (4 KPIs + filtro mes)
       ├─ Resúmenes Mensuales → MultipointReport
       └─ Comparador Semanal → UploadCalendar + MonthlySummary + DashboardFullbai
```

## Datos disponibles en GC (Abril + Mayo 2026)

| Métrica | Abril | Mayo | Total |
|---------|-------|------|-------|
| Facturación | ~$48.5M | ~$145.5M | ~$194M |
| Órdenes | ~109 | ~262 | ~371 |
| Inversión | ~$5.8M | ~$11.9M | ~$17.7M |
| ROAS | ~8.3x | ~12.2x | ~10.9x |
