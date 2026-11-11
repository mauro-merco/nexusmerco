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

    // El link de redes muestra exactamente lo mismo que el calendario interno de
    // redes (/calendarios/<cliente>): ideas de redes + piezas de ADS + fechas
    // ecommerce. El link de ADS sigue mostrando solo ADS.
    const sources: ('social' | 'ads')[] = type === 'ads' ? ['ads'] : ['social', 'ads'];
    let range: { start: string; end: string } | null = null;
    if (month) {
      const [y, m] = month.split('-').map(Number);
      range = {
        start: new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10),
        end: new Date(Date.UTC(y, m + 1, 1)).toISOString().slice(0, 10),
      };
    }

    const publicIdeas: Record<string, unknown>[] = [];
    const materialLinks: Record<string, { id: string; title: string; url: string }[]> = {};
    const attachments: Record<string, { url: string; name: string; type: string }[]> = {};
    const comments: Record<string, unknown[]> = {};

    for (const source of sources) {
      const isAdsSource = source === 'ads';
      let query = supabase
        .from(isAdsSource ? 'ads_ideas' : 'social_ideas')
        .select('*')
        .eq('client_id', client.id)
        .order('publish_date', { ascending: true });
      if (range) query = query.gte('publish_date', range.start).lt('publish_date', range.end);

      const { data: ideas, error: ideasError } = await query;
      if (ideasError) {
        // Si la tabla de ADS no existe en esta base, el calendario de redes sigue funcionando.
        if (isAdsSource && type !== 'ads') continue;
        throw ideasError;
      }
      if (!ideas?.length) continue;
      const ids = ideas.map(idea => idea.id);

      const enrichedIdeas = await enrichIdeasWithAssignees(
        supabase,
        isAdsSource ? 'ads_idea_assignees' : 'social_idea_assignees',
        ideas,
      );
      for (const idea of enrichedIdeas) {
        publicIdeas.push({
          ...idea,
          calendar_type: source,
          assignees: idea.assignees.map(assignee => ({
            id: assignee.id,
            full_name: assignee.full_name,
            avatar_url: assignee.avatar_url,
            work_role: assignee.work_role,
          })),
        });
      }

      // The shared calendar has its own guest authorization; dashboard-only
      // /api/material-links cannot be called by visitors of this link.
      const { data: links, error: linksError } = await supabase
        .from('material_links')
        .select('id, entity_id, title, url')
        .eq('entity_type', isAdsSource ? 'ads_idea' : 'social_idea')
        .in('entity_id', ids)
        .order('created_at', { ascending: true });
      if (linksError) throw linksError;
      for (const item of links || []) {
        (materialLinks[item.entity_id] ??= []).push({ id: item.id, title: item.title, url: item.url });
      }

      // Attachments (social only — ads doesn't have attachments yet)
      if (!isAdsSource) {
        const { data: atts } = await supabase.from('social_attachments').select('*').in('idea_id', ids);
        for (const att of atts || []) {
          (attachments[att.idea_id] ??= []).push({ url: att.url, name: att.name, type: att.type });
        }
      }

      // Comments with user information
      const { data: comms } = await supabase
        .from(isAdsSource ? 'ads_comments' : 'social_comments')
        .select('*')
        .in('idea_id', ids)
        .order('created_at', { ascending: true });
      if (comms?.length) {
        const userIds = [...new Set(comms.map(c => c.user_id).filter(Boolean))];
        const { data: users } = userIds.length
          ? await supabase.from('users').select('id, full_name, avatar_url, email').in('id', userIds)
          : { data: [] as { id: string }[] };
        const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
        for (const comm of comms) {
          (comments[comm.idea_id] ??= []).push({ ...comm, user: comm.user_id ? usersMap[comm.user_id] || null : null });
        }
      }
    }
    publicIdeas.sort((a, b) => String(a.publish_date).localeCompare(String(b.publish_date)));

    // Fechas ecommerce (se ven en ambos calendarios, igual que en el interno)
    let ecommerceDates: unknown[] = [];
    {
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
      material_links_by_idea: materialLinks,
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
