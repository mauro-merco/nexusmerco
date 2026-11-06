import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, isStaff } from '@/lib/api-security';
import { getUserMap, logSalaParticipation } from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: memberships } = await supabase
      .from('sala_members')
      .select('sala_id, role, last_read_at')
      .eq('user_id', user.id);
    const myMembership = new Map<string, { role: string; last_read_at: string }>(
      (memberships || []).map(m => [m.sala_id, { role: m.role, last_read_at: m.last_read_at }])
    );

    const { data: rooms, error } = await supabase
      .from('salas')
      .select('*')
      .eq('archived', false)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;

    const staff = isStaff(user);
    const visible = (rooms || []).filter(r =>
      staff || r.visibility === 'publica' || myMembership.has(r.id)
    );
    const ids = visible.map(r => r.id);

    if (ids.length === 0) return NextResponse.json({ data: [] });

    const [{ data: memberRows }, { data: allMessages }] = await Promise.all([
      supabase
        .from('sala_members')
        .select('sala_id, user_id, role, last_read_at')
        .in('sala_id', ids),
      supabase
        .from('sala_messages')
        .select('id, sala_id, author_id, content, parent_id, created_at')
        .in('sala_id', ids)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

    const membersByRoom = new Map<string, any[]>();
    for (const m of memberRows || []) {
      if (!membersByRoom.has(m.sala_id)) membersByRoom.set(m.sala_id, []);
      membersByRoom.get(m.sala_id)!.push(m);
    }

    const messageCounts = new Map<string, number>();
    const lastByRoom = new Map<string, any>();
    for (const m of allMessages || []) {
      messageCounts.set(m.sala_id, (messageCounts.get(m.sala_id) || 0) + 1);
      if (!lastByRoom.has(m.sala_id)) lastByRoom.set(m.sala_id, m);
    }

    // Unread counts: messages newer than my last_read_at, not authored by me.
    const unreadByRoom = new Map<string, number>();
    await Promise.all(visible.map(async (room) => {
      const mine = myMembership.get(room.id);
      if (!mine) return;
      const { count } = await supabase
        .from('sala_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sala_id', room.id)
        .neq('author_id', user.id)
        .gt('created_at', mine.last_read_at);
      unreadByRoom.set(room.id, count || 0);
    }));

    const lastAuthorIds = [...lastByRoom.values()].map(m => m.author_id);
    const memberUserIds = (memberRows || []).map(m => m.user_id);
    const userMap = await getUserMap(supabase, [...lastAuthorIds, ...memberUserIds]);

    const data = visible.map(room => ({
      ...room,
      joined: myMembership.has(room.id),
      my_role: myMembership.get(room.id)?.role || null,
      member_count: (membersByRoom.get(room.id) || []).length,
      members: (membersByRoom.get(room.id) || []).map(m => ({ ...m, user: userMap[m.user_id] || null })),
      message_count: messageCounts.get(room.id) || 0,
      unread: unreadByRoom.get(room.id) || 0,
      last_message: lastByRoom.has(room.id)
        ? {
            id: lastByRoom.get(room.id).id,
            content: lastByRoom.get(room.id).content,
            created_at: lastByRoom.get(room.id).created_at,
            author: userMap[lastByRoom.get(room.id).author_id] || null,
          }
        : null,
    }));

    return NextResponse.json({ data });
  } catch (e) {
    console.error('GET /api/salas error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Solo el equipo puede crear salas' }, { status: 403 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'El nombre de la sala es obligatorio' }, { status: 400 });

    const kind = body.kind === 'boletin' ? 'boletin' : 'chat';
    const visibility = body.visibility === 'privada' ? 'privada' : 'publica';
    const emoji = String(body.emoji || (kind === 'boletin' ? '📣' : '💬')).slice(0, 8);
    const color = String(body.color || (kind === 'boletin' ? 'amber' : 'cyan')).slice(0, 20);
    const description = String(body.description || '').trim();

    const rawMemberIds: unknown[] = Array.isArray(body.member_ids) ? body.member_ids : [];
    const memberIds: string[] = Array.from(new Set(rawMemberIds.map(id => String(id)).filter(Boolean)))
      .filter(id => id !== user.id);
    if (visibility === 'privada' && memberIds.length) {
      const { data: eligible, error: eligibleError } = await supabase.from('users').select('id')
        .eq('app_id', 'nexus').in('role', ['admin', 'operador']).in('id', memberIds);
      if (eligibleError) throw eligibleError;
      if (eligible?.length !== memberIds.length) return NextResponse.json({ error: 'Solo podés invitar integrantes del equipo' }, { status: 400 });
    }

    const { data: room, error } = await supabase
      .from('salas')
      .insert({ name, description, kind, visibility, emoji, color, created_by: user.id })
      .select()
      .single();
    if (error) throw error;

    const rows = [
      { sala_id: room.id, user_id: user.id, role: 'owner' },
      ...(visibility === 'privada' ? memberIds.map(id => ({ sala_id: room.id, user_id: id, role: 'member' })) : []),
    ];
    const { error: memberError } = await supabase.from('sala_members').insert(rows);
    if (memberError) throw memberError;

    await logSalaParticipation(supabase, {
      salaId: room.id,
      salaName: room.name,
      userId: user.id,
      action: 'room_created',
      detail: `Creó la ${kind === 'boletin' ? 'boletín' : 'sala'} «${name}»`,
    });

    return NextResponse.json({ data: { ...room, joined: true, my_role: 'owner', member_count: rows.length } }, { status: 201 });
  } catch (e) {
    console.error('POST /api/salas error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
