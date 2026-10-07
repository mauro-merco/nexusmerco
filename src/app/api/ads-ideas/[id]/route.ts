import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { enrichIdeasWithAssignees, hasEveryWorkRole, normalizeWorkAssignees, syncIdeaAssignees } from '@/lib/idea-assignees-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createMaterialBotComment(ideaId: string, note: string, clientId?: string) {
  if (!note.trim()) return;
  const { data: bot } = await supabase.from('users').select('id').eq('email', 'bot@mercodigital.com').maybeSingle();
  const { data: fallback } = bot?.id ? { data: bot } : await supabase.from('users').select('id').in('role', ['admin', 'operador']).limit(1).maybeSingle();
  const user_id = fallback?.id;
  if (!user_id) return;
  const clientName = clientId ? (await supabase.from('clients').select('name').eq('id', clientId).maybeSingle()).data?.name : 'cliente';
  await supabase.from('ads_comments').insert({ idea_id: ideaId, user_id, content: `🤖 MERCO BOT: Para esta idea se necesita "${note.trim()}" de parte del equipo de ${clientName || 'cliente'}.` });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from('ads_ideas').select('*').eq('id', id).single();
    if (error) throw error;
    const [enriched] = await enrichIdeasWithAssignees(supabase, 'ads_idea_assignees', [data]);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (Array.isArray(body.assignees) && !hasEveryWorkRole(normalizeWorkAssignees(body.assignees))) {
      return NextResponse.json({ error: 'Responsable, ejecutor y control son obligatorios' }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fields = ['title', 'description', 'brief', 'eje_contenido', 'copy_text', 'responsable', 'post_type', 'status', 'publish_date', 'needs_client_material', 'client_material_note'];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = body[f];
    }

    if (body.status !== undefined) {
      const { data: previous } = await supabase.from('ads_ideas').select('status').eq('id', id).single();
      if (body.status === 'posteado' && previous?.status !== 'posteado') updates.completed_at = new Date().toISOString();
      if (body.status !== 'posteado' && previous?.status === 'posteado') updates.completed_at = null;
    }

    const { data, error } = await supabase.from('ads_ideas').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (body.needs_client_material === true && body.client_material_note) {
      await createMaterialBotComment(id, body.client_material_note, data.client_id);
    }
    if (Array.isArray(body.assignees)) {
      const { added } = await syncIdeaAssignees(supabase, 'ads_idea_assignees', id, body.assignees);
      if (added.length > 0) {
        const notifyIds = [...new Set(added.map(a => a.user_id))];
        await supabase.from('notifications').insert(notifyIds.map(user_id => ({
          user_id,
          type: 'calendar_piece_assigned',
          title: 'Te asignaron una pieza ADS',
          message: `Fuiste asignado en: ${data.title}`,
          link: `/calendarios?client=${data.client_id}&type=ads&month=${String(data.publish_date).slice(0, 7)}&idea=${id}`,
        })));
      }
    }
    const [enriched] = await enrichIdeasWithAssignees(supabase, 'ads_idea_assignees', [data]);
    return NextResponse.json({ data: enriched });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('ads_ideas').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
