import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-security';
import { getDocCaller, getDocAccess, cleanTags, DOC_KINDS, DOC_STATUSES } from '@/lib/documents-server';
import { logActivity } from '@/lib/activity-events';

const supabase = getAdminClient();

const STATUS_LABEL: Record<string, string> = {
  borrador: 'Borrador', en_revision: 'En revisión', aprobado: 'Aprobado', final: 'Final',
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getDocCaller(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const access = await getDocAccess(supabase, id, caller);
    if (!access) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    if (!access.canView) return NextResponse.json({ error: 'Sin acceso a este documento' }, { status: 403 });
    const { doc, shareUserIds } = access;

    const userIds = [...new Set([doc.owner_id, doc.last_edited_by, ...shareUserIds].filter(Boolean))];
    const [{ data: users }, clientRes, { data: links }, { data: state }] = await Promise.all([
      supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds),
      doc.client_id
        ? supabase.from('clients').select('id, name, logo_url').eq('id', doc.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('document_links').select('task_id').eq('document_id', id),
      supabase.from('document_user_state').select('is_favorite, last_viewed_at').eq('document_id', id).eq('user_id', caller.id).maybeSingle(),
    ]);
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const taskIds = (links || []).map(l => l.task_id);
    const { data: tasks } = taskIds.length
      ? await supabase.from('tasks').select('id, title, status, client_id, due_date').in('id', taskIds)
      : { data: [] as any[] };

    // Registrar "visto" (best-effort).
    await supabase.from('document_user_state').upsert(
      { document_id: id, user_id: caller.id, is_favorite: !!state?.is_favorite, last_viewed_at: new Date().toISOString() },
      { onConflict: 'document_id,user_id' }
    );

    return NextResponse.json({
      data: {
        ...doc,
        kind: doc.kind || 'documento',
        status: doc.status || 'borrador',
        tags: doc.tags || [],
        client: clientRes.data || null,
        owner: usersMap[doc.owner_id] || null,
        last_editor: doc.last_edited_by ? usersMap[doc.last_edited_by] || null : null,
        shared_users: shareUserIds.map(uid => usersMap[uid]).filter(Boolean),
        linked_tasks: tasks || [],
        is_favorite: !!state?.is_favorite,
        last_viewed_at: state?.last_viewed_at || null,
        is_shared_with_me: !access.isOwner && access.isShared,
        can_edit: access.canEdit,
      },
    });
  } catch (e) {
    console.error('GET /api/documents/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getDocCaller(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const access = await getDocAccess(supabase, id, caller);
    if (!access) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    if (!access.canView) return NextResponse.json({ error: 'Sin acceso a este documento' }, { status: 403 });

    // Favorito: preferencia personal, alcanza con poder ver el documento.
    if (body.favorite !== undefined) {
      const { error } = await supabase.from('document_user_state').upsert(
        { document_id: id, user_id: caller.id, is_favorite: !!body.favorite },
        { onConflict: 'document_id,user_id' }
      );
      if (error) throw error;
      const onlyFavorite = Object.keys(body).every(k => k === 'favorite');
      if (onlyFavorite) return NextResponse.json({ data: { id, is_favorite: !!body.favorite } });
    }

    if (!access.canEdit) return NextResponse.json({ error: 'Sin permiso para editar' }, { status: 403 });
    if (body.is_public !== undefined && !access.isOwner) {
      return NextResponse.json({ error: 'Solo el propietario puede cambiar la visibilidad' }, { status: 403 });
    }

    const prev = access.doc;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), last_edited_by: caller.id };
    if (typeof body.title === 'string') updates.title = body.title.slice(0, 300);
    if (typeof body.content === 'string') updates.content = body.content;
    if (body.is_public !== undefined) updates.is_public = !!body.is_public;
    if (body.client_id !== undefined) updates.client_id = body.client_id || null;
    if (body.kind !== undefined && DOC_KINDS.includes(body.kind)) updates.kind = body.kind;
    if (body.status !== undefined && DOC_STATUSES.includes(body.status)) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = cleanTags(body.tags);
    if (body.color !== undefined) updates.color = typeof body.color === 'string' && body.color ? body.color.slice(0, 20) : null;
    if (body.icon !== undefined) updates.icon = typeof body.icon === 'string' && body.icon ? body.icon.slice(0, 8) : null;
    if (body.archived !== undefined) updates.archived_at = body.archived ? new Date().toISOString() : null;

    const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single();
    if (error) throw error;

    const clientId = data.client_id || prev.client_id;
    if (clientId) {
      const events = [];
      if (updates.status && updates.status !== prev.status) {
        events.push({ action: 'status_changed', fromValue: STATUS_LABEL[prev.status] || prev.status, toValue: STATUS_LABEL[data.status] || data.status });
      }
      if (updates.client_id !== undefined && updates.client_id !== prev.client_id && data.client_id) {
        events.push({ action: 'updated', detail: 'Vinculó el documento al cliente' });
      }
      if (body.archived !== undefined && !!prev.archived_at !== !!body.archived) {
        events.push({ action: 'updated', detail: body.archived ? 'Archivó el documento' : 'Restauró el documento' });
      }
      if (events.length) {
        await logActivity(supabase, events.map(ev => ({
          clientId, area: 'general' as const, entityType: 'document', entityId: id, entityTitle: data.title, actorId: caller.id, ...ev,
        })));
      }
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error('PUT /api/documents/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await getDocCaller(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const access = await getDocAccess(supabase, id, caller);
    if (!access) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    if (!access.isOwner && caller.role !== 'admin') {
      return NextResponse.json({ error: 'Solo el propietario puede eliminar' }, { status: 403 });
    }

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;

    if (access.doc.client_id) {
      await logActivity(supabase, {
        clientId: access.doc.client_id, area: 'general', entityType: 'document', entityId: id,
        entityTitle: access.doc.title, action: 'deleted', actorId: caller.id,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/documents/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
