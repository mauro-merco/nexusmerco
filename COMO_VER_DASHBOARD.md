# Cómo Ver el Dashboard de Multipoint

## Opción 1: Integrar el Dashboard Ejecutivo en la Página de Cliente

### Paso 1: Modificar la página de cliente

Edita el archivo `src/app/(dashboard)/clients/[id]/page.tsx`:

```tsx
import { ExecutiveDashboard } from './executive-dashboard';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container py-8">
      <ExecutiveDashboard 
        clientId={params.id}
      />
    </div>
  );
}
```

### Paso 2: Obtener el ID de Multipoint

1. Abre la consola del navegador (F12)
2. Ejecuta:

```javascript
fetch('/api/clients')
  .then(res => res.json())
  .then(data => {
    const multipoint = data.data.find(c => c.name === 'Multipoint');
    console.log('ID de Multipoint:', multipoint?.id);
    console.log('URL del dashboard:', `http://localhost:3001/clients/${multipoint?.id}`);
  });
```

### Paso 3: Navegar al Dashboard

Usa la URL que te dio el paso anterior, por ejemplo:
```
http://localhost:3001/clients/abc-123-def-456
```

---

## Opción 2: Crear una Ruta Dedicada para el Dashboard Ejecutivo

### Crear archivo: `src/app/(dashboard)/executive/[clientId]/page.tsx`

```tsx
import { ExecutiveDashboard } from '@/app/(dashboard)/clients/[id]/executive-dashboard';

export default function ExecutiveDashboardPage({ 
  params 
}: { 
  params: { clientId: string } 
}) {
  return (
    <div className="container py-8">
      <ExecutiveDashboard clientId={params.clientId} />
    </div>
  );
}
```

Luego accede a:
```
http://localhost:3001/executive/[ID_DE_MULTIPOINT]
```

---

## Opción 3: Agregar un Botón en la Página de Clientes

Edita `src/app/(dashboard)/clients/page.tsx` y agrega un botón "Dashboard Ejecutivo" en cada tarjeta de cliente:

```tsx
<Button 
  variant="default" 
  size="sm" 
  className="w-full gap-2 text-xs" 
  onClick={(e) => { 
    e.stopPropagation(); 
    router.push(`/clients/${client.id}/executive`); 
  }}
>
  <BarChart3 className="h-3 w-3" /> Dashboard Ejecutivo
</Button>
```

---

## Pasos Rápidos (Recomendado)

### 1. Inicializar Multipoint

```bash
curl -X POST http://localhost:3001/api/clients/init-multipoint
```

O desde la consola del navegador:
```javascript
fetch('/api/clients/init-multipoint', { method: 'POST' })
  .then(res => res.json())
  .then(data => console.log(data));
```

### 2. Subir Datos en el Wizard

1. Ve a `http://localhost:3001/wizard`
2. Selecciona "Multipoint"
3. Sube tus archivos CSV
4. Click "Guardar"

### 3. Ver el Dashboard

1. Ve a `http://localhost:3001/clients`
2. Click en la tarjeta de "Multipoint"
3. Deberías ver el dashboard con los datos

---

## Si No Ves Datos

### Verificar que hay datos en Supabase

```javascript
// En la consola del navegador
fetch('/api/clients')
  .then(res => res.json())
  .then(data => {
    const multipoint = data.data.find(c => c.name === 'Multipoint');
    return fetch(`/api/weekly-inputs?client_id=${multipoint.id}`);
  })
  .then(res => res.json())
  .then(data => console.log('Datos en Supabase:', data));
```

### Verificar que el dashboard carga datos

```javascript
// En la consola del navegador
fetch('/api/clients')
  .then(res => res.json())
  .then(data => {
    const multipoint = data.data.find(c => c.name === 'Multipoint');
    return fetch(`/api/client-metrics?clientId=${multipoint.id}`);
  })
  .then(res => res.json())
  .then(data => console.log('Métricas agregadas:', data));
```

---

## Troubleshooting

### "No se pudieron cargar las métricas"

**Causa**: No hay datos en Supabase para ese cliente

**Solución**: Sube archivos usando el wizard (`/wizard`)

### "Cliente no encontrado"

**Causa**: El cliente Multipoint no existe

**Solución**: Ejecuta `POST /api/clients/init-multipoint`

### "Dashboard vacío"

**Causa**: Los datos no se están leyendo correctamente

**Solución**: 
1. Verifica que Supabase esté configurado (`.env.local`)
2. Revisa la consola del navegador para ver errores
3. Verifica que las tablas tengan datos
