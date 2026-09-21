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
    const role_filter = searchParams.get('role');

    let query = supabase
      .from('tasks')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (client_id) query = query.eq('client_id', client_id);
    if (status) query = query.eq('status', status);

    if (assignee_id) {
      let assigneeQuery = supabase.from('task_assignees').select('task_id').eq('user_id', assignee_id);
      if (role_filter) assigneeQuery = assigneeQuery.eq('role', role_filter);
      const { data: assignedRows } = await assigneeQuery;
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
        ? supabase.from('task_assignees').select('task_id, user_id, role').in('task_id', taskIds)
        : Promise.resolve({ data: [] as { task_id: string; user_id: string; role: string }[] }),
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

    const assigneesByTask: Record<string, (TaskUser & { task_role: string })[]> = {};
    for (const row of assigneeRows || []) {
      if (!assigneesByTask[row.task_id]) assigneesByTask[row.task_id] = [];
      const u = usersMap[row.user_id];
      if (u) assigneesByTask[row.task_id]!.push({ ...u, task_role: row.role });
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
    const { client_id, title, description, status, assignee_ids, assignees, author_id, priority, due_date, pieces_stories, pieces_feed, pieces_reels } = body;
    const toCount = (v: unknown) => v === undefined || v === null || v === '' ? null : Number(v);

    if (!client_id || !title) {
      return NextResponse.json({ error: 'client_id and title required' }, { status: 400 });
    }

    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client_id);

    const initialStatus = status || 'en_espera';

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        client_id,
        title,
        description: description || '',
        status: initialStatus,
        author_id: author_id || null,
        priority: priority || 'medium',
        due_date: due_date || null,
        pieces_stories: toCount(pieces_stories),
        pieces_feed: toCount(pieces_feed),
        pieces_reels: toCount(pieces_reels),
        completed_at: initialStatus === 'cerrada' ? new Date().toISOString() : null,
        position: count || 0,
      })
      .select()
      .single();

    if (error) throw error;

    const roleList = ['lead', 'executor', 'reviewer'];
    let assigneeRoles: { user_id: string; role: string }[] = [];
    if (Array.isArray(assignees) && assignees.length > 0) {
      assigneeRoles = assignees
        .filter((a: { id?: string; role?: string }) => a?.id && roleList.includes(a.role || ''))
        .map((a: { id: string; role: string }) => ({ user_id: a.id, role: a.role }));
    } else {
      assigneeRoles = (Array.isArray(assignee_ids) ? assignee_ids.filter(Boolean) : [])
        .map(user_id => ({ user_id, role: 'executor' }));
    }
    if (!roleList.every(role => assigneeRoles.some(assignee => assignee.role === role))) {
      await supabase.from('tasks').delete().eq('id', data.id);
      return NextResponse.json({ error: 'Responsable, ejecutor y control son obligatorios' }, { status: 400 });
    }

    let assigneesOut: { id: string; full_name: string; avatar_url: string; email: string; role: string; task_role: string }[] = [];

    if (assigneeRoles.length > 0) {
      await supabase.from('task_assignees').insert(assigneeRoles.map(a => ({ task_id: data.id, user_id: a.user_id, role: a.role })));

      const { data: assigneeUsers } = await supabase
        .from('users').select('id, full_name, avatar_url, email, role').in('id', assigneeRoles.map(a => a.user_id));
      const usersMap = Object.fromEntries((assigneeUsers || []).map(u => [u.id, u]));
      assigneesOut = assigneeRoles.map(a => ({ ...(usersMap[a.user_id] || {}), task_role: a.role })).filter(a => a.id);

      let authorName = 'Alguien';
      if (author_id) {
        const { data: author } = await supabase.from('users').select('full_name, email').eq('id', author_id).single();
        if (author) authorName = author.full_name || author.email || 'Alguien';
      }
      const notifyIds = assigneeRoles.map(a => a.user_id).filter(id => id !== author_id);
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

    return NextResponse.json({ data: { ...data, assignees: assigneesOut } });
  } catch (e) {
    console.error('POST /api/tasks error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
