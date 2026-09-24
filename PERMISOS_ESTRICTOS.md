# Sistema de Permisos Estrictos - Implementado

## Cambios Realizados

### 1. Migración de Base de Datos (00049)
**Archivo:** `supabase/migrations/00049_allowed_client_ids.sql`

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_client_ids TEXT[];
CREATE INDEX IF NOT EXISTS idx_users_allowed_client_ids ON users USING GIN (allowed_client_ids);
```

**Aplicar en Supabase:**
1. Ir al SQL Editor en el dashboard de Supabase
2. Copiar y ejecutar el contenido de `supabase/migrations/00049_allowed_client_ids.sql`

---

### 2. Sistema de Módulos Estricto

**ANTES:**
```typescript
// Sidebar mostraba módulos si estaban en visible_modules O en DEFAULT_MODULES[role]
user.visible_modules?.includes(moduleId) || DEFAULT_MODULES[user.role]?.includes(moduleId)
```

**AHORA:**
```typescript
// Sidebar SOLO muestra módulos explícitamente en visible_modules
user.visible_modules?.includes(moduleId)
```

**Resultado:** Si no seleccionas ningún módulo para un usuario, el sidebar estará **completamente vacío**.

---

### 3. Permisos por Cliente

**Nueva columna:** `allowed_client_ids` (string[] | null)

| Valor | Significado |
|-------|-------------|
| `null` | Acceso a **todos** los clientes (recomendado para admin/operador) |
| `[]` (array vacío) | **Sin** acceso a ningún cliente |
| `["id1", "id2"]` | Acceso solo a esos clientes específicos |

**Aplicación:**
- Página **calendarios**: Filtra clientes disponibles según `allowed_client_ids`
- Futuras páginas: Usar `hasClientAccess(user, clientId)` helper

---

### 4. Validación de Permisos en Páginas

**Páginas protegidas:**
- `/analysis` → requiere módulo `'analysis'`
- `/team` → requiere módulo `'equipo'`
- `/operations` → requiere módulo `'tareas'`
- `/calendarios` → requiere módulo `'calendarios'` + validación de `allowed_client_ids`
- `/documentos` → requiere módulo `'documentos'`
- `/messages` → requiere módulo `'mensajes'`
- `/sugerencias` → requiere módulo `'sugerencias'`

Si un usuario intenta acceder sin permiso, ve:
```
🛡️ Sin acceso
No tienes permiso para acceder a [nombre del módulo].
```

---

### 5. Gestión de Usuarios (Settings)

**Crear Usuario:**
1. Nombre completo
2. Email (autocompletado con @mercodigital.com o @mercouser.com)
3. Contraseña
4. Rol (admin/operador/client)
5. **Módulos visibles:** Checkboxes para seleccionar (vacío por defecto)
6. **Clientes permitidos:** 
   - "Permitir todos" (null) o
   - Lista de clientes seleccionables

**Editar Usuario:**
- Click en el ícono ⚙️ en la fila del usuario
- Editar rol, módulos, clientes permitidos
- Guardar con ✓

---

## Helpers de Permisos

**Archivo:** `src/lib/permissions.ts`

```typescript
// Verificar acceso a módulo
hasModuleAccess(user, 'calendarios') // → boolean

// Verificar acceso a cliente específico
hasClientAccess(user, clientId) // → boolean

// Obtener IDs de clientes permitidos
getAllowedClientIds(user) // → string[] | null
```

---

## Probar el Sistema

### Escenario 1: Usuario solo con "calendario semanal"
1. Ir a **Settings → Gestión de Usuarios**
2. Editar usuario "nico"
3. **Módulos visibles:** Seleccionar SOLO "Calendario de clientes"
4. **Clientes permitidos:** Click "Restringir" y seleccionar solo "Multipoint"
5. Guardar
6. Cerrar sesión e ingresar como "nico"
7. **Resultado esperado:**
   - Sidebar muestra SOLO "Calendario de clientes"
   - Al entrar al calendario, solo ve el cliente "Multipoint"
   - No puede acceder a /dashboard, /analysis, etc. (muestra "Sin acceso")

### Escenario 2: Admin con todos los permisos
1. Editar un usuario admin
2. **Módulos visibles:** Seleccionar todos
3. **Clientes permitidos:** Dejar en "Permitir todos"
4. **Resultado esperado:**
   - Ve todos los módulos en el sidebar
   - Puede acceder a todos los clientes

### Escenario 3: Usuario sin módulos
1. Crear usuario nuevo sin seleccionar ningún módulo
2. **Resultado esperado:**
   - Sidebar vacío (solo muestra botón de apps pero sin items)
   - No puede acceder a ninguna página del dashboard

---

## Migrar Usuarios Existentes

**Usuarios actuales que ya tenían permisos:**
- `visible_modules` se mantiene sin cambios
- `allowed_client_ids` se crea como `NULL` (acceso a todos los clientes por defecto)

**Para restringir usuarios existentes:**
1. Ir a Settings → Gestión de Usuarios
2. Editar cada usuario
3. Seleccionar módulos específicos (vaciar los que no necesite)
4. Configurar clientes permitidos

---

## Notas Importantes

⚠️ **IMPORTANTE:** Los usuarios creados DESPUÉS de esta actualización NO tienen módulos por defecto. Debes seleccionar explícitamente cada módulo.

⚠️ **Sidebar vacío:** Si un usuario no tiene ningún módulo seleccionado, el sidebar estará vacío (solo mostrará el botón "Aplicaciones" pero sin items).

⚠️ **Clientes permitidos:** `null` = todos los clientes. Array vacío = ningún cliente. Esto es diferente a `visible_modules` donde array vacío = sin acceso.

✅ **Build OK:** El código compila sin errores TypeScript.

---

## Archivos Modificados

1. **Migración:** `supabase/migrations/00049_allowed_client_ids.sql`
2. **Types:** `src/lib/types.ts` (agregado `allowed_client_ids` a `User`)
3. **Permissions:** `src/lib/permissions.ts` (nuevos helpers)
4. **Sidebar:** `src/components/sidebar.tsx` (lógica estricta)
5. **NoAccess:** `src/components/no-access.tsx` (componente de "Sin acceso")
6. **Páginas:** 
   - `src/app/(dashboard)/analysis/page.tsx`
   - `src/app/(dashboard)/team/page.tsx`
   - `src/app/(dashboard)/operations/page.tsx`
   - `src/app/(dashboard)/calendarios/page.tsx`
   - `src/app/(dashboard)/documentos/page.tsx`
   - `src/app/(dashboard)/messages/page.tsx`
   - `src/app/(dashboard)/sugerencias/page.tsx`
7. **APIs:**
   - `src/app/api/users/route.ts` (GET/POST con `allowed_client_ids`)
   - `src/app/api/users/[id]/route.ts` (PUT con `allowed_client_ids`)
8. **Settings:** `src/app/(dashboard)/settings/page.tsx` (UI de gestión)

---

## Próximos Pasos

1. ✅ Aplicar migración 00049 en Supabase
2. ✅ Reiniciar el servidor Next.js (`npm run dev`)
3. ✅ Ir a Settings y configurar permisos del usuario "nico"
4. ✅ Probar ingresando como "nico"
5. ✅ Verificar que solo ve el calendario del cliente permitido
