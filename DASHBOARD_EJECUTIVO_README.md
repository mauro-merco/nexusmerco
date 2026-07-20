# Dashboard Ejecutivo Dinámico - Documentación

## Resumen

Se ha implementado un **Dashboard Ejecutivo Dinámico** completo para la plataforma SaaS de agencias de marketing digital. El sistema permite visualizar métricas clave, análisis de tráfico, rendimiento de campañas y esfuerzo de agencia.

## Estructura Implementada

### 1. Gestión de Clientes

#### API de Inicialización
- **Endpoint**: `POST /api/clients/init-multipoint`
- **Función**: Crea el cliente "Multipoint" si no existe
- **Ubicación**: `src/app/api/clients/init-multipoint/route.ts`

**Uso**:
```bash
curl -X POST http://localhost:3000/api/clients/init-multipoint
```

### 2. Procesamiento de Datos

#### Data Helper (`src/lib/data-helper.ts`)
Utilidades para parsear y agregar datos de CSVs del sistema de archivos.

**Funciones principales**:
- `loadClientCSVs(clientId)`: Lee todos los CSVs de un cliente
- `filterByDateRange(files, dateRange)`: Filtra datos por rango de fechas
- `aggregateMetrics(files)`: Agrega métricas de múltiples archivos
- `getClientMetrics(clientId, dateRange?)`: Obtiene métricas agregadas
- `compareMetrics(current, previous)`: Compara dos períodos

**Estructura de archivos esperada**:
```
/src/csv/[clientId]/
  ├── Gestión Comercial - [Mes] [Año].csv
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

#### API de Métricas
- **Endpoint**: `GET /api/client-metrics?clientId=xxx&startDate=xxx&endDate=xxx`
- **Ubicación**: `src/app/api/client-metrics/route.ts`

### 3. Componentes del Dashboard

#### HeroKPIs (`src/components/hero-kpis.tsx`)
Muestra las 4 métricas principales:
- Facturación Total
- Inversión Gestionada
- ROAS Promedio
- Órdenes Totales

Incluye:
- Badges de tendencia (comparación con período anterior)
- Gráfico combinado: Facturación (barras) vs Inversión (línea)

#### FunnelAcquisition (`src/components/funnel-acquisition.tsx`)
Análisis de tráfico de Google Analytics:
- Gráfico de sesiones por canal (Pauta, Orgánico, Email, etc.)
- Comparativa "Pauta vs Orgánico" con métricas detalladas
- Insights automáticos sobre rendimiento

#### TopPerformers (`src/components/top-performers.tsx`)
Bajada táctica de campañas:
- Tabs para ver: Todas / Google Ads / Meta Ads
- Tabla con ranking por ROAS
- Resumen de inversión y conversiones por plataforma
- Badges de estado (Excelente, Bueno, Regular, Bajo)

#### AgencyEffort (`src/components/agency-effort.tsx`)
Muestra el valor de la gestión:
- Métricas de optimizaciones (totales, completadas, en progreso)
- Horas invertidas
- Lista de acciones clave realizadas con impacto
- Mensaje de valor para justificar el esfuerzo

#### ExecutiveDashboard (`src/app/(dashboard)/clients/[id]/executive-dashboard.tsx`)
Componente principal que integra todos los submódulos:
- Carga automática de datos del cliente
- Comparación con período anterior
- Selector de fechas (UI preparado)
- Estados de carga y error

### 4. Componentes UI Creados

- **Tabs** (`src/components/ui/tabs.tsx`): Sistema de pestañas personalizado
- **Table** (`src/components/ui/table.tsx`): Componente de tabla reutilizable

## Uso del Dashboard

### Integración en Página de Cliente

```tsx
import { ExecutiveDashboard } from './executive-dashboard';

export default function ClientPage({ params }: { params: { id: string } }) {
  return (
    <div className="container py-8">
      <ExecutiveDashboard 
        clientId={params.id} 
        clientName="Multipoint"
      />
    </div>
  );
}
```

### Inicializar Cliente Multipoint

1. **Desde la UI**: Crear un botón que llame al endpoint
```tsx
const initMultipoint = async () => {
  const res = await fetch('/api/clients/init-multipoint', { method: 'POST' });
  const data = await res.json();
  console.log(data);
};
```

2. **Desde terminal**:
```bash
curl -X POST http://localhost:3000/api/clients/init-multipoint
```

## Flujo de Datos

1. **Carga de CSVs**: El sistema lee archivos del directorio `/src/csv/multipoint/`
2. **Parseo**: Utiliza `csv-parser.ts` para detectar y parsear diferentes formatos
3. **Agregación**: `data-helper.ts` combina datos de múltiples fuentes
4. **Visualización**: Los componentes reciben métricas agregadas y las muestran

## Tipos de Datos

### AggregatedMetrics
```typescript
{
  totalRevenue: number;
  totalSpend: number;
  totalOrders: number;
  avgRoas: number;
  avgCpa: number;
  avgCr: number;
  platforms: {
    google: { spend, revenue, conversions, roas };
    meta: { spend, revenue, conversions, roas };
    analytics: { sessions, conversions, revenue };
  };
  topCampaigns: Array<{ name, platform, roas, spend, revenue, conversions }>;
  trafficSources: Array<{ source, sessions, conversions, conversionRate }>;
  gcData?: GcParsed;
}
```

## Próximos Pasos

1. **Implementar selector de fechas funcional** en ExecutiveDashboard
2. **Conectar con datos reales de Supabase** (tabla `optimizations` para AgencyEffort)
3. **Agregar exportación a PDF** del dashboard
4. **Implementar filtros avanzados** (por plataforma, tipo de campaña, etc.)
5. **Agregar más visualizaciones** (gráficos de tendencias, mapas de calor, etc.)

## Estilo Visual

El dashboard utiliza un diseño **Dark Mode corporativo** con:
- Fondos oscuros con transparencias (`bg-card/50 backdrop-blur`)
- Acentos de color: azul, verde, rojo, púrpura
- Bordes sutiles (`border-border/50`)
- Gradientes para destacar información importante
- Badges y badges de estado para categorización visual

## Notas Técnicas

- **Server-side rendering**: Los datos se cargan en el servidor (Node.js)
- **File system access**: Usa `fs.promises` para leer CSVs
- **Error handling**: Manejo robusto de archivos faltantes o mal formateados
- **TypeScript**: Tipado completo para mejor DX y seguridad
- **Responsive**: Diseño adaptable a móviles, tablets y desktop
