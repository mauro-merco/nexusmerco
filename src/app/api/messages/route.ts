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
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const withUserId = searchParams.get('with'); // optional: filter conversation with a specific user

    let query = supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (withUserId) {
      query = query.or(`and(sender_id.eq.${userId},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${userId})`);
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    const ids = (messages || []).flatMap(m => [m.sender_id, m.recipient_id]);
    const userMap = await getUserMap(ids);

    // Build conversation list grouped by the "other" party
    const convMap = new Map<string, any>();
    for (const m of messages || []) {
      const otherId = m.sender_id === userId ? m.recipient_id : m.sender_id;
      const other = userMap[otherId] || null;
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          user: other,
          messages: [],
          last_message: m,
          unread: m.recipient_id === userId && !m.read ? 1 : 0,
        });
      } else {
        const c = convMap.get(otherId);
        if (m.recipient_id === userId && !m.read) c.unread++;
        if (new Date(m.created_at) > new Date(c.last_message.created_at)) c.last_message = m;
      }
      convMap.get(otherId).messages.push({ ...m, sender: userMap[m.sender_id] || null, recipient: userMap[m.recipient_id] || null });
    }

    const conversations = Array.from(convMap.values()).map(c => ({
      ...c,
      messages: c.messages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));

    return NextResponse.json({ data: conversations });
  } catch (e) {
    console.error('GET /api/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const senderId = getUserId(request);
    if (!senderId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { recipient_id, content } = body;
    if (!recipient_id || !content?.trim()) {
      return NextResponse.json({ error: 'recipient_id y content son requeridos' }, { status: 400 });
    }
    if (recipient_id === senderId) {
      return NextResponse.json({ error: 'No podés enviarte mensajes a vos mismo' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: senderId, recipient_id, content: content.trim() })
      .select()
      .single();
    if (error) throw error;

    // Notify the recipient
    const { data: sender } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', senderId)
      .single();
    const senderName = sender?.full_name || sender?.email || 'Alguien';

    await supabase.from('notifications').insert({
      user_id: recipient_id,
      type: 'message',
      title: 'Nuevo mensaje',
      message: `${senderName}: ${content.trim().slice(0, 80)}${content.trim().length > 80 ? '...' : ''}`,
      link: '/messages',
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error('POST /api/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}