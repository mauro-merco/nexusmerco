import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, isStaff } from '@/lib/api-security';
import { getSalaAccess, getUserMap, logSalaParticipation } from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function hydrateMembers(salaId: string) {
  const { data: members } = await supabase
    .from('sala_members')
    .select('sala_id, user_id, role, last_read_at, created_at')
    .eq('sala_id', salaId)
    .order('created_at', { ascending: true });
  const userMap = await getUserMap(supabase, (members || []).map(m => m.user_id));
  return (members || []).map(m => ({ ...m, user: userMap[m.user_id] || null }));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const members = await hydrateMembers(id);
    return NextResponse.json({
      data: {
        ...access.sala,
        joined: access.isMember,
        my_role: access.role,
        member_count: members.length,
        members,
      },
    });
  } catch (e) {
    console.error('GET /api/salas/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    const canEdit = isStaff(user) || access.sala.created_by === user.id;
    if (!canEdit) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === 'string') updates.description = body.description.trim();
    if (body.kind === 'chat' || body.kind === 'boletin') updates.kind = body.kind;
    if (body.visibility === 'publica' || body.visibility === 'privada') updates.visibility = body.visibility;
    if (typeof body.emoji === 'string' && body.emoji.trim()) updates.emoji = body.emoji.trim().slice(0, 8);
    if (typeof body.color === 'string' && body.color.trim()) updates.color = body.color.trim().slice(0, 20);
    if (typeof body.archived === 'boolean') updates.archived = body.archived;
    if (typeof body.position === 'number') updates.position = body.position;

    if (Array.isArray(body.member_ids)) {
      const nextIds: string[] = Array.from(new Set(body.member_ids.map(String).filter(Boolean)));
      const { data: current } = await supabase.from('sala_members').select('user_id').eq('sala_id', id);
      const currentIds = new Set((current || []).map(m => m.user_id));
      const nextIdSet = new Set(nextIds);
      const toAdd = nextIds.filter(uid => !currentIds.has(uid));
      const toRemove = [...currentIds].filter(uid => !nextIdSet.has(uid) && uid !== access.sala.created_by);
      if (toAdd.length) {
        await supabase.from('sala_members').insert(toAdd.map(uid => ({ sala_id: id, user_id: uid, role: 'member' })));
      }
      if (toRemove.length) {
        await supabase.from('sala_members').delete().eq('sala_id', id).in('user_id', toRemove);
      }
    }

    const { data: room, error } = await supabase.from('salas').update(updates).eq('id', id).select().single();
    if (error) throw error;

    const members = await hydrateMembers(id);
    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: room.name,
      userId: user.id,
      action: 'room_updated',
      detail: `Actualizó la sala «${room.name}»`,
    });

    return NextResponse.json({
      data: {
        ...room,
        joined: members.some(m => m.user_id === user.id),
        my_role: members.find(m => m.user_id === user.id)?.role || null,
        member_count: members.length,
        members,
      },
    });
  } catch (e) {
    console.error('PUT /api/salas/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    const canDelete = isStaff(user) || access.sala.created_by === user.id;
    if (!canDelete) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const { error } = await supabase.from('salas').delete().eq('id', id);
    if (error) throw error;

    await logSalaParticipation(supabase, {
      salaId: null,
      salaName: access.sala.name,
      userId: user.id,
      action: 'room_deleted',
      detail: `Eliminó la sala «${access.sala.name}»`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/salas/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
