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
    .select('id, email, full_name, avatar_url, role, is_public')
    .in('id', uniq);
  return Object.fromEntries((data || []).map(u => [u.id, u]));
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get('with');

    // --- Direct messages ---
    let dmQuery = supabase
      .from('messages')
      .select('*')
      .is('group_id', null)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (withUserId) {
      dmQuery = dmQuery.or(`and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`);
    }

    const { data: dmMessages, error } = await dmQuery;
    if (error) throw error;

    // --- Groups I belong to ---
    const { data: memberships } = await supabase
      .from('message_group_members')
      .select('group_id, last_read_at')
      .eq('user_id', user.id);
    const lastReadByGroup = new Map<string, string>((memberships || []).map(m => [m.group_id, m.last_read_at]));
    const groupIds = [...lastReadByGroup.keys()];

    let groups: any[] = [];
    let groupMessages: any[] = [];
    let groupMembers: any[] = [];
    if (groupIds.length) {
      const { data: g } = await supabase.from('message_groups').select('*').in('id', groupIds);
      groups = g || [];
      const { data: gm } = await supabase
        .from('messages')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(400);
      groupMessages = gm || [];
      const { data: gmem } = await supabase
        .from('message_group_members')
        .select('group_id, user_id, last_read_at')
        .in('group_id', groupIds);
      groupMembers = gmem || [];
    }

    const ids = [
      ...(dmMessages || []).flatMap(m => [m.sender_id, m.recipient_id]),
      ...(groupMessages || []).map(m => m.sender_id),
      ...groupMembers.map(m => m.user_id),
    ];
    const userMap = await getUserMap(ids);

    const conversations: any[] = [];

    // Build DM conversations grouped by the "other" party.
    const convMap = new Map<string, any>();
    for (const m of dmMessages || []) {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          kind: 'dm',
          key: `dm:${otherId}`,
          user: userMap[otherId] || null,
          messages: [],
          last_message: m,
          unread: m.recipient_id === user.id && !m.read ? 1 : 0,
        });
      } else {
        const c = convMap.get(otherId);
        if (m.recipient_id === user.id && !m.read) c.unread++;
        if (new Date(m.created_at) > new Date(c.last_message.created_at)) c.last_message = m;
      }
      convMap.get(otherId).messages.push({ ...m, sender: userMap[m.sender_id] || null, recipient: userMap[m.recipient_id] || null });
    }
    for (const c of convMap.values()) {
      c.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      conversations.push(c);
    }

    // Build group conversations.
    for (const g of groups) {
      const msgs = groupMessages.filter(m => m.group_id === g.id);
      if (msgs.length === 0) continue;
      const lastRead = lastReadByGroup.get(g.id) || '';
      const members = groupMembers
        .filter(m => m.group_id === g.id)
        .map(m => ({ user_id: m.user_id, last_read_at: m.last_read_at, user: userMap[m.user_id] || null }));
      const unread = msgs.filter(m => m.sender_id !== user.id && new Date(m.created_at) > new Date(lastRead)).length;
      const enriched = msgs
        .map(m => ({ ...m, sender: userMap[m.sender_id] || null }))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      conversations.push({
        kind: 'group',
        key: `group:${g.id}`,
        group: { ...g, members },
        messages: enriched,
        last_message: msgs[0],
        unread,
      });
    }

    conversations.sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());

    return NextResponse.json({ data: conversations });
  } catch (e) {
    console.error('GET /api/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const content = String(body.content || '').trim();
    const groupId = body.group_id ? String(body.group_id) : null;
    const recipientId = body.recipient_id ? String(body.recipient_id) : null;
    if (!content) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    if (!groupId && !recipientId) return NextResponse.json({ error: 'Falta destinatario' }, { status: 400 });

    const { data: sender } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
    const senderName = sender?.full_name || sender?.email || 'Alguien';

    if (groupId) {
      const { data: membership } = await supabase
        .from('message_group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, group_id: groupId, content })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('message_groups').update({ updated_at: new Date().toISOString() }).eq('id', groupId);

      const { data: members } = await supabase
        .from('message_group_members')
        .select('user_id')
        .eq('group_id', groupId);
      const { data: group } = await supabase.from('message_groups').select('name').eq('id', groupId).maybeSingle();
      const recipients = (members || []).filter(m => m.user_id !== user.id);
      if (recipients.length) {
        await supabase.from('notifications').insert(
          recipients.map(m => ({
            user_id: m.user_id,
            type: 'message',
            title: 'Nuevo mensaje de grupo',
            message: `${senderName} en ${group?.name || 'un grupo'}: ${content.slice(0, 80)}${content.length > 80 ? '...' : ''}`,
            link: `/messages?group=${groupId}`,
          }))
        );
      }
      return NextResponse.json({ data }, { status: 201 });
    }

    if (recipientId === user.id) {
      return NextResponse.json({ error: 'No podés enviarte mensajes a vos mismo' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: recipientId, content })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: recipientId,
      type: 'message',
      title: 'Nuevo mensaje',
      message: `${senderName}: ${content.slice(0, 80)}${content.length > 80 ? '...' : ''}`,
      // The conversation travels in the link so the bell can open the right
      // thread and so reading it can clear exactly that notification.
      link: `/messages?to=${user.id}`,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error('POST /api/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

/**
 * Clears the bell notification that belongs to a message thread, so reading the
 * conversation also removes its entry from the notification list. Without this
 * the badge kept counting messages the user had already opened.
 *
 * `from` is the id of the other participant (DM) or `group` the group id: it
 * clears the notifications of that conversation only. For groups it also bumps
 * the member's last_read_at so unread counts reset.
 */
export async function PUT(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const from = typeof body.from === 'string' && body.from ? body.from : null;
    const group = typeof body.group === 'string' && body.group ? body.group : null;

    if (group) {
      await supabase
        .from('message_group_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('group_id', group)
        .eq('user_id', user.id);
    }

    const query = supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('type', 'message')
      .eq('read', false)
      .is('deleted_at', null);

    const { error } = group
      ? await query.eq('link', `/messages?group=${group}`)
      : from
        ? await query.eq('link', `/messages?to=${from}`)
        : await query.eq('link', '/messages');
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
