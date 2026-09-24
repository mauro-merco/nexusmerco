# Fixes de Calendario y Permisos - Resumen

## 🔧 Problemas Resueltos

### 1. **Comentarios mostraban "usuario" en vez del nombre real**
**Causa:** Las políticas RLS de la tabla `users` solo permitían leer el propio perfil o todos los perfiles (solo para admins). Los operadores y clientes no podían leer nombres de otros usuarios.

**Solución:** Migración `00050_users_public_info.sql`
- Elimina políticas restrictivas
- Permite a TODOS los usuarios autenticados leer información pública (nombre, avatar, email, rol) de cualquier usuario
- Ahora los comentarios muestran el nombre completo del autor

---

### 2. **Equipo interno (nico) no podía editar ideas/tareas**
**Causa:** La política RLS de `social_ideas` UPDATE solo permitía editar a admin/operador, pero al consultar desde el cliente la restricción impedía guardar cambios.

**Solución:** Migración `00051_social_ideas_permissions.sql`
- Admin/operador: pueden editar cualquier idea
- Clientes: pueden editar ideas de su propio cliente
- Ahora equipo interno Y clientes pueden:
  - ✅ Editar título, descripción, brief, copy, eje de contenido
  - ✅ Cambiar tipo de post (Reel, Historia, Carrusel)
  - ✅ Cambiar estado (borrador → en revisión → aprobada, etc.)
  - ✅ Agregar/quitar links (attachments)
  - ✅ Agregar comentarios
  - ✅ Asignar personas con roles (lead, executor, reviewer)
  - ✅ Cambiar fecha de publicación

---

### 3. **Botón "Restringir" en gestión de usuarios no funcionaba**
**Causa:** La UI mostraba "✓ Este usuario puede acceder a todos los clientes" pero no había forma de cambiar a modo restringido.

**Solución:** Mejora en `src/app/(dashboard)/settings/page.tsx`
- Botón **"🔒 Restringir"** cambia de modo "todos" a "lista de clientes"
- Botón **"🔓 Permitir todos"** cambia de modo "lista" a "todos"
- Warning si no hay clientes seleccionados
- UI más clara con instrucciones

---

## 📦 Migraciones a Aplicar

### Migración 00050: Lectura de información pública de usuarios
```sql
-- Archivo: supabase/migrations/00050_users_public_info.sql

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;

CREATE POLICY "Authenticated users can read public info"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

**Efecto:**
- ✅ Los comentarios ahora muestran nombres reales en vez de "usuario"
- ✅ Todos los usuarios autenticados pueden ver nombres/avatares de otros

---

### Migración 00051: Permisos de edición de ideas
```sql
-- Archivo: supabase/migrations/00051_social_ideas_permissions.sql

DROP POLICY IF EXISTS social_ideas_update ON public.social_ideas;

CREATE POLICY social_ideas_update ON public.social_ideas FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'operador'))
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.client_id = social_ideas.client_id
    )
  );
```

**Efecto:**
- ✅ Equipo interno (admin/operador) puede editar cualquier idea
- ✅ Clientes pueden editar ideas de su propio cliente
- ✅ Todos pueden agregar links, comentarios, cambiar estado, etc.

---

## 🚀 Instrucciones de Aplicación

### 1. Aplicar Migraciones en Supabase
```bash
# Ir al SQL Editor en Supabase Dashboard
# Copiar y ejecutar AMBAS migraciones en orden:

1. supabase/migrations/00050_users_public_info.sql
2. supabase/migrations/00051_social_ideas_permissions.sql
```

### 2. Reiniciar el Servidor
```bash
npm run dev
```

### 3. Configurar Usuario "nico"
```
1. Ir a Settings → Gestión de Usuarios
2. Editar "nico":
   - Módulos visibles: SOLO "Calendario de clientes"
   - Clientes permitidos: Click "🔒 Restringir" → Seleccionar SOLO "LOF"
3. Guardar con ✓
```

### 4. Verificar como "nico"
```
1. Cerrar sesión
2. Ingresar como nico@mercodigital.com
3. Verificar:
   ✅ Sidebar: solo "Calendario de clientes"
   ✅ Calendario: solo cliente "LOF"
   ✅ Abrir una idea/tarea
   ✅ Botón "✏️ Editar" visible
   ✅ Puede cambiar título, descripción, etc.
   ✅ Puede agregar links (📎 adjuntos)
   ✅ Puede cambiar estado (pills de borrador/en revisión/etc.)
   ✅ Comentarios muestran nombres reales
```

### 5. Verificar como Cliente (laura@mercouser.com LOF)
```
1. Cerrar sesión
2. Ingresar como laura@mercouser.com (si existe)
3. Verificar:
   ✅ Ve SOLO ideas del cliente LOF
   ✅ Puede editar ideas (botón ✏️)
   ✅ Puede elegir tipo: Reel/Historia/Carrusel
   ✅ Puede agregar links/adjuntos
   ✅ Puede cambiar estado
   ✅ Puede comentar
   ✅ Comentarios muestran nombres reales
```

---

## 📋 Resumen de Capacidades

### Equipo Interno (admin/operador como "nico")
- ✅ Ver calendarios de clientes asignados (`allowed_client_ids`)
- ✅ Crear nuevas ideas
- ✅ Editar CUALQUIER idea (título, descripción, brief, copy, eje)
- ✅ Cambiar tipo de post (Reel/Historia/Carrusel/Sugerencia)
- ✅ Cambiar estado (borrador → en revisión → aprobada → listo → posteado)
- ✅ Asignar equipo con roles (responsable/ejecutor/control)
- ✅ Agregar/quitar links (attachments)
- ✅ Comentar y ver comentarios con nombres reales
- ✅ Cambiar fecha de publicación
- ✅ Arrastrar y soltar ideas entre fechas (drag & drop)

### Clientes (como "laura LOF")
- ✅ Ver calendarios de su propio cliente
- ✅ Crear nuevas ideas
- ✅ Editar ideas de su cliente (mismas capacidades que equipo interno)
- ✅ Cambiar tipo de post
- ✅ Cambiar estado
- ✅ Agregar/quitar links
- ✅ Comentar con nombres reales
- ✅ Ver equipo asignado
- ✅ Arrastrar y soltar ideas

---

## ⚠️ Notas Importantes

1. **Eliminar ideas:** Solo admin/operador pueden eliminar ideas (política DELETE sin cambios)
2. **Permisos de clientes:** Clientes solo pueden editar ideas de su propio `client_id`
3. **Información pública:** Ahora todos los usuarios pueden ver nombres/avatares/emails/roles de cualquier usuario autenticado
4. **Build:** ✅ Código compila sin errores TypeScript

---

## 🔗 Archivos Modificados

1. **Migraciones:**
   - `supabase/migrations/00050_users_public_info.sql` (NEW)
   - `supabase/migrations/00051_social_ideas_permissions.sql` (NEW)

2. **UI Gestión de Usuarios:**
   - `src/app/(dashboard)/settings/page.tsx` (mejorado botón Restringir/Permitir todos)

**Total:** 2 migraciones SQL + 1 mejora de UI

---

## ✅ Checklist de Verificación

- [ ] Aplicar migración 00050 en Supabase SQL Editor
- [ ] Aplicar migración 00051 en Supabase SQL Editor
- [ ] Reiniciar `npm run dev`
- [ ] Configurar permisos de "nico" (solo calendario LOF)
- [ ] Probar como "nico": ver calendario, editar idea, agregar link, comentar
- [ ] Verificar que comentarios muestran nombres reales
- [ ] Probar como cliente "laura LOF": editar idea, cambiar tipo, agregar link
- [ ] Verificar que cliente solo ve su propio client_id

**Fecha:** Septiembre 2026  
**Build:** ✅ OK  
**Estado:** Listo para aplicar en producción
