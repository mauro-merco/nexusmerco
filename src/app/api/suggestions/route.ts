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

async function getUserRole(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role || null;
}

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');

    let query = supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (typeParam === 'suggestion' || typeParam === 'bug') query = query.eq('type', typeParam);
    if (statusParam) query = query.eq('status', statusParam);

    const { data: rows, error } = await query;
    if (error) throw error;

    const ids = (rows || []).map(r => r.id);

    const authorIds = [...new Set((rows || []).map(r => r.author_id).filter(Boolean))];
    const [{ data: authors }, { data: commentRows }, { data: likeRows }] = await Promise.all([
      authorIds.length > 0
        ? supabase.from('users').select('id, email, full_name, avatar_url, role').in('id', authorIds)
        : Promise.resolve({ data: [] as { id: string; email: string; full_name: string; avatar_url: string; role: string }[] }),
      ids.length > 0
        ? supabase.from('suggestion_comments').select('suggestion_id').in('suggestion_id', ids)
        : Promise.resolve({ data: [] as { suggestion_id: string }[] }),
      ids.length > 0
        ? supabase.from('suggestion_likes').select('suggestion_id, user_id').in('suggestion_id', ids)
        : Promise.resolve({ data: [] as { suggestion_id: string; user_id: string }[] }),
    ]);

    const authorMap = Object.fromEntries((authors || []).map(u => [u.id, u]));
    const commentCount = new Map<string, number>();
    for (const c of commentRows || []) commentCount.set(c.suggestion_id, (commentCount.get(c.suggestion_id) || 0) + 1);
    const likeCount = new Map<string, number>();
    for (const l of likeRows || []) likeCount.set(l.suggestion_id, (likeCount.get(l.suggestion_id) || 0) + 1);
    const likedByMe = new Set((likeRows || []).filter(l => l.user_id === userId).map(l => l.suggestion_id));

    const data = (rows || []).map(s => ({
      ...s,
      author: authorMap[s.author_id] || null,
      comment_count: commentCount.get(s.id) || 0,
      like_count: likeCount.get(s.id) || 0,
      liked_by_me: likedByMe.has(s.id),
    }));

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, content } = body as { type?: string; title?: string; content?: string };

    if (type !== 'suggestion' && type !== 'bug') {
      return NextResponse.json({ error: 'Tipo inválido: debe ser suggestion o bug' }, { status: 400 });
    }
    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: 'Título y descripción son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('suggestions')
      .insert({ author_id: userId, type, title: title.trim(), content: content.trim() })
      .select()
      .single();
    if (error) throw error;

    const { data: author } = await supabase.from('users').select('id, email, full_name, avatar_url, role').eq('id', userId).single();

    return NextResponse.json({
      data: {
        ...data,
        author: author || null,
        comment_count: 0,
        like_count: 0,
        liked_by_me: false,
      },
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}