import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createMentionNotifications } from '@/lib/mentions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchUsers(ids: string[]) {
  if (ids.length === 0) return {};
  const { data } = await supabase.from('users').select('id, full_name, avatar_url, email').in('id', ids);
  if (!data) return {};
  return Object.fromEntries(data.map(u => [u.id, u]));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');
    if (!idea_id) return NextResponse.json({ error: 'idea_id required' }, { status: 400 });

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

    const topLevel = commentsWithUser.filter(c => !c.parent_id);
    const replies = commentsWithUser.filter(c => c.parent_id);
    const nested = topLevel.map(c => ({
      ...c,
      replies: replies.filter(r => r.parent_id === c.id),
    }));

    return NextResponse.json({ data: nested });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea_id, user_id, content, parent_id } = body;
    if (!idea_id || !user_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload: Record<string, unknown> = { idea_id, user_id, content };
    if (parent_id) payload.parent_id = parent_id;

    const { data, error } = await supabase
      .from('social_comments')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await createMentionNotifications(
      supabase,
      content,
      user_id,
      { link: '/calendarios', entityLabel: 'un comentario de una idea' }
    );

    const usersMap = await fetchUsers([user_id]);
    return NextResponse.json({ data: { ...data, user: usersMap[user_id] || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
