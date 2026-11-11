import { NextResponse } from 'next/server';
import { getAdminClient, canAccessClient } from '@/lib/api-security';
import { getDocCaller, cleanTags, htmlExcerpt, DOC_KINDS, DOC_STATUSES } from '@/lib/documents-server';
import { logActivity } from '@/lib/activity-events';

const supabase = getAdminClient();

/**
 * GET /api/documents
 *   (sin filtros)   → mis documentos + compartidos conmigo + (equipo) documentos de clientes
 *   ?client_id=X    → documentos del cliente X (propios del cliente + vinculados a sus tareas)
 *   ?task_id=X      → documentos vinculados a la tarea X
 */
export async function GET(request: Request) {
  try {
    const caller = await getDocCaller(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const taskId = searchParams.get('task_id');

    const byId = new Map<string, any>();

    if (taskId) {
      const { data: task } = await supabase.from('tasks').select('id, client_id').eq('id', taskId).maybeSingle();
      if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
      if (!caller.isStaff && !canAccessClient(caller, task.client_id)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const { data: links } = await supabase.from('document_links').select('document_id').eq('task_id', taskId);
      const ids = (links || []).map(l => l.document_id);
      if (ids.length) {
        const { data } = await supabase.from('documents').select('*').in('id', ids);
        for (const d of data || []) byId.set(d.id, d);
      }
    } else if (clientId) {
      if (!caller.isStaff && !caller.isTeamDomain) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const [{ data: direct }, { data: clientTasks }] = await Promise.all([
        supabase.from('documents').select('*').eq('client_id', clientId),
        supabase.from('tasks').select('id').eq('client_id', clientId),
      ]);
      for (const d of direct || []) byId.set(d.id, d);
      const taskIds = (clientTasks || []).map(t => t.id);
      if (taskIds.length) {
        const { data: links } = await supabase.from('document_links').select('document_id').in('task_id', taskIds);
        const extra = [...new Set((links || []).map(l => l.document_id))].filter(id => !byId.has(id));
        if (extra.length) {
          const { data } = await supabase.from('documents').select('*').in('id', extra);
          for (const d of data || []) byId.set(d.id, d);
        }
      }
    } else {
      const [{ data: owned }, { data: sharedRows }] = await Promise.all([
        supabase.from('documents').select('*').eq('owner_id', caller.id),
        supabase.from('document_shares').select('document_id').eq('user_id', caller.id),
      ]);
      for (const d of owned || []) byId.set(d.id, d);
      const sharedIds = (sharedRows || []).map(r => r.document_id).filter(id => !byId.has(id));
      if (sharedIds.length) {
        const { data } = await supabase.from('documents').select('*').in('id', sharedIds);
        for (const d of data || []) byId.set(d.id, { ...d, is_shared_with_me: true });
      }
      if (caller.isTeamDomain || caller.isStaff) {
        const { data: clientDocs } = await supabase.from('documents').select('*').not('client_id', 'is', null);
        for (const d of clientDocs || []) if (!byId.has(d.id)) byId.set(d.id, { ...d, is_client_doc: true });
      }
    }

    const docs = [...byId.values()];
    const enriched = await enrichDocuments(docs, caller.id, caller.isStaff);
    enriched.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/documents error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

async function enrichDocuments(docs: any[], userId: string, staff: boolean) {
  if (docs.length === 0) return [];
  const docIds = docs.map(d => d.id);
  const ownerIds = [...new Set(docs.flatMap(d => [d.owner_id, d.last_edited_by]).filter(Boolean))];
  const clientIds = [...new Set(docs.map(d => d.client_id).filter(Boolean))];

  const [sharesRes, linksRes, commentsRes, stateRes, clientsRes] = await Promise.all([
    supabase.from('document_shares').select('document_id, user_id').in('document_id', docIds),
    supabase.from('document_links').select('document_id, task_id').in('document_id', docIds),
    supabase.from('document_comments').select('document_id').in('document_id', docIds),
    supabase.from('document_user_state').select('document_id, is_favorite, last_viewed_at').eq('user_id', userId).in('document_id', docIds),
    clientIds.length ? supabase.from('clients').select('id, name, logo_url').in('id', clientIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const shareMap: Record<string, string[]> = {};
  for (const s of sharesRes.data || []) (shareMap[s.document_id] ||= []).push(s.user_id);

  const linkMap: Record<string, string[]> = {};
  for (const l of linksRes.data || []) (linkMap[l.document_id] ||= []).push(l.task_id);
  const taskIds = [...new Set((linksRes.data || []).map(l => l.task_id))];
  const { data: tasks } = taskIds.length
    ? await supabase.from('tasks').select('id, title, status, client_id').in('id', taskIds)
    : { data: [] as any[] };
  const tasksMap = Object.fromEntries((tasks || []).map(t => [t.id, t]));

  const commentCount: Record<string, number> = {};
  for (const c of commentsRes.data || []) commentCount[c.document_id] = (commentCount[c.document_id] || 0) + 1;

  const stateMap = Object.fromEntries((stateRes.data || []).map(s => [s.document_id, s]));
  const clientsMap = Object.fromEntries((clientsRes.data || []).map((c: any) => [c.id, c]));

  const allUserIds = [...new Set([...ownerIds, ...Object.values(shareMap).flat()])];
  const { data: users } = allUserIds.length
    ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', allUserIds)
    : { data: [] as any[] };
  const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

  return docs.map(d => {
    const sharedWith = shareMap[d.id] || [];
    const isOwner = d.owner_id === userId;
    const isShared = sharedWith.includes(userId);
    return {
      ...d,
      kind: d.kind || 'documento',
      status: d.status || 'borrador',
      tags: d.tags || [],
      excerpt: htmlExcerpt(d.content, 220),
      client: d.client_id ? clientsMap[d.client_id] || null : null,
      owner: usersMap[d.owner_id] || null,
      last_editor: d.last_edited_by ? usersMap[d.last_edited_by] || null : null,
      shared_users: sharedWith.map(uid => usersMap[uid]).filter(Boolean),
      linked_tasks: (linkMap[d.id] || []).map(tid => tasksMap[tid]).filter(Boolean),
      comment_count: commentCount[d.id] || 0,
      is_favorite: !!stateMap[d.id]?.is_favorite,
      last_viewed_at: stateMap[d.id]?.last_viewed_at || null,
      is_shared_with_me: !isOwner && isShared,
      can_edit: isOwner || isShared || staff,
    };
  });
}

export async function POST(request: Request) {
  try {
    const caller = await getDocCaller(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const kind = DOC_KINDS.includes(body.kind) ? body.kind : 'documento';
    const status = DOC_STATUSES.includes(body.status) ? body.status : 'borrador';
    const taskId: string | null = body.task_id || null;
    let clientId: string | null = body.client_id || null;

    // Un documento creado desde una tarea hereda el cliente de la tarea.
    let task: { id: string; title: string; client_id: string | null } | null = null;
    if (taskId) {
      const { data } = await supabase.from('tasks').select('id, title, client_id').eq('id', taskId).maybeSingle();
      if (!data) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
      if (!caller.isStaff && !canAccessClient(caller, data.client_id)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      task = data;
      if (!clientId) clientId = data.client_id;
    }

    const insert: Record<string, unknown> = {
      owner_id: caller.id,
      title: (typeof body.title === 'string' && body.title.trim()) || (kind === 'nota' ? 'Nota' : 'Sin título'),
      content: typeof body.content === 'string' ? body.content : '',
      is_public: !!body.is_public,
      client_id: clientId,
      kind,
      status,
      tags: cleanTags(body.tags),
      color: typeof body.color === 'string' ? body.color.slice(0, 20) : null,
      icon: typeof body.icon === 'string' ? body.icon.slice(0, 8) : null,
      last_edited_by: caller.id,
    };

    const { data, error } = await supabase.from('documents').insert(insert).select().single();
    if (error) throw error;

    if (task) {
      await supabase.from('document_links').insert({ document_id: data.id, task_id: task.id, created_by: caller.id });
    }

    if (data.client_id) {
      await logActivity(supabase, {
        clientId: data.client_id,
        area: 'general',
        entityType: 'document',
        entityId: data.id,
        entityTitle: data.title,
        action: 'created',
        detail: task ? `Desde la tarea “${task.title}”` : null,
        actorId: caller.id,
      });
    }

    return NextResponse.json({ data: { ...data, can_edit: true, tags: data.tags || [], linked_tasks: task ? [task] : [], comment_count: 0 } });
  } catch (e) {
    console.error('POST /api/documents error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
