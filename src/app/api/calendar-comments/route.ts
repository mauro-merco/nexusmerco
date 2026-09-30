import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { createMentionNotifications } from '@/lib/mentions';
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
    const requestedType: CalendarType = isCalendarType(calendarType || '')
      ? (calendarType as CalendarType)
      : 'social';
    const resolved = await resolveCalendarLink(supabase, token, requestedType);
    if ('error' in resolved) return resolved;
    const viewer = await resolveCalendarViewer(request, supabase, resolved.link);
    if (!viewer) return { error: 'Email no autorizado para este calendario', status: 401 };
    const targetMonth = resolved.month || month || '';
    if (!isValidMonth(targetMonth)) return { error: 'Mes inválido', status: 400 };
    return {
      clientId: resolved.client.id,
      calendarType: resolved.type,
      month: targetMonth,
      userId: viewer.id,
      isStaff: viewer.isStaff,
    };
  }

  // Internal: require a real session and derive the author from the token.
  const authHeader = request.headers.get('authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt || jwt === 'undefined') return { error: 'No autenticado', status: 401 };

  let sessionUserId = '';
  try {
    const payload = decodeJwt(jwt);
    sessionUserId = String(payload.sub || '');
  } catch {
    return { error: 'No autenticado', status: 401 };
  }
  if (!sessionUserId) return { error: 'No autenticado', status: 401 };

  const { data: me } = await supabase
    .from('users')
    .select('id, role, client_id')
    .eq('id', sessionUserId)
    .maybeSingle();
  if (!me) return { error: 'No autenticado', status: 401 };
  if (!clientId) return { error: 'client_id requerido', status: 400 };
  if (me.role !== 'admin' && me.role !== 'operador' && me.client_id !== clientId) {
    return { error: 'No autorizado para este cliente', status: 403 };
  }
  if (!calendarType || !isCalendarType(calendarType)) return { error: 'Tipo de calendario inválido', status: 400 };
  if (!month || !isValidMonth(month)) return { error: 'Mes inválido', status: 400 };

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

  const generalItems = generalComments.map(c => ({
    id: c.id,
    scope: 'calendar' as const,
    user_id: c.user_id,
    content: c.content,
    created_at: c.created_at,
    user: usersMap[c.user_id] || null,
    idea: null,
    replies: [],
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
    return NextResponse.json({ data: await listComments(access) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const access = await resolveAccess(request, body.client_id, body.calendar_type, body.month);
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status });

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) return NextResponse.json({ error: 'El comentario está vacío' }, { status: 400 });
    if (content.length > 5000) return NextResponse.json({ error: 'El comentario es demasiado largo' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('calendar_comments')
      .insert({
        client_id: access.clientId,
        calendar_type: access.calendarType,
        month: access.month,
        user_id: access.userId,
        content,
      })
      .select()
      .single();
    if (error) throw error;

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
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
