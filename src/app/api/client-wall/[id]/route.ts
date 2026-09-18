import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const { data: message } = await supabase.from('client_wall_messages').select('user_id').eq('id', id).single();
    if (!message) return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });

    const { data: caller } = await supabase.from('users').select('role').eq('id', userId).single();
    const isOwner = message.user_id === userId;
    const isAdmin = caller?.role === 'admin';
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Sin permiso para eliminar' }, { status: 403 });

    const { error } = await supabase.from('client_wall_messages').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
