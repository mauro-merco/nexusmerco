import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enrichIdeasWithAssignees, hasEveryWorkRole, normalizeWorkAssignees, syncIdeaAssignees } from '@/lib/idea-assignees-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const month = searchParams.get('month');

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 });
    }

    let query = supabase
      .from('social_ideas')
      .select('*')
      .eq('client_id', client_id)
      .order('publish_date', { ascending: true });

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      query = query.gte('publish_date', `${month}-01`).lt('publish_date', nextMonth);
    }

    const { data, error } = await query;
    if (error) {
      console.error('GET /api/social-ideas Supabase error:', JSON.stringify(error));
      throw error;
    }

    const enriched = await enrichIdeasWithAssignees(supabase, 'social_idea_assignees', data || []);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/social-ideas error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

async function insertIdea(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('social_ideas')
    .insert(payload)
    .select()
    .single();
  return { data, error };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, title, description, brief, eje_contenido, copy_text, responsable, post_type, status, publish_date, author_id, assignees } = body;

    if (!client_id || !title || !post_type || !publish_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!hasEveryWorkRole(normalizeWorkAssignees(assignees))) {
      return NextResponse.json({ error: 'Responsable, ejecutor y control son obligatorios' }, { status: 400 });
    }

    const fullPayload: Record<string, unknown> = {
      client_id,
      title,
      description: description || '',
      brief: brief || '',
      eje_contenido: eje_contenido || '',
      copy_text: copy_text || '',
      responsable: responsable || 'mau',
      post_type,
      status: status || 'borrador',
      publish_date,
      author_id: author_id || null,
      completed_at: status === 'posteado' ? new Date().toISOString() : null,
    };

    let result = await insertIdea(fullPayload);

    if (result.error && (result.error.code === '42703' || result.error.message?.includes('column'))) {
      const fallbackPayload = { ...fullPayload };
      delete fallbackPayload.brief;
      delete fallbackPayload.eje_contenido;
      delete fallbackPayload.responsable;
      delete fallbackPayload.copy_text;
      delete fallbackPayload.completed_at;
      result = await insertIdea(fallbackPayload);
    }

    if (result.error) {
      console.error('POST /api/social-ideas Supabase error:', JSON.stringify(result.error));
      return NextResponse.json({ error: result.error.message || JSON.stringify(result.error) }, { status: 500 });
    }

    try {
      const { added } = await syncIdeaAssignees(supabase, 'social_idea_assignees', result.data.id, assignees);
      if (added.length > 0) {
        const notifyIds = [...new Set(added.map(a => a.user_id).filter(id => id !== author_id))];
        await supabase.from('notifications').insert(notifyIds.map(user_id => ({
          user_id,
          type: 'calendar_piece_assigned',
          title: 'Te asignaron una pieza de Redes',
          message: `Fuiste asignado en: ${title}`,
          link: `/calendarios?client=${client_id}&type=redes&month=${String(result.data.publish_date).slice(0, 7)}&idea=${result.data.id}`,
        })));
      }
    } catch (assignmentError) {
      await supabase.from('social_ideas').delete().eq('id', result.data.id);
      throw assignmentError;
    }
    const [enriched] = await enrichIdeasWithAssignees(supabase, 'social_idea_assignees', [result.data]);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('POST /api/social-ideas error:', e);
    const msg = e instanceof Error ? e.message : typeof e === 'object' ? JSON.stringify(e) : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
