import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-security';
import { getDocCaller, getDocAccess } from '@/lib/documents-server';
import { createMentionNotifications, createNotification } from '@/lib/mentions';
import { logActivity } from '@/lib/activity-events';

const supabase = getAdminClient();

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
    const { data, error } = await supabase
      .from('document_comments')
      .select('*')
      .eq('document_id', r.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const rows = data || [];
    const userIds = [...new Set(rows.map(c => c.user_id))];
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, full_name, avatar_url, email').in('id', userIds)
      : { data: [] as any[] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const withUser = rows.map(c => ({ ...c, user: usersMap[c.user_id] || null }));
    const nested = withUser.filter(c => !c.parent_id).map(c => ({ ...c, replies: withUser.filter(x => x.parent_id === c.id) }));
    return NextResponse.json({ data: nested });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const { content, parent_id } = await request.json();
    const text = typeof content === 'string' ? content.trim() : '';
    if (!text) return NextResponse.json({ error: 'El comentario está vacío' }, { status: 400 });

    const { data, error } = await supabase
      .from('document_comments')
      .insert({ document_id: r.id, user_id: r.caller.id, content: text.slice(0, 5000), parent_id: parent_id || null })
      .select()
      .single();
    if (error) throw error;

    const doc = r.access.doc;
    const link = `/documentos?doc=${r.id}`;
    await createMentionNotifications(supabase, text, r.caller.id, { link, entityLabel: `el documento “${doc.title}”` });
    if (doc.owner_id !== r.caller.id) {
      await createNotification(supabase, {
        user_id: doc.owner_id,
        type: 'mention',
        title: 'Nuevo comentario en tu documento',
        message: `Comentaron en “${doc.title}”`,
        link,
      });
    }
    if (doc.client_id) {
      await logActivity(supabase, {
        clientId: doc.client_id, area: 'general', entityType: 'document', entityId: r.id,
        entityTitle: doc.title, action: 'commented', detail: text.slice(0, 140), actorId: r.caller.id,
      });
    }

    const { data: u } = await supabase.from('users').select('id, full_name, avatar_url, email').eq('id', r.caller.id).single();
    return NextResponse.json({ data: { ...data, user: u, replies: [] } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

/** PUT { comment_id, resolved?, content? } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const body = await request.json();
    if (!body.comment_id) return NextResponse.json({ error: 'comment_id requerido' }, { status: 400 });
    const { data: comment } = await supabase.from('document_comments').select('*').eq('id', body.comment_id).eq('document_id', r.id).maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.resolved !== undefined) {
      if (!r.access.canEdit && comment.user_id !== r.caller.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
      updates.resolved = !!body.resolved;
    }
    if (typeof body.content === 'string') {
      if (comment.user_id !== r.caller.id) return NextResponse.json({ error: 'Solo el autor puede editar' }, { status: 403 });
      if (!body.content.trim()) return NextResponse.json({ error: 'El comentario está vacío' }, { status: 400 });
      updates.content = body.content.trim().slice(0, 5000);
    }
    const { data, error } = await supabase.from('document_comments').update(updates).eq('id', comment.id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

/** DELETE ?comment_id= (autor, dueño del documento o admin) */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const r = await load(request, params);
    if ('error' in r) return r.error;
    const commentId = new URL(request.url).searchParams.get('comment_id');
    if (!commentId) return NextResponse.json({ error: 'comment_id requerido' }, { status: 400 });
    const { data: comment } = await supabase.from('document_comments').select('user_id').eq('id', commentId).eq('document_id', r.id).maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
    if (comment.user_id !== r.caller.id && !r.access.isOwner && r.caller.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }
    const { error } = await supabase.from('document_comments').delete().eq('id', commentId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
