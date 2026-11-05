import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';
import {
  ensureSalaMembership,
  getSalaAccess,
  getUserMap,
  logSalaParticipation,
  messageExcerpt,
} from '@/lib/salas-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Row = Record<string, any>;

async function enrichMessages(rows: Row[], userId: string): Promise<any[]> {
  const ids = rows.map(r => r.id);
  if (ids.length === 0) return [];

  const [{ data: reactionRows }, { data: readRows }] = await Promise.all([
    supabase
      .from('sala_reactions')
      .select('message_id, user_id, emoji, created_at')
      .in('message_id', ids),
    supabase
      .from('sala_reads')
      .select('message_id, user_id, read_at')
      .in('message_id', ids),
  ]);

  const userIds = [
    ...rows.map(r => r.author_id),
    ...(reactionRows || []).map(r => r.user_id),
    ...(readRows || []).map(r => r.user_id),
  ];
  const userMap = await getUserMap(supabase, userIds);

  const reactionsByMessage = new Map<string, Map<string, { count: number; reacted_by_me: boolean; users: any[] }>>();
  for (const r of reactionRows || []) {
    if (!reactionsByMessage.has(r.message_id)) reactionsByMessage.set(r.message_id, new Map());
    const byEmoji = reactionsByMessage.get(r.message_id)!;
    if (!byEmoji.has(r.emoji)) byEmoji.set(r.emoji, { count: 0, reacted_by_me: false, users: [] });
    const entry = byEmoji.get(r.emoji)!;
    entry.count += 1;
    if (r.user_id === userId) entry.reacted_by_me = true;
    entry.users.push(userMap[r.user_id] || { id: r.user_id, full_name: null, avatar_url: null });
  }

  const readsByMessage = new Map<string, any[]>();
  for (const r of readRows || []) {
    if (!readsByMessage.has(r.message_id)) readsByMessage.set(r.message_id, []);
    readsByMessage.get(r.message_id)!.push(userMap[r.user_id] || { id: r.user_id, full_name: null, avatar_url: null });
  }

  return rows.map(row => {
    const readers = readsByMessage.get(row.id) || [];
    return {
      ...row,
      author: userMap[row.author_id] || null,
      reactions: [...(reactionsByMessage.get(row.id)?.entries() || [])].map(([emoji, info]) => ({
        emoji,
        count: info.count,
        reacted_by_me: info.reacted_by_me,
        users: info.users,
      })),
      readers,
      read_count: readers.length,
      read_by_me: readers.some(r => r.id === userId),
      replies: [],
    };
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const { data: topRows, error } = await supabase
      .from('sala_messages')
      .select('*')
      .eq('sala_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .limit(150);
    if (error) throw error;

    const top = (topRows || []).slice().reverse();
    const topIds = top.map(m => m.id);
    const { data: replyRows } = topIds.length
      ? await supabase
          .from('sala_messages')
          .select('*')
          .in('parent_id', topIds)
          .order('created_at', { ascending: true })
      : { data: [] };

    const enriched = await enrichMessages([...top, ...(replyRows || [])], user.id);
    const byId = new Map(enriched.map(m => [m.id, m]));
    const messages = top
      .map(m => byId.get(m.id)!)
      .filter(Boolean)
      .map(m => ({
        ...m,
        replies: (replyRows || [])
          .filter(r => r.parent_id === m.id)
          .map(r => byId.get(r.id)!)
          .filter(Boolean),
      }));

    // Opening the room clears the unread badge (view logging is explicit via the eye button).
    if (access.isMember) {
      await supabase
        .from('sala_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('sala_id', id)
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      data: {
        sala: { ...access.sala, joined: access.isMember, my_role: access.role },
        messages,
        can_post: access.canPost,
        can_moderate: access.canModerate,
      },
    });
  } catch (e) {
    console.error('GET /api/salas/[id]/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;

    const access = await getSalaAccess(supabase, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (!access.canRead) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

    const body = await request.json();
    const content = String(body.content || '').trim();
    const parentId = body.parent_id ? String(body.parent_id) : null;
    if (!content) return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ error: 'El mensaje es demasiado largo' }, { status: 400 });

    if (!parentId && !access.canPost) {
      return NextResponse.json(
        { error: 'Este boletín solo lo publica el equipo. Podés responder o reaccionar.' },
        { status: 403 }
      );
    }

    if (parentId) {
      const { data: parent } = await supabase
        .from('sala_messages')
        .select('id, sala_id')
        .eq('id', parentId)
        .maybeSingle();
      if (!parent || parent.sala_id !== id) {
        return NextResponse.json({ error: 'El mensaje al que respondés no existe' }, { status: 400 });
      }
    }

    await ensureSalaMembership(supabase, id, user.id, true, access.sala.name);

    const { data: message, error } = await supabase
      .from('sala_messages')
      .insert({ sala_id: id, author_id: user.id, content, parent_id: parentId })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('salas').update({ updated_at: new Date().toISOString() }).eq('id', id);

    const action = parentId
      ? 'reply_sent'
      : access.sala.kind === 'boletin'
        ? 'bulletin_published'
        : 'message_sent';

    await logSalaParticipation(supabase, {
      salaId: id,
      salaName: access.sala.name,
      messageId: message.id,
      userId: user.id,
      action,
      detail: messageExcerpt(content),
    });

    // Boletines are announcements: notify the whole team (or the private room members).
    if (action === 'bulletin_published') {
      try {
        const [{ data: sender }, { data: members }, { data: everyone }] = await Promise.all([
          supabase.from('users').select('full_name, email').eq('id', user.id).maybeSingle(),
          supabase.from('sala_members').select('user_id').eq('sala_id', id),
          access.sala.visibility === 'publica'
            ? supabase.from('users').select('id').eq('app_id', 'nexus')
            : Promise.resolve({ data: [] as { id: string }[] }),
        ]);
        const recipientIds = new Set<string>();
        for (const m of members || []) recipientIds.add(m.user_id);
        for (const u of everyone || []) recipientIds.add(u.id);
        recipientIds.delete(user.id);
        const senderName = sender?.full_name || sender?.email || 'El equipo';
        if (recipientIds.size > 0) {
          await supabase.from('notifications').insert(
            [...recipientIds].map(recipientId => ({
              user_id: recipientId,
              type: 'sala',
              title: `Nuevo boletín en ${access.sala.name}`,
              message: `${senderName}: ${messageExcerpt(content, 100)}`,
              link: `/salas?sala=${id}`,
            }))
          );
        }
      } catch (notifyError) {
        console.error('sala notification error:', notifyError);
      }
    }

    const [enriched] = await enrichMessages([message], user.id);
    return NextResponse.json({ data: { ...enriched, replies: [] } }, { status: 201 });
  } catch (e) {
    console.error('POST /api/salas/[id]/messages error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
