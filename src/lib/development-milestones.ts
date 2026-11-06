import type { DevLogEntry } from '@/app/api/development-log/route';

// Curated development work that was done in code but not automatically recorded
// in development_log. "source: code" intentionally does not imply deployment.
export const DEVELOPMENT_MILESTONES: DevLogEntry[] = [
  {
    id: 'code-2026-11-06-salas-speed', commit_hash: null,
    title: 'Salas: reacciones y vistos inmediatos',
    description: 'Las reacciones y el ojo de visto se actualizan en pantalla al instante; si falla la solicitud se deshace el cambio. Ya no hace falta recargar todo el historial para cada clic.',
    category: 'fix', files_changed: ['src/lib/hooks/use-salas.ts'], author_id: null,
    created_at: '2026-11-06T14:00:00-03:00', tags: ['salas', 'rendimiento'], priority: 'high',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-06-salas-edit', commit_hash: null,
    title: 'Salas: edición de mensajes y respuestas en móvil',
    description: 'Los autores y moderadores pueden editar mensajes y respuestas. Las acciones para responder, reaccionar y marcar visto también quedan accesibles en pantallas táctiles. Las ediciones se registran en la participación.',
    category: 'feature', files_changed: ['src/components/sala-message.tsx', 'src/components/sala-room-view.tsx'], author_id: null,
    created_at: '2026-11-06T13:50:00-03:00', tags: ['salas'], priority: 'normal',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-06-salas-invite', commit_hash: null,
    title: 'Invitaciones a salas para usuarios del equipo',
    description: 'El creador de una sala o un administrador puede invitar a integrantes admin/operador, sin invitar clientes. Los nuevos integrantes reciben una notificación. Se validan los permisos también en la API.',
    category: 'feature', files_changed: ['src/app/api/salas/[id]/invite/route.ts', 'src/components/sala-room-view.tsx'], author_id: null,
    created_at: '2026-11-06T13:40:00-03:00', tags: ['salas', 'invitaciones'], priority: 'normal',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-06-salas-images', commit_hash: null,
    title: 'Imágenes y GIFs en mensajes de salas',
    description: 'Se pueden compartir imágenes y GIFs mediante enlaces HTTPS directos, con vista previa. Los archivos se cargan desde el sitio de origen y no se alojan en la aplicación. No incluye catálogo de GIFs.',
    category: 'feature', files_changed: ['src/components/sala-room-view.tsx', 'src/components/sala-message.tsx'], author_id: null,
    created_at: '2026-11-06T13:30:00-03:00', tags: ['salas', 'imágenes'], priority: 'normal',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-06-calendar-links', commit_hash: 'd8e0da4',
    title: 'Enlaces y adjuntos visibles en calendarios compartidos',
    description: 'Los clientes que ingresan mediante el enlace compartido pueden ver el material y los adjuntos de cada idea en modo lectura, sin depender de la sesión de administrador.',
    category: 'fix', files_changed: ['src/app/api/calendar-links/[token]/route.ts', 'src/components/material-links.tsx'], author_id: null,
    created_at: '2026-11-06T13:00:00-03:00', tags: ['calendario', 'clientes'], priority: 'high',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-05-salas', commit_hash: '4ba08ef',
    title: 'Nueva sección Salas con boletines y conversaciones',
    description: 'Boletines para anuncios del equipo y salas de chat públicas o privadas, con mensajes, respuestas en hilo, reacciones, vistos, miembros y notificaciones. Incluye la pestaña Mi participación y un historial de interacciones en los perfiles.',
    category: 'feature', files_changed: ['src/app/(dashboard)/salas/page.tsx', 'supabase/migrations/00081_salas.sql'], author_id: null,
    created_at: '2026-11-05T15:15:18-03:00', tags: ['salas', 'boletines', 'perfiles'], priority: 'high',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-05-search', commit_hash: '4ba08ef',
    title: 'Buscador ampliado con borde luminoso',
    description: 'La búsqueda global encuentra tareas, comentarios, ideas de Redes y ADS, usuarios, documentos, sugerencias y mensajes de salas respetando permisos. El modal y la barra de búsqueda tienen borde luminoso animado.',
    category: 'feature', files_changed: ['src/app/api/search/route.ts', 'src/components/global-search.tsx'], author_id: null,
    created_at: '2026-11-05T15:10:00-03:00', tags: ['búsqueda', 'interfaz'], priority: 'normal',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
  {
    id: 'code-2026-11-05-suggestions', commit_hash: '4ba08ef',
    title: 'Sugerencias y bugs en la barra superior',
    description: 'Las acciones para enviar sugerencias y reportar bugs se movieron del botón flotante a un menú desplegable junto al buscador.',
    category: 'style', files_changed: ['src/components/suggestions-floating-buttons.tsx', 'src/app/(dashboard)/layout.tsx'], author_id: null,
    created_at: '2026-11-05T15:00:00-03:00', tags: ['sugerencias', 'interfaz'], priority: 'normal',
    pr_url: null, deployed: false, deployed_at: null, source: 'code',
  },
];
