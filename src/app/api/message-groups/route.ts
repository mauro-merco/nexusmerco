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

async function hydrateGroup(group: any, userMap: Record<string, any>) {
  const { data: members } = await supabase
    .from('message_group_members')
    .select('user_id, last_read_at')
    .eq('group_id', group.id);
  return {
    ...group,
    members: (members || []).map(m => ({ ...m, user: userMap[m.user_id] || null })),
  };
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: mine } = await supabase
      .from('message_group_members')
      .select('group_id')
      .eq('user_id', user.id);
    const groupIds = (mine || []).map(m => m.group_id);
    if (groupIds.length === 0) return NextResponse.json({ data: [] });

    const { data: groups, error } = await supabase
      .from('message_groups')
      .select('*')
      .in('id', groupIds)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const { data: allMembers } = await supabase
      .from('message_group_members')
      .select('user_id')
      .in('group_id', groupIds);
    const userMap = await getUserMap((allMembers || []).map(m => m.user_id));

    const data = await Promise.all((groups || []).map(g => hydrateGroup(g, userMap)));
    return NextResponse.json({ data });
  } catch (e) {
    console.error('GET /api/message-groups error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const name = String(body.name || '').trim();
    const memberIds: string[] = Array.from(new Set((body.member_ids || []).map(String).filter(Boolean)));
    if (!name) return NextResponse.json({ error: 'El nombre del grupo es obligatorio' }, { status: 400 });
    const others = memberIds.filter(id => id !== user.id);
    if (others.length === 0) return NextResponse.json({ error: 'Elegí al menos una persona' }, { status: 400 });

    const { data: group, error } = await supabase
      .from('message_groups')
      .insert({ name, created_by: user.id })
      .select()
      .single();
    if (error) throw error;

    const rows = [user.id, ...others].map(uid => ({ group_id: group.id, user_id: uid }));
    const { error: memberError } = await supabase.from('message_group_members').insert(rows);
    if (memberError) throw memberError;

    const { data: allMembers } = await supabase
      .from('message_group_members')
      .select('user_id')
      .eq('group_id', group.id);
    const userMap = await getUserMap((allMembers || []).map(m => m.user_id));
    const data = await hydrateGroup(group, userMap);

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error('POST /api/message-groups error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
