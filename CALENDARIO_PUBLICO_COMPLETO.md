# ✅ CALENDARIO PÚBLICO - MODAL COMPLETO IMPLEMENTADO

## 🎯 Lo que se implementó

### **Calendario Público ahora usa el mismo modal que el calendario interno**

Tanto **clientes** (mercouser.com) como **equipo interno** (mercodigital.com) que accedan al calendario público (`/c/[token]`) ahora tienen **acceso completo** para:

✅ **Ver ideas** con modal completo  
✅ **Editar ideas** (título, brief, copy, descripción)  
✅ **Cambiar estado** (borrador → en revisión → aprobada → listo → posteado)  
✅ **Cambiar tipo de post** (Reel, Historia, Carrusel, Sugerencia)  
✅ **Asignar equipo** con roles (responsable, ejecutor, control)  
✅ **Agregar links/attachments**  
✅ **Agregar comentarios** (se ven nombres reales, no "usuario")  
✅ **Cambiar fecha de publicación**  
✅ **Crear nuevas ideas** con el modal completo (botón `+`)

---

## 🔧 Cambios Técnicos

### 1. **API actualizada** (`/api/calendar-links/[token]`)
- Ahora devuelve lista de `users` (equipo interno) para el picker de asignados
- Comentarios incluyen info de usuarios (JOIN con tabla users)
- **Migración 00050** permite lectura pública de users

### 2. **Modal reemplazado**
- **ANTES:** `IdeaModal` (solo lectura, ~180 líneas)
- **AHORA:** `SocialIdeaModal` (componente compartido con calendario interno)
- **Resultado:** Funcionalidad 100% idéntica

### 3. **Flujo de creación de nuevas ideas**
- **ANTES:** Modal simplificado con solo título/tipo/descripción/links
- **AHORA:** 
  1. Al presionar `+` se crea idea mínima en servidor (`"Nueva idea"`, tipo `sugerencia`)
  2. Se abre `SocialIdeaModal` con la idea recién creada
  3. Usuario completa todos los campos (brief, copy, equipo, etc.)
  4. Guarda desde el modal completo

---

## 📦 Archivos Modificados

1. **API:** `src/app/api/calendar-links/[token]/route.ts`
   - Agrega fetch de usuarios
   - Enriquece comentarios con info de users

2. **Calendario público:** `src/app/c/[token]/page.tsx`
   - Import `SocialIdeaModal`
   - Elimina función `IdeaModal` (182 líneas)
   - Elimina variables de estado del modal simple
   - Nueva función `handleAddNewIdea` que crea idea y abre modal
   - Reemplaza renderizado de modales con `SocialIdeaModal`

3. **Types:** Interface `CalendarData` incluye `users: NexusUser[]`

**Total:** ~200 líneas eliminadas, código reutilizado del modal interno

---

## 🚀 Cómo Probar

### Como Cliente (laura@mercouser.com)
1. Ir a link público del calendario (ej: `/c/da5d037b-f9f4-447f-ab05-17f05ab80e81`)
2. Iniciar sesión con credenciales de cliente
3. **Click en una idea existente:**
   - ✅ Se abre modal completo
   - ✅ Botón "Editar" visible
   - ✅ Puede cambiar estado, tipo, brief, copy, etc.
   - ✅ Puede agregar links
   - ✅ Puede asignar equipo
   - ✅ Comentarios muestran nombres reales
4. **Click en `+` (nueva idea):**
   - ✅ Se abre modal completo directamente
   - ✅ Todos los campos disponibles
   - ✅ Puede completar brief, copy, asignar equipo, etc.

### Como Equipo Interno (nico@mercodigital.com)
1. Igual que arriba
2. **Mismo nivel de acceso** que clientes
3. Puede editar cualquier idea del cliente

---

## ⚠️ Notas Importantes

### Permisos RLS ya aplicados
Las migraciones **00050** y **00051** ya permiten:
- ✅ Lectura de información pública de usuarios
- ✅ Edición de ideas para equipo interno Y clientes

### Sincronización
- Los cambios se guardan en tiempo real en el servidor
- Uso del endpoint existente de social-ideas (`PUT /api/social-ideas/[id]`)
- Las políticas RLS validan que:
  - Admin/operador: pueden editar cualquier idea
  - Clientes: solo ideas de su `client_id`

### Flujo de Nueva Idea
El modal de crear necesita una idea existente (diseño de `SocialIdeaModal`), por eso:
1. Se crea automáticamente al presionar `+`
2. Se abre el modal inmediatamente
3. Usuario completa y guarda

**Alternativa considerada pero descartada:**  
Modificar `SocialIdeaModal` para aceptar `idea` opcional (modo create) hubiera requerido cambiar el componente compartido y afectar el calendario interno.

---

## ✅ Checklist de Verificación

- [x] API devuelve lista de usuarios
- [x] API enriquece comentarios con nombres
- [x] Comentarios muestran nombres reales (no "usuario")
- [x] Click en idea abre modal completo
- [x] Modal permite editar todos los campos
- [x] Puede cambiar estado con pills
- [x] Puede asignar equipo con roles
- [x] Puede agregar links/attachments
- [x] Click en `+` crea idea y abre modal completo
- [x] Clientes ven misma interfaz que equipo interno
- [x] Build compila sin errores TypeScript

---

## 🎉 Resultado Final

**CALENDARIO INTERNO == CALENDARIO PÚBLICO**

Ahora NO hay diferencia funcional entre:
- Calendario dentro de la app (`/calendarios`)
- Calendario público con link (`/c/[token]`)

Ambos usan el **mismo componente** (`SocialIdeaModal`) y ofrecen la **misma experiencia completa** de edición.

**Fecha:** Septiembre 2026  
**Build:** ✅ OK  
**Estado:** ✅ Listo para producción
