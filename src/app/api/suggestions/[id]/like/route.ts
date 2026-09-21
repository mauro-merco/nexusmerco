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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const { data: like, error: checkError } = await supabase
      .from('suggestion_likes')
      .select('id')
      .eq('suggestion_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    let liked: boolean;
    if (like) {
      const { error } = await supabase.from('suggestion_likes').delete().eq('id', like.id);
      if (error) throw error;
      liked = false;
    } else {
      const { error } = await supabase.from('suggestion_likes').insert({ suggestion_id: id, user_id: userId });
      if (error) throw error;
      liked = true;
    }

    const { count } = await supabase
      .from('suggestion_likes')
      .select('id', { count: 'exact', head: true })
      .eq('suggestion_id', id);

    return NextResponse.json({ data: { liked, like_count: count || 0 } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}