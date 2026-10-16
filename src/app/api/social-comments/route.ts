import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createMentionNotifications } from '@/lib/mentions';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

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
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');
    if (!idea_id) return NextResponse.json({ error: 'idea_id required' }, { status: 400 });

    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
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

/**
 * Deep link to the calendar showing the idea. /calendarios reads
 * client, type, month and idea from the query string, so the notification
 * lands on the idea itself instead of on the month grid.
 */
async function buildIdeaLink(ideaId: string) {
  const { data: social } = await supabase
    .from('social_ideas')
    .select('client_id, publish_date')
    .eq('id', ideaId)
    .maybeSingle();
  if (social) {
    return `/calendarios?client=${social.client_id}&type=redes&month=${social.publish_date.slice(0, 7)}&idea=${ideaId}`;
  }

  const { data: ads } = await supabase
    .from('ads_ideas')
    .select('client_id, publish_date')
    .eq('id', ideaId)
    .maybeSingle();
  if (ads) {
    return `/calendarios?client=${ads.client_id}&type=ads&month=${ads.publish_date.slice(0, 7)}&idea=${ideaId}`;
  }

  return '/calendarios';
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const { idea_id, content, parent_id } = body;
    if (!idea_id || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('social_comments')
        .select('idea_id')
        .eq('id', parent_id)
        .single();
      if (parentError) throw parentError;
      if (parent.idea_id !== idea_id) {
        return NextResponse.json({ error: 'El comentario padre no pertenece a la idea' }, { status: 400 });
      }
    }

    const payload: Record<string, unknown> = { idea_id, user_id: user.id, content };
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
      user.id,
      { link: await buildIdeaLink(idea_id), entityLabel: 'un comentario de una idea' }
    );

    const usersMap = await fetchUsers([user.id]);
    return NextResponse.json({ data: { ...data, user: usersMap[user.id] || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
