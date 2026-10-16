import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserMap(ids: string[]) {
  const uniq = [...new Set(ids.filter(Boolean))];
  if (uniq.length === 0) return {};
  const { data } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, role')
    .in('id', uniq);
  return Object.fromEntries((data || []).map(u => [u.id, u]));
}

async function isMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('message_group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    if (!(await isMember(id, user.id))) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const { data: group, error } = await supabase.from('message_groups').select('*').eq('id', id).single();
    if (error || !group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 });

    const { data: members } = await supabase
      .from('message_group_members')
      .select('user_id, last_read_at')
      .eq('group_id', id);
    const userMap = await getUserMap((members || []).map(m => m.user_id));

    return NextResponse.json({
      data: { ...group, members: (members || []).map(m => ({ ...m, user: userMap[m.user_id] || null })) },
    });
  } catch (e) {
    console.error('GET /api/message-groups/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    if (!(await isMember(id, user.id))) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();

    if (Array.isArray(body.member_ids)) {
      const memberIds: string[] = Array.from(new Set(body.member_ids.map(String).filter(Boolean)));
      const { data: current } = await supabase.from('message_group_members').select('user_id').eq('group_id', id);
      const currentIds = new Set((current || []).map(m => m.user_id));
      const nextIds = new Set(memberIds);
      const toAdd = memberIds.filter(uid => !currentIds.has(uid));
      const toRemove = [...currentIds].filter(uid => !nextIds.has(uid));
      if (toAdd.length) {
        await supabase.from('message_group_members').insert(toAdd.map(uid => ({ group_id: id, user_id: uid })));
      }
      if (toRemove.length) {
        await supabase.from('message_group_members').delete().eq('group_id', id).in('user_id', toRemove);
      }
    }

    const { data: group, error } = await supabase.from('message_groups').update(updates).eq('id', id).select().single();
    if (error) throw error;

    const { data: members } = await supabase
      .from('message_group_members')
      .select('user_id, last_read_at')
      .eq('group_id', id);
    const userMap = await getUserMap((members || []).map(m => m.user_id));

    return NextResponse.json({
      data: { ...group, members: (members || []).map(m => ({ ...m, user: userMap[m.user_id] || null })) },
    });
  } catch (e) {
    console.error('PUT /api/message-groups/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    if (!(await isMember(id, user.id))) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    // Any member can leave; the creator deletes the whole group.
    const { data: group } = await supabase.from('message_groups').select('created_by').eq('id', id).maybeSingle();
    if (group?.created_by === user.id) {
      const { error } = await supabase.from('message_groups').delete().eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('message_group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/message-groups/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
