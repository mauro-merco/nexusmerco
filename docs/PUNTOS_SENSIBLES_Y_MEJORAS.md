# Puntos sensibles y mejoras futuras

Este documento registra riesgos tecnicos detectados durante el relevamiento general. No forma parte del alcance funcional inmediato y sirve como backlog para una etapa posterior de estabilizacion.

## Prioridad critica

### Autenticacion y autorizacion de APIs

- Muchas rutas usan `SUPABASE_SERVICE_ROLE_KEY` y omiten RLS.
- Varias rutas aceptan IDs de usuario o cliente enviados por el navegador sin comprobar propiedad o permisos.
- `decodeJwt()` decodifica tokens, pero no valida firma, emisor, audiencia ni expiracion.
- Hay operaciones destructivas de clientes, periodos, cargas y tareas sin una frontera de autorizacion uniforme.

Mejora sugerida: crear una capa central de autenticacion de servidor que valide el token con Supabase, resuelva usuario/rol y compruebe acceso al recurso antes de usar service role.

### RLS y aislamiento de datos

- Algunas tablas no tienen RLS y otras poseen politicas demasiado amplias.
- Persisten referencias al rol historico `team`, aunque la aplicacion usa `admin`, `operador` y `client`.
- El uso generalizado de service role neutraliza las politicas correctas.

Mejora sugerida: auditar tabla por tabla, definir politicas por propietario y cliente, y reservar service role para administracion estrictamente necesaria.

### Migraciones reproducibles

- `00000_full_setup.sql` es destructiva y no deberia ejecutarse como una migracion incremental normal.
- El historial disponible modifica `tasks`, pero no contiene claramente su creacion original.
- Hay cambios de constraints cuyo orden puede fallar con datos existentes.

Mejora sugerida: generar un baseline no destructivo, probar una instalacion desde cero y separar bootstrap, migraciones incrementales y datos iniciales.

## Prioridad alta

### Escrituras multi-tabla y cargas

- Las importaciones usan `delete + insert` sin transaccion.
- Tarea + asignados + notificaciones y mensaje + notificacion pueden quedar parcialmente guardados.
- Algunos errores secundarios se ignoran.

Mejora sugerida: mover operaciones atomicas a funciones SQL/RPC transaccionales y devolver errores completos.

### Validacion de entradas

- La mayoria de las APIs consume `request.json()` sin esquemas de runtime.
- No hay limites consistentes para CSV, avatares, textos o arrays.
- Los parsers mezclan formatos numericos de distintas configuraciones regionales.

Mejora sugerida: DTOs con Zod, limites de tamano/MIME y normalizacion regional explicita.

### 2FA y sesiones

- El challenge TOTP no queda ligado criptograficamente a la sesion iniciada.
- No hay rate limiting general.
- Los secretos TOTP se almacenan sin una capa visible de cifrado.
- El access token se persiste en `localStorage`, aumentando el impacto de XSS.

Mejora sugerida: completar el flujo de assurance de sesion, cifrar secretos, aplicar rate limiting y evaluar cookies seguras `httpOnly`.

### HTML enriquecido y XSS

- Los documentos persisten HTML y el editor usa `innerHTML`.
- La sanitizacion de contenido generado por IA es regex-based.

Mejora sugerida: sanitizacion allowlist en servidor y cliente con una libreria mantenida, incluyendo URLs y atributos.

### Privacidad de enlaces publicos

- Calendarios, tareas, perfiles y reportes dependen de tokens compartidos o flags publicos.
- Algunos gates son principalmente visuales.
- Los tokens no tienen expiracion ni scopes granulares.

Mejora sugerida: permisos por recurso, expiracion/revocacion y payloads publicos minimizados.

## Prioridad media

### Capa de datos y tipado

- No hay tipos generados de Supabase.
- Se repiten clientes admin, consultas y reglas de permisos en Route Handlers.
- Existen `any` y strings de dominio distribuidos.

Mejora sugerida: tipos de base generados, repositorios o servicios por dominio y constantes compartidas.

### Cache y sincronizacion cliente

- Los hooks usan `fetch`, `useState` y `useEffect` sin cache o invalidacion central.
- Hay polling repetido para mensajes, notificaciones y recordatorios.

Mejora sugerida: adoptar una capa de consultas compartida y usar Realtime o invalidacion coordinada donde aporte valor.

### Pruebas y entrega

- No existen pruebas automatizadas ni CI.
- No hay cobertura de permisos, parsers, migraciones o flujos criticos.

Mejora sugerida: empezar por pruebas de autorizacion de APIs, parsers CSV y recorridos de tareas/calendarios; ejecutar lint, typecheck y build en CI.

### Rendimiento y arquitectura frontend

- Gran parte de la aplicacion es client-side y aprovecha poco Server Components.
- El dashboard concentra muchos componentes y un bundle inicial grande.
- Se usan imagenes sin la optimizacion de `next/image` en varios lugares.

Mejora sugerida: dividir por rutas/modulos, cargar paneles pesados bajo demanda y revisar limites server/client.

### Internacionalizacion y documentacion

- Hay textos hardcodeados en espanol y el atributo `lang` no siempre coincide.
- El README principal sigue siendo el de create-next-app.
- `.env.example` y algunos documentos operativos no reflejan todo el runtime actual.

Mejora sugerida: completar diccionarios, tipar claves y mantener una guia unica de instalacion, migracion y operacion.

## Criterio para abordar este backlog

1. Cerrar primero autenticacion, autorizacion y operaciones destructivas.
2. Hacer reproducible la base de datos y asegurar escrituras atomicas.
3. Incorporar validacion y pruebas de regresion.
4. Recién despues optimizar arquitectura, rendimiento y experiencia de desarrollo.
