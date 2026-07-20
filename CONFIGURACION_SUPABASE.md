# 🚀 GUÍA DE CONFIGURACIÓN DE SUPABASE

## 📋 PASO 1: Crear Proyecto en Supabase

1. **Ir a Supabase:**
   - Visita https://supabase.com
   - Inicia sesión o crea una cuenta

2. **Crear nuevo proyecto:**
   - Click en "New Project"
   - Nombre del proyecto: `nexus-marketing-dashboard`
   - Database Password: **Guarda esta contraseña en un lugar seguro**
   - Region: Selecciona la más cercana (ej: South America - São Paulo)
   - Plan: Free tier es suficiente para comenzar
   - Click en "Create new project"
   - ⏱️ Espera 2-3 minutos mientras se crea el proyecto

---

## 📊 PASO 2: Ejecutar el Schema de Base de Datos

1. **Abrir SQL Editor:**
   - En el panel izquierdo, click en "SQL Editor"
   - Click en "New query"

2. **Copiar y ejecutar el schema:**
   - Abre el archivo `supabase-schema.sql` en este proyecto
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase
   - Click en "Run" (o presiona Ctrl+Enter)
   - ✅ Deberías ver "Success. No rows returned"

3. **Verificar tablas creadas:**
   - En el panel izquierdo, click en "Table Editor"
   - Deberías ver las siguientes tablas:
     - ✅ users
     - ✅ clients
     - ✅ weekly_inputs
     - ✅ optimizations
     - ✅ tasks
     - ✅ integrations
     - ✅ ai_insights

---

## 🔐 PASO 3: Obtener las API Keys

1. **Ir a Settings:**
   - En el panel izquierdo, click en el ícono de engranaje ⚙️
   - Click en "API"

2. **Copiar las credenciales:**
   - **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (⚠️ Mantener secreta)

3. **Actualizar .env.local:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## 📁 PASO 4: Configurar Storage para CSV

1. **Crear bucket:**
   - En el panel izquierdo, click en "Storage"
   - Click en "Create a new bucket"
   - Nombre: `csv-uploads`
   - Public bucket: **NO** (mantener privado)
   - Click en "Create bucket"

2. **Configurar políticas de acceso:**
   - Click en el bucket `csv-uploads`
   - Click en "Policies"
   - Click en "New Policy"
   - Selecciona "Custom policy"
   - Pega esta política:

   ```sql
   -- Permitir a usuarios autenticados subir archivos
   CREATE POLICY "Users can upload CSV files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'csv-uploads');

   -- Permitir a usuarios ver sus propios archivos
   CREATE POLICY "Users can view their own files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'csv-uploads');

   -- Permitir a usuarios eliminar sus propios archivos
   CREATE POLICY "Users can delete their own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'csv-uploads');
   ```

---

## 👤 PASO 5: Configurar Autenticación

1. **Habilitar Email Authentication:**
   - En el panel izquierdo, click en "Authentication"
   - Click en "Providers"
   - Verifica que "Email" esté habilitado (debería estar por defecto)

2. **Configurar Email Templates (Opcional):**
   - Click en "Email Templates"
   - Personaliza los emails de confirmación y recuperación de contraseña

3. **Crear primer usuario de prueba:**
   - Click en "Users"
   - Click en "Add user"
   - Email: `admin@nexus.com`
   - Password: `Admin123!` (o la que prefieras)
   - Click en "Create user"
   - ✅ Este será tu usuario admin para pruebas

---

## 🔒 PASO 6: Configurar Row Level Security (RLS)

Las políticas RLS ya están incluidas en el `supabase-schema.sql`, pero verifica que estén activas:

1. **Verificar RLS:**
   - Ve a "Table Editor"
   - Para cada tabla, click en el ícono de escudo 🛡️
   - Verifica que "Enable RLS" esté activado
   - Deberías ver las políticas creadas

2. **Políticas importantes:**
   - ✅ Users solo pueden ver sus propios datos
   - ✅ Admins pueden ver todos los datos
   - ✅ Clients solo ven datos de su empresa
   - ✅ Team members ven datos de clientes asignados

---

## ✅ PASO 7: Verificar la Configuración

1. **Probar la conexión:**
   ```bash
   npm run dev
   ```

2. **Verificar en la consola del navegador:**
   - Abre http://localhost:3000
   - Abre DevTools (F12)
   - No deberías ver errores de Supabase
   - Si ves "Missing Supabase environment variables", revisa el .env.local

3. **Probar autenticación:**
   - Ve a http://localhost:3000/login
   - Intenta iniciar sesión con el usuario creado
   - Si funciona, ¡estás listo! 🎉

---

## 🎯 PRÓXIMOS PASOS

Una vez que Supabase esté configurado:

1. **Cambiar a datos reales:**
   ```bash
   # En .env.local
   NEXT_PUBLIC_USE_MOCK_DATA=false
   ```

2. **Implementar funcionalidades:**
   - ✅ Autenticación real (siguiente paso)
   - ⏳ Upload de CSV
   - ⏳ Integración con IA
   - ⏳ Integraciones con plataformas

---

## 🆘 TROUBLESHOOTING

### Error: "Missing Supabase environment variables"
- ✅ Verifica que `.env.local` existe
- ✅ Verifica que las variables están correctamente copiadas
- ✅ Reinicia el servidor de desarrollo (`npm run dev`)

### Error: "Invalid API key"
- ✅ Verifica que copiaste la key completa (son muy largas)
- ✅ No debe haber espacios al inicio o final
- ✅ Verifica que estás usando la key del proyecto correcto

### Error: "Failed to fetch"
- ✅ Verifica que la URL de Supabase es correcta
- ✅ Verifica tu conexión a internet
- ✅ Verifica que el proyecto de Supabase está activo

### Las tablas no se crearon
- ✅ Verifica que ejecutaste TODO el contenido de `supabase-schema.sql`
- ✅ Revisa si hay errores en el SQL Editor
- ✅ Intenta ejecutar el schema por partes

---

## 📚 RECURSOS ADICIONALES

- **Documentación de Supabase:** https://supabase.com/docs
- **Supabase Auth:** https://supabase.com/docs/guides/auth
- **Supabase Storage:** https://supabase.com/docs/guides/storage
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security

---

## 🔐 SEGURIDAD

⚠️ **IMPORTANTE:**

- ❌ NUNCA commitees el archivo `.env.local` a Git
- ❌ NUNCA compartas tu `service_role_key` públicamente
- ✅ Usa diferentes proyectos para desarrollo y producción
- ✅ Rota las API keys regularmente
- ✅ Habilita 2FA en tu cuenta de Supabase

---

**Fecha de creación:** 8 de junio de 2026  
**Versión:** 1.0  
**Autor:** Nexus Development Team
