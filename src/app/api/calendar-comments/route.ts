import { NextResponse } from 'next/server';
import { getRequestUser, safeError } from '@/lib/api-security';
import { createMentionNotifications } from '@/lib/mentions';
import { logActivity } from '@/lib/activity-events';
import {
  getSupabaseAdmin,
  isCalendarType,
  isValidMonth,
  resolveCalendarLink,
  resolveCalendarViewer,
  type CalendarType,
} from '@/lib/calendar-access-server';

type ResolvedAccess = {
  clientId: string;
  calendarType: CalendarType;
  month: string;
  userId: string;
  isStaff: boolean;
};

type Access = { error: string; status: number } | ResolvedAccess;

function commentErrorResponse(error: unknown) {
  const databaseError = error as { code?: string; message?: string } | null;
  const code = typeof databaseError?.code === 'string' ? databaseError.code : undefined;
  const message = typeof databaseError?.message === 'string' ? databaseError.message : '';
  if ((code === '42703' || code === 'PGRST204') && message.includes('parent_id')) {
    return NextResponse.json({
      error: 'Las respuestas a comentarios requieren aplicar la migracion 00076_calendar_comments_replies.sql.',
      code: 'CALENDAR_COMMENT_REPLIES_UNAVAILABLE',
    }, { status: 503 });
  }
  return NextResponse.json({
    error: `No se pudo procesar el comentario: ${safeError(message || error, 'Error interno')}`,
    ...(code ? { code } : {}),
  }, { status: 500 });
}

/**
 * Resolves who is acting and which thread they are allowed to touch.
 * Public visitors go through a share token (session or guest email); internal
 * users go through their Supabase session. The thread is always derived from
 * the resolved link/session, never from the request body.
 */
async function resolveAccess(request: Request, clientId?: string | null, calendarType?: string | null, month?: string | null): Promise<Access> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const supabase = getSupabaseAdmin();

  if (token) {
    if (calendarType && !isCalendarType(calendarType)) return { error: 'Tipo de calendario inválido', status: 400 };
    const requestedType: CalendarType = isCalendarType(calendarType || '')
      ? (calendarType as CalendarType)
      : 'social';
    const resolved = await resolveCalendarLink(supabase, token, requestedType);
    if ('error' in resolved) return resolved;
    if (resolved.type !== requestedType || (clientId && clientId !== resolved.client.id) ||
      (resolved.month && month && resolved.month !== month)) {
      return { error: 'Calendario fuera del alcance del enlace', status: 403 };
    }
    const viewer = await resolveCalendarViewer(request, supabase, resolved.link);
    if (!viewer) return { error: 'Email no autorizado para este calendario', status: 401 };
    const targetMonth = resolved.month || month || '';
    if (!isValidMonth(targetMonth) || !/-(0[1-9]|1[0-2])$/.test(targetMonth)) return { error: 'Mes inválido', status: 400 };
    return {
      clientId: resolved.client.id,
      calendarType: resolved.type,
      month: targetMonth,
      userId: viewer.id,
      isStaff: viewer.isStaff,
    };
  }

  // Internal: require a real session and derive the author from the token.
  const sessionUser = await getRequestUser(request, supabase);
  if (!sessionUser) return { error: 'No autenticado', status: 401 };

  const { data: me } = await supabase
    .from('users')
    .select('id, role, client_id, allowed_client_ids')
    .eq('id', sessionUser.id)
    .maybeSingle();
  if (!me) return { error: 'No autenticado', status: 401 };
  if (!clientId) return { error: 'client_id requerido', status: 400 };
  
  // Check access: admin/operador, or client_id match, or in allowed_client_ids
  const isStaffUser = me.role === 'admin' || me.role === 'operador';
  const hasClientAccess = me.client_id === clientId || (Array.isArray(me.allowed_client_ids) && me.allowed_client_ids.includes(clientId));
  
  if (!isStaffUser && !hasClientAccess) {
    return { error: 'No autorizado para este cliente', status: 403 };
  }
  if (!calendarType || !isCalendarType(calendarType)) return { error: 'Tipo de calendario inválido', status: 400 };
  if (!month || !isValidMonth(month) || !/-(0[1-9]|1[0-2])$/.test(month)) return { error: 'Mes inválido', status: 400 };

  return {
    clientId,
    calendarType,
    month,
    userId: me.id,
    isStaff: me.role === 'admin' || me.role === 'operador',
  };
}

/** Date bounds of a YYYY-MM month, as publish_date is a DATE column. */
function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { start: `${month}-01`, end: nextMonth };
}

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  idea_id?: string;
  parent_id?: string | null;
}

interface IdeaRow {
  id: string;
  title: string;
  publish_date: string | null;
}

async function fetchUsersMap(userIds: string[]) {
  const map: Record<string, Record<string, unknown>> = {};
  if (userIds.length === 0) return map;
  const { data: users } = await getSupabaseAdmin()
    .from('users')
    .select('id, full_name, avatar_url, email, role')
    .in('id', userIds);
  for (const u of users || []) map[u.id] = u;
  return map;
}

/**
 * Unified feed for the month being viewed: the general calendar comments plus
 * the comments written on each idea, so one list answers "who commented what
 * and on which content". Idea comments keep their replies nested.
 */
async function listComments(access: ResolvedAccess) {
  const supabase = getSupabaseAdmin();

  const { data: general, error } = await supabase
    .from('calendar_comments')
    .select('*')
    .eq('client_id', access.clientId)
    .eq('calendar_type', access.calendarType)
    .eq('month', access.month)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const { start, end } = monthBounds(access.month);
  const ideasTable = access.calendarType === 'ads' ? 'ads_ideas' : 'social_ideas';
  const commentsTable = access.calendarType === 'ads' ? 'ads_comments' : 'social_comments';

  const { data: ideas, error: ideasError } = await supabase
    .from(ideasTable)
    .select('id, title, publish_date')
    .eq('client_id', access.clientId)
    .gte('publish_date', start)
    .lt('publish_date', end)
    .order('publish_date', { ascending: true });
  if (ideasError) throw ideasError;

  const monthIdeas = (ideas || []) as IdeaRow[];
  const ideaById = new Map(monthIdeas.map(i => [i.id, i]));

  let ideaComments: CommentRow[] = [];
  if (monthIdeas.length > 0) {
    const { data, error: commentsError } = await supabase
      .from(commentsTable)
      .select('*')
      .in(
        'idea_id',
        monthIdeas.map(i => i.id),
      )
      .order('created_at', { ascending: true });
    if (commentsError) throw commentsError;
    ideaComments = (data || []) as CommentRow[];
  }

  const generalComments = (general || []) as CommentRow[];
  const allUserIds = [
    ...new Set(
      [...generalComments.map(c => c.user_id), ...ideaComments.map(c => c.user_id)].filter(Boolean),
    ),
  ];
  const usersMap = await fetchUsersMap(allUserIds);

  // Build threaded replies for general comments
  const topLevelGeneral = generalComments.filter(c => !c.parent_id);
  const generalItems = topLevelGeneral.map(c => ({
    id: c.id,
    scope: 'calendar' as const,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    user: usersMap[c.user_id] || null,
    idea: null,
    replies: generalComments
      .filter(r => r.parent_id === c.id)
      .map(r => ({
        id: r.id,
        scope: 'calendar' as const,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at,
        user: usersMap[r.user_id] || null,
      })),
  }));

  const ideaItems = ideaComments
    .filter(c => !c.parent_id)
    .map(c => {
      const idea = c.idea_id ? ideaById.get(c.idea_id) : undefined;
      return {
        id: c.id,
        scope: 'idea' as const,
        idea_id: c.idea_id,
        user_id: c.user_id,
        content: c.content,
        created_at: c.created_at,
        user: usersMap[c.user_id] || null,
        idea: idea ? { id: idea.id, title: idea.title, publish_date: idea.publish_date } : null,
        replies: ideaComments
          .filter(r => r.parent_id === c.id)
          .map(r => ({
            id: r.id,
            scope: 'idea' as const,
            idea_id: r.idea_id,
            user_id: r.user_id,
            content: r.content,
            created_at: r.created_at,
            user: usersMap[r.user_id] || null,
          })),
      };
    })
    // Ideas deleted after the comment was written have no title to show.
    .filter(item => item.idea !== null);

  return [...generalItems, ...ideaItems].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const access = await resolveAccess(
      request,
      searchParams.get('client_id'),
      searchParams.get('calendar_type'),
      searchParams.get('month'),
    );
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
    if (searchParams.get('action') === 'readers') {
      const db = getSupabaseAdmin();
      const { data: comments, error } = await db.from('calendar_comments').select('id')
        .eq('client_id', access.clientId).eq('calendar_type', access.calendarType).eq('month', access.month);
      if (error) throw error;
      const ids = (comments || []).map(c => c.id);
      const { data: marks, error: readError } = ids.length
        ? await db.from('comment_reads').select('comment_id, user_id').eq('comment_type', 'calendar_comment').in('comment_id', ids)
        : { data: [], error: null };
      if (readError) throw readError;
      const userIds = [...new Set((marks || []).map(r => r.user_id))];
      const { data: users, error: usersError } = userIds.length
        ? await db.from('users').select('id, full_name, avatar_url').in('id', userIds)
        : { data: [], error: null };
      if (usersError) throw usersError;
      const map = Object.fromEntries((users || []).map(u => [u.id, u]));
      const readers: Record<string, unknown[]> = {};
      for (const mark of marks || []) (readers[mark.comment_id] ||= []).push(map[mark.user_id] || { id: mark.user_id, full_name: null, avatar_url: null });
      return NextResponse.json({ data: readers }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ data: await listComments(access), user_id: access.userId }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return commentErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'seen') return await monthlyAction(request, body);
    const access = await resolveAccess(request, body.client_id, body.calendar_type, body.month);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return NextResponse.json({ error: 'El comentario está vacío' }, { status: 400 });
    if (content.length > 5000) return NextResponse.json({ error: 'El comentario es demasiado largo' }, { status: 400 });

    const parentId = body.parent_id || null;

    const supabase = getSupabaseAdmin();
    if (parentId) {
      const { data: parent, error: parentError } = await supabase.from('calendar_comments')
        .select('id').eq('id', parentId).eq('client_id', access.clientId)
        .eq('calendar_type', access.calendarType).eq('month', access.month).maybeSingle();
      if (parentError) throw parentError;
      if (!parent) return NextResponse.json({ error: 'Comentario padre no encontrado' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('calendar_comments')
      .insert({
        client_id: access.clientId,
        calendar_type: access.calendarType,
        month: access.month,
        user_id: access.userId,
        content,
        // Root comments also work before the optional replies migration is applied.
        ...(parentId ? { parent_id: parentId } : {}),
      })
      .select()
      .single();
    if (error) throw error;

    await logActivity(supabase, {
      clientId: access.clientId,
      area: 'general',
      entityType: 'calendar',
      entityId: data.id,
      entityTitle: access.calendarType === 'ads' ? 'Calendario ADS' : 'Calendario de Redes',
      action: 'commented',
      detail: content,
      toValue: access.calendarType,
      actorId: access.userId,
    });

    await createMentionNotifications(supabase, content, access.userId, {
      link: `/calendarios?client=${access.clientId}&type=${access.calendarType === 'ads' ? 'ads' : 'redes'}&month=${access.month}`,
      entityLabel: 'un comentario del calendario',
    });

    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, email, role')
      .eq('id', access.userId)
      .maybeSingle();

    return NextResponse.json({ data: { ...data, user: user || null } });
  } catch (e) {
    return commentErrorResponse(e);
  }
}

async function monthlyAction(request: Request, body: Record<string, unknown>) {
  const query = new URL(request.url).searchParams;
  const access = await resolveAccess(request, query.get('client_id'), query.get('calendar_type'), query.get('month'));
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = getSupabaseAdmin();
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'Comentario requerido' }, { status: 400 });
  const { data: target, error } = await db.from('calendar_comments').select('id, user_id')
    .eq('id', id).eq('client_id', access.clientId).eq('calendar_type', access.calendarType).eq('month', access.month).maybeSingle();
  if (error) throw error;
  if (!target) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
  if (body.action === 'seen') {
    const { data: existing, error: readError } = await db.from('comment_reads').select('user_id')
      .eq('comment_type', 'calendar_comment').eq('comment_id', id).eq('user_id', access.userId).maybeSingle();
    if (readError) throw readError;
    const result = existing
      ? await db.from('comment_reads').delete().eq('comment_type', 'calendar_comment').eq('comment_id', id).eq('user_id', access.userId)
      : await db.from('comment_reads').insert({ comment_type: 'calendar_comment', comment_id: id, user_id: access.userId });
    if (result.error) return NextResponse.json({ error: 'No se pudo guardar el visto. Verifica que se haya aplicado 00078_calendar_comment_reads.sql.' }, { status: 503 });
  } else {
    if (target.user_id !== access.userId) return NextResponse.json({ error: 'Solo el autor puede modificar el comentario' }, { status: 403 });
    if (request.method === 'DELETE') {
      const { error: deleteError } = await db.from('calendar_comments').delete().eq('id', id).eq('user_id', access.userId);
      if (deleteError) throw deleteError;
    } else {
      const content = typeof body.content === 'string' ? body.content.trim() : '';
      if (!content || content.length > 5000) return NextResponse.json({ error: 'El comentario debe tener entre 1 y 5000 caracteres' }, { status: 400 });
      const { error: updateError } = await db.from('calendar_comments').update({ content }).eq('id', id).eq('user_id', access.userId);
      if (updateError) throw updateError;
    }
  }
  return NextResponse.json({ data: { id } });
}

export async function PUT(request: Request) {
  try { return await monthlyAction(request, await request.json()); }
  catch (error) { return commentErrorResponse(error); }
}

export async function DELETE(request: Request) {
  try { return await monthlyAction(request, await request.json()); }
  catch (error) { return commentErrorResponse(error); }
}
