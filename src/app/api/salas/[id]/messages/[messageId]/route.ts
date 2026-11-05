import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, isStaff } from '@/lib/api-security';
import { getSalaAccess, logSalaParticipation, messageExcerpt } from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getMessage(salaId: string, messageId: string) {
  const { data } = await supabase
    .from('sala_messages')
    .select('*')
    .eq('id', messageId)
    .eq('sala_id', salaId)
    .maybeSingle();
  return data;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id, messageId } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const message = await getMessage(id, messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    if (message.author_id !== user.id && !isStaff(user)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.content === 'string') {
      const content = body.content.trim();
      if (!content) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
      updates.content = content.slice(0, 4000);
      updates.edited_at = new Date().toISOString();
    }
    if (typeof body.pinned === 'boolean' && isStaff(user)) updates.pinned = body.pinned;
    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });

    const { data, error } = await supabase
      .from('sala_messages')
      .update(updates)
      .eq('id', messageId)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    console.error('PUT /api/salas/[id]/messages/[messageId] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id, messageId } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const message = await getMessage(id, messageId);
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    if (message.author_id !== user.id && !isStaff(user)) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { error } = await supabase.from('sala_messages').delete().eq('id', messageId);
    if (error) throw error;

    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: access.sala.name,
      userId: user.id,
      action: 'message_deleted',
      detail: messageExcerpt(message.content),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/salas/[id]/messages/[messageId] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
