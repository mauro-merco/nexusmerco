import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: task, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) throw error;

    const userIds = [task.assignee_id, task.author_id].filter(Boolean);
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const { data: client } = await supabase.from('clients').select('id, name, logo_url').eq('id', task.client_id).single();
    const [{ count: comment_count }, { count: attachment_count }] = await Promise.all([
      supabase.from('task_comments').select('id', { count: 'exact', head: true }).eq('task_id', id),
      supabase.from('task_attachments').select('id', { count: 'exact', head: true }).eq('task_id', id),
    ]);

    return NextResponse.json({
      data: {
        ...task,
        assignee: task.assignee_id ? usersMap[task.assignee_id] || null : null,
        author: task.author_id ? usersMap[task.author_id] || null : null,
        client: client || null,
        comment_count: comment_count || 0,
        attachment_count: attachment_count || 0,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const key of ['title', 'description', 'status', 'assignee_id', 'author_id', 'priority', 'due_date', 'position']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { data: oldTask } = await supabase.from('tasks').select('assignee_id, title').eq('id', id).single();

    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;

    if (body.assignee_id && oldTask && body.assignee_id !== oldTask.assignee_id) {
      const { data: assignee } = await supabase.from('users').select('full_name').eq('id', body.assignee_id).single();
      await supabase.from('notifications').insert({
        user_id: body.assignee_id,
        type: 'task_assigned',
        title: 'Te asignaron una tarea',
        message: `${assignee?.full_name || 'Alguien'} te asignó: ${data.title}`,
        task_id: id,
      });
    }

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
