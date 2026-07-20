# Instrucciones de Inicialización - Dashboard Ejecutivo

## Paso 1: Inicializar Cliente "Multipoint"

### Opción A: Desde la Terminal

```bash
# Asegúrate de que el servidor esté corriendo
npm run dev

# En otra terminal, ejecuta:
curl -X POST http://localhost:3000/api/clients/init-multipoint
```

### Opción B: Desde el Navegador

1. Abre las DevTools del navegador (F12)
2. Ve a la consola
3. Ejecuta:

```javascript
fetch('/api/clients/init-multipoint', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

### Opción C: Crear un Botón en la UI

Agrega esto temporalmente en cualquier página (ej: `/clients/page.tsx`):

```tsx
<Button 
  onClick={async () => {
    const res = await fetch('/api/clients/init-multipoint', { method: 'POST' });
    const data = await res.json();
    alert(data.message);
    window.location.reload();
  }}
>
  Inicializar Multipoint
</Button>
```

## Paso 2: Verificar Estructura de Archivos CSV

Asegúrate de que existan archivos CSV en:

```
src/csv/multipoint/
  ├── Multipoint - Gestión Comercial - Abril 2026.csv
  ├── Multipoint - Gestión Comercial - Mayo 2026.csv
  ├── analytics/
  │   ├── mensual/
  │   │   └── [archivos CSV de GA4]
  │   └── semanal/
  │       └── [archivos CSV de GA4]
  ├── google-ads/
  │   ├── mensual/
  │   │   └── [archivos CSV de Google Ads]
  │   └── semanal/
  │       └── [archivos CSV de Google Ads]
  └── meta/
      ├── mensual/
      │   └── [archivos CSV de Meta Ads]
      └── semanal/
          └── [archivos CSV de Meta Ads]
```

## Paso 3: Acceder al Dashboard Ejecutivo

### Opción A: Integrar en la Página de Cliente Existente

Edita `src/app/(dashboard)/clients/[id]/page.tsx`:

```tsx
import { ExecutiveDashboard } from './executive-dashboard';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
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

### Opción B: Crear una Ruta Dedicada

Crea `src/app/(dashboard)/executive/[clientId]/page.tsx`:

```tsx
import { ExecutiveDashboard } from '@/app/(dashboard)/clients/[id]/executive-dashboard';

export default function ExecutivePage({ params }: { params: { clientId: string } }) {
  return (
    <div className="container py-8">
      <ExecutiveDashboard clientId={params.clientId} />
    </div>
  );
}
```

Luego accede a: `http://localhost:3000/executive/[ID_DEL_CLIENTE]`

## Paso 4: Obtener el ID del Cliente

Después de inicializar Multipoint, obtén su ID:

```javascript
// En la consola del navegador
fetch('/api/clients')
  .then(res => res.json())
  .then(data => {
    const multipoint = data.data.find(c => c.name === 'Multipoint');
    console.log('ID de Multipoint:', multipoint.id);
  });
```

## Paso 5: Navegar al Dashboard

Con el ID obtenido, navega a:
- `/clients/[ID]` (si integraste en la página de cliente)
- `/executive/[ID]` (si creaste ruta dedicada)

## Verificación de Funcionamiento

El dashboard debería mostrar:

1. ✅ **Hero KPIs**: 4 tarjetas con métricas principales
2. ✅ **Gráfico**: Facturación vs Inversión
3. ✅ **Funnel de Adquisición**: Análisis de tráfico por canal
4. ✅ **Top Performers**: Tabla de campañas ordenadas por ROAS
5. ✅ **Agency Effort**: Métricas de optimizaciones y trabajo

## Troubleshooting

### Error: "No se pudieron cargar las métricas"

**Causa**: No hay archivos CSV o el clientId no coincide con la carpeta.

**Solución**:
1. Verifica que exista `/src/csv/multipoint/`
2. Asegúrate de usar el ID correcto del cliente
3. Revisa la consola del servidor para ver errores de lectura de archivos

### Error: "Cannot find module '@/lib/data-helper'"

**Causa**: Problema de importación o compilación.

**Solución**:
```bash
# Reinicia el servidor
npm run dev
```

### Los datos no se muestran

**Causa**: Los CSVs no están en el formato esperado.

**Solución**:
1. Revisa que los CSVs tengan las columnas correctas
2. Verifica que `csv-parser.ts` detecte correctamente el tipo de archivo
3. Mira los logs del servidor para ver warnings de parseo

## Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Ver logs del servidor
# (Los logs aparecen en la terminal donde ejecutaste npm run dev)

# Verificar estructura de archivos
ls -R src/csv/multipoint/

# Limpiar caché de Next.js
rm -rf .next
npm run dev
```

## Próximos Pasos

Una vez que el dashboard funcione:

1. **Personalizar datos**: Agrega más archivos CSV para diferentes períodos
2. **Implementar filtros**: Conecta el botón "Seleccionar Período"
3. **Exportar reportes**: Agrega funcionalidad de exportación a PDF
4. **Conectar con Supabase**: Migra datos de optimizaciones a la base de datos
5. **Agregar más clientes**: Replica la estructura para otros clientes
