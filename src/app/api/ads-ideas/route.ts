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
      .from('ads_ideas')
      .select('*')
      .eq('client_id', client_id)
      .order('publish_date', { ascending: true });

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      query = query.gte('publish_date', `${month}-01`).lt('publish_date', nextMonth);
    }

    const { data, error } = await query;
    if (error) throw error;
    const enriched = await enrichIdeasWithAssignees(supabase, 'ads_idea_assignees', data || []);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
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

    const { data, error } = await supabase
      .from('ads_ideas')
      .insert({
        client_id, title,
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
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    try {
      const { added } = await syncIdeaAssignees(supabase, 'ads_idea_assignees', data.id, assignees);
      if (added.length > 0) {
        const notifyIds = [...new Set(added.map(a => a.user_id).filter(id => id !== author_id))];
        await supabase.from('notifications').insert(notifyIds.map(user_id => ({
          user_id,
          type: 'calendar_piece_assigned',
          title: 'Te asignaron una pieza ADS',
          message: `Fuiste asignado en: ${title}`,
          link: `/calendarios?client=${client_id}&type=ads&idea=${data.id}`,
        })));
      }
    } catch (assignmentError) {
      await supabase.from('ads_ideas').delete().eq('id', data.id);
      throw assignmentError;
    }
    const [enriched] = await enrichIdeasWithAssignees(supabase, 'ads_idea_assignees', [data]);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
