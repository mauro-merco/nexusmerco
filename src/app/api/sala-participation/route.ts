import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUserId } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = await getRequestUserId(request);
    const targetId = searchParams.get('user_id') || requesterId;
    if (!targetId) return NextResponse.json({ error: 'Falta user_id' }, { status: 400 });

    const { data: target } = await supabase
      .from('users')
      .select('id, full_name, avatar_url, email, role, is_public')
      .eq('id', targetId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (requesterId !== targetId && target.is_public === false) {
      return NextResponse.json({ error: 'Perfil no disponible' }, { status: 404 });
    }

    const days = Number(searchParams.get('days') || 0);
    const salaId = searchParams.get('sala_id');
    let query = supabase
      .from('sala_participation')
      .select('*')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false })
      .limit(3000);
    if (salaId) query = query.eq('sala_id', salaId);
    if (days > 0) {
      query = query.gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());
    }
    const { data: rows, error } = await query;
    if (error) throw error;

    const list = rows || [];
    const stats = {
      messages: 0,
      replies: 0,
      bulletins: 0,
      reactions: 0,
      views: 0,
      rooms: 0,
      total: list.length,
    };

    const roomsMap = new Map<string, {
      sala_id: string | null;
      sala_name: string;
      total: number;
      messages: number;
      replies: number;
      bulletins: number;
      reactions: number;
      views: number;
      last_at: string;
    }>();
    const salaIds = new Set<string>();

    for (const row of list) {
      const key = row.sala_id || `name:${row.sala_name || 'Sala eliminada'}`;
      if (!roomsMap.has(key)) {
        roomsMap.set(key, {
          sala_id: row.sala_id,
          sala_name: row.sala_name || 'Sala',
          total: 0,
          messages: 0,
          replies: 0,
          bulletins: 0,
          reactions: 0,
          views: 0,
          last_at: row.created_at,
        });
      }
      const room = roomsMap.get(key)!;
      room.total += 1;
      if (new Date(row.created_at) > new Date(room.last_at)) room.last_at = row.created_at;
      if (row.sala_id) salaIds.add(row.sala_id);

      switch (row.action) {
        case 'message_sent':
          stats.messages += 1;
          room.messages += 1;
          break;
        case 'reply_sent':
          stats.replies += 1;
          room.replies += 1;
          break;
        case 'bulletin_published':
          stats.bulletins += 1;
          room.bulletins += 1;
          break;
        case 'reaction_added':
          stats.reactions += 1;
          room.reactions += 1;
          break;
        case 'message_viewed':
          stats.views += 1;
          room.views += 1;
          break;
        default:
          break;
      }
    }

    stats.rooms = salaIds.size;

    const rooms = [...roomsMap.values()]
      .sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime())
      .slice(0, 30);

    return NextResponse.json({
      data: {
        user: {
          id: target.id,
          full_name: target.full_name,
          avatar_url: target.avatar_url,
          email: target.email,
          role: target.role,
        },
        stats,
        rooms,
        events: list.slice(0, 150),
      },
    });
  } catch (e) {
    console.error('GET /api/sala-participation error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
