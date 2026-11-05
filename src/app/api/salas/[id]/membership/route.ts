import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, isStaff } from '@/lib/api-security';
import { logSalaParticipation } from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const { data: sala } = await supabase.from('salas').select('*').eq('id', id).maybeSingle();
    if (!sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (sala.visibility !== 'publica' && !isStaff(user)) {
      return NextResponse.json({ error: 'Esta sala es privada' }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from('sala_members')
      .select('role')
      .eq('sala_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (existing) return NextResponse.json({ data: { joined: true, role: existing.role } });

    const { error } = await supabase
      .from('sala_members')
      .insert({ sala_id: id, user_id: user.id, role: 'member' });
    if (error) throw error;

    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: sala.name,
      userId: user.id,
      action: 'joined',
      detail: `Se unió a «${sala.name}»`,
    });

    return NextResponse.json({ data: { joined: true, role: 'member' } }, { status: 201 });
  } catch (e) {
    console.error('POST /api/salas/[id]/membership error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const { data: sala } = await supabase.from('salas').select('id, name').eq('id', id).maybeSingle();
    if (!sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

    const { error } = await supabase
      .from('sala_members')
      .delete()
      .eq('sala_id', id)
      .eq('user_id', user.id);
    if (error) throw error;

    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: sala.name,
      userId: user.id,
      action: 'left',
      detail: `Salió de «${sala.name}»`,
    });

    return NextResponse.json({ data: { joined: false } });
  } catch (e) {
    console.error('DELETE /api/salas/[id]/membership error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
