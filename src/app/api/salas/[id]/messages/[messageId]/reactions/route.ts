import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';
import { getSalaAccess, logSalaParticipation, messageExcerpt } from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id, messageId } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const { data: message } = await supabase
      .from('sala_messages')
      .select('id, sala_id, content')
      .eq('id', messageId)
      .eq('sala_id', id)
      .maybeSingle();
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    const body = await request.json();
    const emoji = String(body.emoji || '').trim();
    if (!emoji || emoji.length > 8) return NextResponse.json({ error: 'Reacción inválida' }, { status: 400 });

    const { data: existing } = await supabase
      .from('sala_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from('sala_reactions').delete().eq('id', existing.id);
      if (error) throw error;
      await logSalaParticipation(supabase, {
        salaId: id,
        salaName: access.sala.name,
        messageId,
        userId: user.id,
        action: 'reaction_removed',
        emoji,
        detail: messageExcerpt(message.content, 90),
      });
      return NextResponse.json({ data: { active: false } });
    }

    const { error } = await supabase
      .from('sala_reactions')
      .insert({ message_id: messageId, user_id: user.id, emoji });
    if (error) throw error;

    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: access.sala.name,
      messageId,
      userId: user.id,
      action: 'reaction_added',
      emoji,
      detail: messageExcerpt(message.content, 90),
    });

    return NextResponse.json({ data: { active: true } });
  } catch (e) {
    console.error('POST /api/salas/[id]/messages/[messageId]/reactions error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
