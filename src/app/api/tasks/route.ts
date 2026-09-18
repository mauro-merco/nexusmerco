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

    let query = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (client_id) query = query.eq('client_id', client_id);
    if (status) query = query.eq('status', status);

    if (assignee_id) {
      const { data: assignedRows } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', assignee_id);
      const taskIds = (assignedRows || []).map(r => r.task_id);
      if (taskIds.length === 0) return NextResponse.json({ data: [] });
      query = query.in('id', taskIds);
    }

    const { data: tasks, error } = await query;
    if (error) throw error;

    const allTasks = tasks || [];
    const taskIds = allTasks.map(t => t.id);

    const [{ data: assigneeRows }, { data: clients }] = await Promise.all([
      taskIds.length > 0
        ? supabase.from('task_assignees').select('task_id, user_id').in('task_id', taskIds)
        : Promise.resolve({ data: [] as { task_id: string; user_id: string }[] }),
      client_id
        ? Promise.resolve({ data: null })
        : supabase.from('clients').select('id, name, logo_url'),
    ]);

    const clientsMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

    const userIds = [...new Set([
      ...(assigneeRows || []).map(r => r.user_id),
      ...allTasks.map(t => t.author_id).filter(Boolean),
    ])];
    interface TaskUser { id: string; full_name: string; avatar_url: string; email: string; role: string }
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] as TaskUser[] };
    const usersMap: Record<string, TaskUser> = Object.fromEntries((users || []).map((u: TaskUser) => [u.id, u]));

    const assigneesByTask: Record<string, TaskUser[]> = {};
    for (const row of assigneeRows || []) {
      if (!assigneesByTask[row.task_id]) assigneesByTask[row.task_id] = [];
      const u = usersMap[row.user_id];
      if (u) assigneesByTask[row.task_id]!.push(u);
    }

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
      assignees: assigneesByTask[t.id] || [],
      author: t.author_id ? usersMap[t.author_id] || null : null,
      client: client_id ? undefined : clientsMap[t.client_id] || null,
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
    const { client_id, title, description, status, assignee_ids, author_id, priority, due_date } = body;

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
        author_id: author_id || null,
        priority: priority || 'medium',
        due_date: due_date || null,
        position: count || 0,
      })
      .select()
      .single();

    if (error) throw error;

    const assigneeIds: string[] = Array.isArray(assignee_ids) ? assignee_ids.filter(Boolean) : [];
    let assignees: { id: string; full_name: string; avatar_url: string; email: string; role: string }[] = [];

    if (assigneeIds.length > 0) {
      await supabase.from('task_assignees').insert(assigneeIds.map(user_id => ({ task_id: data.id, user_id })));

      const { data: assigneeUsers } = await supabase
        .from('users').select('id, full_name, avatar_url, email, role').in('id', assigneeIds);
      assignees = assigneeUsers || [];

      let authorName = 'Alguien';
      if (author_id) {
        const { data: author } = await supabase.from('users').select('full_name, email').eq('id', author_id).single();
        if (author) authorName = author.full_name || author.email || 'Alguien';
      }
      const notifyIds = assigneeIds.filter(id => id !== author_id);
      if (notifyIds.length > 0) {
        await supabase.from('notifications').insert(notifyIds.map(user_id => ({
          user_id,
          type: 'task_assigned',
          title: 'Te asignaron una tarea',
          message: `${authorName} te asignó: ${title}`,
          task_id: data.id,
          link: `/operations?task=${data.id}`,
        })));
      }
    }

    return NextResponse.json({ data: { ...data, assignees } });
  } catch (e) {
    console.error('POST /api/tasks error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
