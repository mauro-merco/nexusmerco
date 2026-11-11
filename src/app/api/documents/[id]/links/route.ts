import { NextResponse } from 'next/server';
import { getAdminClient, canAccessClient } from '@/lib/api-security';
import { getDocCaller, getDocAccess } from '@/lib/documents-server';
import { logActivity } from '@/lib/activity-events';

const supabase = getAdminClient();

/** Vincular / desvincular un documento con una tarea. El vínculo se ve desde los dos lados. */
async function load(request: Request, params: Promise<{ id: string }>) {
  const caller = await getDocCaller(request, supabase);
  if (!caller) return { error: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) };
  const { id } = await params;
  const access = await getDocAccess(supabase, id, caller);
  if (!access) return { error: NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 }) };
  if (!access.canView) return { error: NextResponse.json({ error: 'Sin acceso a este documento' }, { status: 403 }) };
  return { caller, access, id };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const { data: links } = await supabase.from('document_links').select('task_id').eq('document_id', r.id);
    const ids = (links || []).map(l => l.task_id);
    const { data } = ids.length
      ? await supabase.from('tasks').select('id, title, status, client_id, due_date').in('id', ids)
      : { data: [] };
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const { task_id } = await request.json();
    if (!task_id) return NextResponse.json({ error: 'task_id requerido' }, { status: 400 });

    const { data: task } = await supabase.from('tasks').select('id, title, status, client_id, due_date').eq('id', task_id).maybeSingle();
    if (!task) return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    if (!r.caller.isStaff && !canAccessClient(r.caller, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await supabase.from('document_links').upsert(
      { document_id: r.id, task_id, created_by: r.caller.id },
      { onConflict: 'document_id,task_id', ignoreDuplicates: true }
    );
    if (error) throw error;

    // Si el documento no tenía cliente, toma el de la tarea.
    if (!r.access.doc.client_id && task.client_id && r.access.canEdit) {
      await supabase.from('documents').update({ client_id: task.client_id }).eq('id', r.id);
    }

    await logActivity(supabase, {
      clientId: task.client_id, area: 'task', entityType: 'task', entityId: task.id, entityTitle: task.title,
      action: 'updated', detail: `Adjuntó el documento “${r.access.doc.title}”`, actorId: r.caller.id,
    });

    return NextResponse.json({ data: task });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const taskId = new URL(request.url).searchParams.get('task_id');
    if (!taskId) return NextResponse.json({ error: 'task_id requerido' }, { status: 400 });
    const { error } = await supabase.from('document_links').delete().eq('document_id', r.id).eq('task_id', taskId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
