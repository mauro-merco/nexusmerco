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
    const body = await request.json();
    const { content } = body;
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'content required' }, { status: 400 });
    }
    const normalizedContent = content.trim();
    if (normalizedContent.length > 5000) {
      return NextResponse.json({ error: 'content too long' }, { status: 400 });
    }

    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('task_id, user_id')
      .eq('id', id)
      .single();
    if (commentError) throw commentError;
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('client_id')
      .eq('id', comment.task_id)
      .single();
    if (taskError) throw taskError;
    if (!canAccessClient(user, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (comment.user_id !== user.id && !isStaff(user)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_comments')
      .update({ content: normalizedContent })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const { data: commentAuthor } = data.user_id
      ? await supabase.from('users').select('id, full_name, avatar_url').eq('id', data.user_id).single()
      : { data: null };

    return NextResponse.json({ data: { ...data, user: commentAuthor || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const { data: comment, error: commentError } = await supabase
      .from('task_comments')
      .select('task_id, user_id')
      .eq('id', id)
      .single();
    if (commentError) throw commentError;
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('client_id')
      .eq('id', comment.task_id)
      .single();
    if (taskError) throw taskError;
    if (!canAccessClient(user, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (comment.user_id !== user.id && !isStaff(user)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await supabase.from('task_comments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
