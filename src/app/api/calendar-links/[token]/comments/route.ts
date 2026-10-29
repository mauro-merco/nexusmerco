import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isCalendarType, resolveCalendarLink, resolveCalendarViewer } from '@/lib/calendar-access-server';
import { logActivity } from '@/lib/activity-events';

async function handle(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const query = new URL(request.url).searchParams;
    const type = query.get('calendar_type') || '';
    if (!isCalendarType(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    const db = getSupabaseAdmin();
    const resolved = await resolveCalendarLink(db, token, type);
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    if (resolved.type !== type) return NextResponse.json({ error: 'Tipo inválido' }, { status: 403 });
    const viewer = await resolveCalendarViewer(request, db, resolved.link);
    if (!viewer) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const ideaId = query.get('idea_id');
    const { data: idea, error: ideaError } = await db.from(type === 'ads' ? 'ads_ideas' : 'social_ideas')
      .select('id, title, publish_date').eq('id', ideaId).eq('client_id', resolved.client.id).maybeSingle();
    if (ideaError) throw ideaError;
    if (!idea || (resolved.month && !idea.publish_date?.startsWith(`${resolved.month}-`))) {
      return NextResponse.json({ error: 'Idea no disponible' }, { status: 404 });
    }
    const table = type === 'ads' ? 'ads_comments' : 'social_comments';
    const readType = type === 'ads' ? 'ads_comment' : 'social_comment';
    const body = request.method === 'GET' ? {} : await request.json();
    if (request.method !== 'GET') {
      const id = body.id;
      if (id || body.parent_id) {
        const { data: target, error } = await db.from(table).select('id, user_id').eq('id', id || body.parent_id).eq('idea_id', idea.id).maybeSingle();
        if (error) throw error;
        if (!target) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
        if (body.action !== 'seen' && id && target.user_id !== viewer.id) return NextResponse.json({ error: 'Solo podés modificar tus comentarios' }, { status: 403 });
      }
      if (body.action === 'seen') {
        if (!id) return NextResponse.json({ error: 'Comentario requerido' }, { status: 400 });
        const { data: existing, error } = await db.from('comment_reads').select('user_id').eq('comment_type', readType).eq('comment_id', id).eq('user_id', viewer.id).maybeSingle();
        if (error) throw error;
        const result = existing
          ? await db.from('comment_reads').delete().eq('comment_type', readType).eq('comment_id', id).eq('user_id', viewer.id)
          : await db.from('comment_reads').insert({ comment_type: readType, comment_id: id, user_id: viewer.id });
        if (result.error) throw result.error;
      } else if (request.method === 'DELETE') {
        if (!id) return NextResponse.json({ error: 'Comentario requerido' }, { status: 400 });
        const { error } = await db.from(table).delete().eq('id', id).eq('idea_id', idea.id).eq('user_id', viewer.id);
        if (error) throw error;
      } else {
        const content = typeof body.content === 'string' ? body.content.trim() : '';
        if (!content || content.length > 5000) return NextResponse.json({ error: 'El comentario debe tener entre 1 y 5000 caracteres' }, { status: 400 });
        if (request.method === 'PUT' && !id) return NextResponse.json({ error: 'Comentario requerido' }, { status: 400 });
        const result = id
          ? await db.from(table).update({ content }).eq('id', id).eq('idea_id', idea.id).eq('user_id', viewer.id)
          : await db.from(table).insert({ idea_id: idea.id, user_id: viewer.id, content, parent_id: body.parent_id || null });
        if (result.error) throw result.error;
        if (!id) await logActivity(db, { clientId: resolved.client.id, area: type, entityType: type === 'ads' ? 'ads_idea' : 'social_idea', entityId: idea.id, entityTitle: idea.title, action: 'commented', detail: content, actorId: viewer.id });
      }
    }
    const { data: rows, error } = await db.from(table).select('*').eq('idea_id', idea.id).order('created_at');
    if (error) throw error;
    const ids = (rows || []).map(c => c.id);
    const { data: marks, error: readError } = ids.length
      ? await db.from('comment_reads').select('comment_id, user_id').eq('comment_type', readType).in('comment_id', ids)
      : { data: [], error: null };
    if (readError) throw readError;
    const userIds = [...new Set([...(rows || []).map(c => c.user_id), ...(marks || []).map(r => r.user_id)].filter(Boolean))];
    const { data: users, error: usersError } = userIds.length ? await db.from('users').select('id, full_name, avatar_url').in('id', userIds) : { data: [], error: null };
    if (usersError) throw usersError;
    const userMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const readers: Record<string, unknown[]> = {};
    for (const mark of marks || []) (readers[mark.comment_id] ||= []).push(userMap[mark.user_id]);
    const nodes = (rows || []).map(c => ({ ...c, user: userMap[c.user_id] || null, replies: [] as unknown[] }));
    const map = new Map(nodes.map(c => [c.id, c]));
    for (const node of nodes) if (node.parent_id) map.get(node.parent_id)?.replies.push(node);
    return NextResponse.json({ data: nodes.filter(c => !c.parent_id), readers, user_id: viewer.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Public idea comments:', error);
    return NextResponse.json({ error: 'No se pudieron cargar o guardar los comentarios' }, { status: 500 });
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
