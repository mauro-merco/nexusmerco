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

async function listComments(access: ResolvedAccess) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('calendar_comments')
    .select('*')
    .eq('client_id', access.clientId)
    .eq('calendar_type', access.calendarType)
    .eq('month', access.month)
    .order('created_at', { ascending: true });
  if (error) throw error;

  const comments = data || [];
  const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
  const usersMap: Record<string, Record<string, unknown>> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, email, role')
      .in('id', userIds);
    for (const u of users || []) usersMap[u.id] = u;
  }

  return comments.map(c => ({ ...c, user: usersMap[c.user_id] || null }));
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
      link: '/calendarios',
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
