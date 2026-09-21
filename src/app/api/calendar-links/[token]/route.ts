import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enrichIdeasWithAssignees } from '@/lib/idea-assignees-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const url = new URL(request.url);
    const month = url.searchParams.get('month');
    const type = url.searchParams.get('type') || 'social'; // 'social' | 'ads'

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const supabase = getAdmin();

    // Look up client by share_token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, logo_url, share_token, social_calendar_enabled, ads_calendar_enabled')
      .eq('share_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    // Validate the requested calendar type is enabled
    if (type === 'ads' && !client.ads_calendar_enabled) {
      return NextResponse.json({ error: 'Calendario ADS no disponible para este cliente' }, { status: 404 });
    }
    if (type === 'social' && !client.social_calendar_enabled) {
      return NextResponse.json({ error: 'Calendario de redes no disponible para este cliente' }, { status: 404 });
    }

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

    // Fetch comments
    let comments: Record<string, unknown[]> = {};
    if (ideas && ideas.length > 0) {
      const commentTable = type === 'ads' ? 'ads_comments' : 'social_comments';
      const { data: comms } = await supabase
        .from(commentTable)
        .select('*')
        .in('idea_id', ideas.map((i) => i.id))
        .order('created_at', { ascending: true });

      if (comms) {
        for (const comm of comms) {
          if (!comments[comm.idea_id]) comments[comm.idea_id] = [];
          comments[comm.idea_id].push(comm);
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

    return NextResponse.json({
      client: { id: client.id, name: client.name, logo_url: client.logo_url },
      ideas: publicIdeas,
      attachments_by_idea: attachments,
      comments_by_idea: comments,
      ecommerce_dates: ecommerceDates,
      calendar_type: type,
    });
  } catch (e) {
    console.error('GET /api/calendar-links/[token] error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
