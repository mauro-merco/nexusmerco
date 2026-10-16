import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, isStaff } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const { data: targetComment, error: commentError } = await supabase
      .from('social_comments')
      .select('user_id, idea_id')
      .eq('id', id)
      .single();
    if (commentError) throw commentError;
    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', targetComment.idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id) || (targetComment.user_id !== user.id && !isStaff(user))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const { content } = body;
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const { data, error } = await supabase
      .from('social_comments')
      .update({ content })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const { data: author } = data.user_id
      ? await supabase.from('users').select('id, full_name, avatar_url').eq('id', data.user_id).single()
      : { data: null };

    return NextResponse.json({ data: { ...data, user: author || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const { data: targetComment, error: commentError } = await supabase
      .from('social_comments')
      .select('user_id, idea_id')
      .eq('id', id)
      .single();
    if (commentError) throw commentError;
    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', targetComment.idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id) || (targetComment.user_id !== user.id && !isStaff(user))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { error } = await supabase.from('social_comments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
