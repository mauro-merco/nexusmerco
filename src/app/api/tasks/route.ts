import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const status = searchParams.get('status');
    const assignee_id = searchParams.get('assignee_id');

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 });
    }

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('client_id', client_id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (status) query = query.eq('status', status);
    if (assignee_id) query = query.eq('assignee_id', assignee_id);

    const { data: tasks, error } = await query;
    if (error) throw error;

    const allTasks = tasks || [];

    const userIds = [...new Set(allTasks.flatMap(t => [t.assignee_id, t.author_id].filter(Boolean)))];
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const taskIds = allTasks.map(t => t.id);
    const [{ data: comments }, { data: attachments }] = await Promise.all([
      taskIds.length > 0
        ? supabase.from('task_comments').select('id, task_id').in('task_id', taskIds)
        : { data: [] },
      taskIds.length > 0
        ? supabase.from('task_attachments').select('id, task_id').in('task_id', taskIds)
        : { data: [] },
    ]);

    const commentCounts: Record<string, number> = {};
    const attachCounts: Record<string, number> = {};
    for (const c of comments || []) commentCounts[c.task_id] = (commentCounts[c.task_id] || 0) + 1;
    for (const a of attachments || []) attachCounts[a.task_id] = (attachCounts[a.task_id] || 0) + 1;

    const enriched = allTasks.map(t => ({
      ...t,
      assignee: t.assignee_id ? usersMap[t.assignee_id] || null : null,
      author: t.author_id ? usersMap[t.author_id] || null : null,
      comment_count: commentCounts[t.id] || 0,
      attachment_count: attachCounts[t.id] || 0,
    }));

    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/tasks error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, title, description, status, assignee_id, author_id, priority, due_date } = body;

    if (!client_id || !title) {
      return NextResponse.json({ error: 'client_id and title required' }, { status: 400 });
    }

    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client_id);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        client_id,
        title,
        description: description || '',
        status: status || 'en_espera',
        assignee_id: assignee_id || null,
        author_id: author_id || null,
        priority: priority || 'medium',
        due_date: due_date || null,
        position: count || 0,
      })
      .select()
      .single();

    if (error) throw error;

    if (assignee_id && assignee_id !== author_id) {
      let authorName = 'Alguien';
      if (author_id) {
        const { data: author } = await supabase.from('users').select('full_name, email').eq('id', author_id).single();
        if (author) authorName = author.full_name || author.email || 'Alguien';
      }
      await supabase.from('notifications').insert({
        user_id: assignee_id,
        type: 'task_assigned',
        title: 'Te asignaron una tarea',
        message: `${authorName} te asignó: ${title}`,
        task_id: data.id,
        link: '/operations',
      });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error('POST /api/tasks error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
