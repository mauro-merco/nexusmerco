import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchUsers(ids: string[]) {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('users').select('id, full_name, avatar_url').in('id', ids);
  if (!data) return {};
  return Object.fromEntries(data.map(u => [u.id, u]));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');

    if (!idea_id) {
      return NextResponse.json({ error: 'idea_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('social_comments')
      .select('*')
      .eq('idea_id', idea_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const comments = data || [];
    const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];
    const usersMap = await fetchUsers(userIds);

    const commentsWithUser = comments.map(c => ({
      ...c,
      user: usersMap[c.user_id] || null,
    }));

    return NextResponse.json({ data: commentsWithUser });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea_id, user_id, content } = body;

    if (!idea_id || !user_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('social_comments')
      .insert({ idea_id, user_id, content })
      .select()
      .single();

    if (error) throw error;

    const usersMap = await fetchUsers([user_id]);
    const commentWithUser = { ...data, user: usersMap[user_id] || null };

    return NextResponse.json({ data: commentWithUser });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
