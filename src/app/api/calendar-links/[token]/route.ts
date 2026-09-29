import { NextResponse } from 'next/server';
import { enrichIdeasWithAssignees } from '@/lib/idea-assignees-server';
import {
  getSupabaseAdmin,
  hasCalendarAccess,
  isCalendarType,
  resolveCalendarLink,
  type CalendarType,
} from '@/lib/calendar-access-server';

const getAdmin = getSupabaseAdmin;

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const requestedMonth = url.searchParams.get('month');
    const requestedType = url.searchParams.get('type') || 'social';
    const metaOnly = url.searchParams.get('meta') === '1';

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    if (!isCalendarType(requestedType)) return NextResponse.json({ error: 'Tipo de calendario inválido' }, { status: 400 });

    const supabase = getAdmin();
    const resolved = await resolveCalendarLink(supabase, token, requestedType);
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });

    const { client, link, type } = resolved;
    const month = resolved.month || requestedMonth;

    // Validate the requested calendar type is enabled
    if (type === 'ads' && !client.ads_calendar_enabled) {
      return NextResponse.json({ error: 'Calendario ADS no disponible para este cliente' }, { status: 404 });
    }
    if (type === 'social' && !client.social_calendar_enabled) {
      return NextResponse.json({ error: 'Calendario de redes no disponible para este cliente' }, { status: 404 });
    }

    if (metaOnly) {
      return NextResponse.json({
        client: { id: client.id, name: client.name, logo_url: client.logo_url },
        calendar_type: type,
        month,
        requires_guest_email: true,
      });
    }

    const canAccess = await hasCalendarAccess(request, supabase, link);
    if (!canAccess) return NextResponse.json({ error: 'Email no autorizado para este calendario' }, { status: 401 });

    const table = type === 'ads' ? 'ads_ideas' : 'social_ideas';

    // Fetch ideas
    let query = supabase
      .from(table)
      .select('*')
      .eq('client_id', client.id)
      .order('publish_date', { ascending: true });

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      query = query.gte('publish_date', `${month}-01`).lt('publish_date', nextMonth);
    }

    const { data: ideas, error: ideasError } = await query;
    if (ideasError) throw ideasError;
    const enrichedIdeas = await enrichIdeasWithAssignees(
      supabase,
      type === 'ads' ? 'ads_idea_assignees' : 'social_idea_assignees',
      ideas || [],
    );
    const publicIdeas = enrichedIdeas.map(idea => ({
      ...idea,
      assignees: idea.assignees.map(assignee => ({
        id: assignee.id,
        full_name: assignee.full_name,
        avatar_url: assignee.avatar_url,
        work_role: assignee.work_role,
      })),
    }));

    // Fetch attachments (social only — ads doesn't have attachments yet)
    let attachments: Record<string, { url: string; name: string; type: string }[]> = {};
    if (type === 'social' && ideas && ideas.length > 0) {
      const { data: atts } = await supabase
        .from('social_attachments')
        .select('*')
        .in('idea_id', ideas.map((i) => i.id));

      if (atts) {
        for (const att of atts) {
          if (!attachments[att.idea_id]) attachments[att.idea_id] = [];
          attachments[att.idea_id].push({ url: att.url, name: att.name, type: att.type });
        }
      }
    }

    // Fetch comments with user information
    let comments: Record<string, unknown[]> = {};
    if (ideas && ideas.length > 0) {
      const commentTable = type === 'ads' ? 'ads_comments' : 'social_comments';
      const { data: comms } = await supabase
        .from(commentTable)
        .select('*')
        .in('idea_id', ideas.map((i) => i.id))
        .order('created_at', { ascending: true });

      if (comms) {
        // Fetch user information for all comment authors
        const userIds = [...new Set(comms.map(c => c.user_id).filter(Boolean))];
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, email')
          .in('id', userIds);
        
        const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

        for (const comm of comms) {
          if (!comments[comm.idea_id]) comments[comm.idea_id] = [];
          comments[comm.idea_id].push({
            ...comm,
            user: comm.user_id ? usersMap[comm.user_id] || null : null,
          });
        }
      }
    }

    // Fetch ecommerce dates for ADS calendar
    let ecommerceDates: unknown[] = [];
    if (type === 'ads') {
      let edQuery = supabase
        .from('ecommerce_dates')
        .select('*')
        .eq('client_id', client.id)
        .order('start_date', { ascending: true });

      if (month) {
        const [y, m] = month.split('-').map(Number);
        const monthStart = `${month}-01`;
        const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
        edQuery = edQuery.lt('start_date', nextMonth).gte('end_date', monthStart);
      }

      const { data: eds } = await edQuery;
      ecommerceDates = eds || [];
    }

    // Fetch all users for the idea modal (needed for assignees picker)
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, role')
      .in('role', ['admin', 'operador'])
      .order('full_name', { ascending: true });

    return NextResponse.json({
      client: { id: client.id, name: client.name, logo_url: client.logo_url },
      ideas: publicIdeas,
      attachments_by_idea: attachments,
      comments_by_idea: comments,
      ecommerce_dates: ecommerceDates,
      calendar_type: type,
      month,
      users: allUsers || [],
    });
  } catch (e) {
    console.error('GET /api/calendar-links/[token] error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
