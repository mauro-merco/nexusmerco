-- 00053: Backfill de 'mensajes' solo para admins
--
-- Contexto: la migracion 00031 (public_profiles_and_messages) creo el modulo
-- de Mensajes y loAgrego a handle_new_user, pero NO hizo backfill sobre los
-- usuarios ya existentes (a diferencia de 00024 documentos y 00044
-- sugerencias, que si lo hicieron). Solo 3 usuarios quedaron con el modulo.
--
-- Politica de acceso al chat (vigente a partir de esta migracion):
--   - admin  -> siempre tienen 'mensajes'
--   - operador / client -> 'mensajes' viene en DEFAULT_MODULES para ambos
--     roles (src/lib/types.ts), asi que los usuarios nuevos lo reciben por
--     defecto. Quien quiera dejarlo fuera tiene que desmarcarlo usuario por
--     usuario desde Settings > Gestion de Usuarios.
--
-- Este script solo cubre el caso de los admins, que ya existian antes de que
-- 'mensajes' entrara en DEFAULT_MODULES. Para cambiar los permisos de una
-- persona concreta se usa Settings > Gestion de Usuarios, que edita
-- visible_modules por usuario.

-- Backfill idempotente: agrega 'mensajes' a los admins que no lo tengan,
-- preservando el resto de sus modulos.
UPDATE public.users
SET visible_modules = COALESCE(
      visible_modules,
      ARRAY['dashboard','wizard','tareas','equipo','analysis','integrations','insights','calendarios','documentos','sugerencias']
    ) || ARRAY['mensajes']
WHERE role = 'admin'
  AND NOT (COALESCE(visible_modules, ARRAY[]::TEXT[]) @> ARRAY['mensajes']);

-- Verificacion 1: debe devolver 0 filas (ningun admin sin 'mensajes')
SELECT email, role, visible_modules
FROM public.users
WHERE role = 'admin'
  AND NOT (visible_modules @> ARRAY['mensajes']);

-- Verificacion 2: quien mas tiene el chat habilitado
SELECT email, role, visible_modules
FROM public.users
WHERE visible_modules @> ARRAY['mensajes']
ORDER BY role, email;
