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

    const { data: inserted, error } = await supabase
      .from('sala_reads')
      .upsert(
        { message_id: messageId, user_id: user.id, read_at: new Date().toISOString() },
        { onConflict: 'message_id,user_id', ignoreDuplicates: true }
      )
      .select('id');
    if (error) throw error;

    if (inserted && inserted.length > 0) {
      await logSalaParticipation(supabase, {
        salaId: id,
        salaName: access.sala.name,
        messageId,
        userId: user.id,
        action: 'message_viewed',
        detail: messageExcerpt(message.content, 90),
      });
    }

    const { count } = await supabase
      .from('sala_reads')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', messageId);

    return NextResponse.json({ data: { read: true, already: !inserted?.length, count: count || 0 } });
  } catch (e) {
    console.error('POST /api/salas/[id]/messages/[messageId]/read error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
