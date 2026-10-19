import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, isStaff } from '@/lib/api-security';
import { logActivity, type ActivityLogInput } from '@/lib/activity-events';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function logAssigneeChanges(
  events: ActivityLogInput[],
  clientId: string,
  taskId: string,
  title: string,
  actorId: string,
  added: { user_id: string; role: string }[],
  removed: { user_id: string; role: string }[],
) {
  const ids = [...new Set([...added.map((a) => a.user_id), ...removed.map((r) => r.user_id)])];
  if (ids.length === 0) return;
  const { data: people } = await supabase.from('users').select('id, full_name, email').in('id', ids);
  const names: Record<string, string> = {};
  for (const p of people || []) names[p.id] = p.full_name || p.email || '';
  for (const a of added) events.push({ clientId, area: 'task', entityType: 'task', entityId: taskId, entityTitle: title, action: 'assignee_added', detail: names[a.user_id] || '', toValue: a.role, actorId });
  for (const r of removed) events.push({ clientId, area: 'task', entityType: 'task', entityId: taskId, entityTitle: title, action: 'assignee_removed', detail: names[r.user_id] || '', fromValue: r.role, actorId });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data: task, error } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (error) throw error;
    const user = await getRequestUser(request, supabase);
    if (!user || !canAccessClient(user, task.client_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { data: assigneeRows } = await supabase.from('task_assignees').select('user_id, role').eq('task_id', id);
    const assigneeIds = (assigneeRows || []).map(r => r.user_id);

    const userIds = [...new Set([...assigneeIds, task.author_id].filter(Boolean))];
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
        assignees: (assigneeRows || []).map(r => usersMap[r.user_id] && { ...usersMap[r.user_id], task_role: r.role }).filter(Boolean),
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
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { data: targetTask } = await supabase.from('tasks').select('client_id, status, title, needs_client_material').eq('id', id).single();
    if (!targetTask || !canAccessClient(user, targetTask.client_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const body = await request.json();
    const roleList = ['lead', 'executor', 'reviewer'];
    if (Array.isArray(body.assignees) && !roleList.every(role => body.assignees.some((assignee: { role?: string }) => assignee?.role === role))) {
      return NextResponse.json({ error: 'Responsable, ejecutor y control son obligatorios' }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    for (const key of ['title', 'description', 'status', 'author_id', 'priority', 'due_date', 'position', 'is_public', 'task_type', 'problem_note', 'needs_client_material', 'client_material_note']) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    for (const key of ['pieces_stories', 'pieces_feed', 'pieces_reels']) {
      if (body[key] !== undefined) {
        updates[key] = body[key] === null || body[key] === '' ? null : Number(body[key]);
      }
    }

    if (body.status !== undefined) {
      const { data: prevTask } = await supabase.from('tasks').select('status, problem_note').eq('id', id).single();
      if (body.status === 'problemas') {
        const note = typeof body.problem_note === 'string' ? body.problem_note.trim() : '';
        if (!note && !(prevTask?.problem_note || '').trim()) {
          return NextResponse.json({ error: 'Escribí cuál es el problema' }, { status: 400 });
        }
      }
      if (body.status !== prevTask?.status) {
        if (body.status === 'cerrada') updates.completed_at = new Date().toISOString();
        else if (prevTask?.status === 'cerrada') updates.completed_at = null;
      }
    }

    const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;

    const events: ActivityLogInput[] = [];
    const prevStatus = targetTask?.status;
    const prevTitle = targetTask?.title;
    if (body.title !== undefined && body.title !== prevTitle) {
      events.push({ clientId: data.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: data.title, action: 'updated', detail: 'Editó el título', fromValue: prevTitle, toValue: body.title, actorId: user.id });
    }
    if (body.status !== undefined && body.status !== prevStatus) {
      events.push({ clientId: data.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: data.title, action: 'status_changed', detail: 'Cambió el estado', fromValue: prevStatus, toValue: body.status, actorId: user.id });
      if (body.status === 'cerrada') events.push({ clientId: data.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: data.title, action: 'completed', detail: 'Cerró la tarea', actorId: user.id });
      if (body.status === 'problemas') events.push({ clientId: data.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: data.title, action: 'problem_reported', detail: String(body.problem_note || ''), actorId: user.id });
    }
    if (body.needs_client_material === true && !targetTask?.needs_client_material) {
      events.push({ clientId: data.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: data.title, action: 'material_requested', detail: String(body.client_material_note || ''), actorId: user.id });
    }

    const assigneesProvided = Array.isArray(body.assignees);
    if (assigneesProvided) {
      const desiredRaw = (body.assignees as { id?: string; role?: string }[])
        .filter(a => a?.id && roleList.includes(a.role || ''))
        .map(a => ({ user_id: a.id!, role: a.role! }));
      const desired = [...new Map(desiredRaw.map(a => [`${a.user_id}:${a.role}`, a])).values()];

      const { data: existingRows } = await supabase.from('task_assignees').select('user_id, role').eq('task_id', id);
      const existing = existingRows || [];
      const existingKeys = new Set(existing.map(r => `${r.user_id}:${r.role}`));
      const toAdd = desired.filter(a => !existingKeys.has(`${a.user_id}:${a.role}`));
      const desiredKeys = new Set(desired.map(a => `${a.user_id}:${a.role}`));
      const toRemoveRows = existing.filter(r => !desiredKeys.has(`${r.user_id}:${r.role}`));
      await logAssigneeChanges(events, data.client_id, id, data.title, user.id, toAdd, toRemoveRows);

      const { error: deleteError } = await supabase.from('task_assignees').delete().eq('task_id', id);
      if (deleteError) throw deleteError;
      if (desired.length > 0) {
        const { error: insertError } = await supabase.from('task_assignees').insert(desired.map(a => ({ task_id: id, user_id: a.user_id, role: a.role })));
        if (insertError) throw insertError;
      }
      if (toAdd.length > 0) {
        const actor = data.author_id
          ? (await supabase.from('users').select('full_name, email').eq('id', data.author_id).single()).data
          : null;
        const actorName = actor?.full_name || actor?.email || 'Alguien';
        const notifyIds = [...new Set(toAdd.map(a => a.user_id))];
        await supabase.from('notifications').insert(notifyIds.map(user_id => ({
          user_id,
          type: 'task_assigned',
          title: 'Te asignaron una tarea',
          message: `${actorName} te asignó: ${data.title}`,
          task_id: id,
          link: `/operations?task=${id}`,
        })));
      }
    } else {
      if (Array.isArray(body.assignee_ids)) {
        const newIds: string[] = body.assignee_ids.filter(Boolean);
        const { data: existingRows } = await supabase.from('task_assignees').select('user_id').eq('task_id', id);
        const existingIds = (existingRows || []).map(r => r.user_id);

        const toAdd = newIds.filter(uid => !existingIds.includes(uid));
        const toRemove = existingIds.filter(uid => !newIds.includes(uid));

        await logAssigneeChanges(
          events,
          data.client_id,
          id,
          data.title,
          user.id,
          toAdd.map((user_id) => ({ user_id, role: 'executor' })),
          toRemove.map((user_id) => ({ user_id, role: 'executor' })),
        );

        if (toRemove.length > 0) {
          await supabase.from('task_assignees').delete().eq('task_id', id).in('user_id', toRemove);
        }
        if (toAdd.length > 0) {
          await supabase.from('task_assignees').insert(toAdd.map(user_id => ({ task_id: id, user_id, role: 'executor' })));

          const { data: actor } = data.author_id
            ? await supabase.from('users').select('full_name, email').eq('id', data.author_id).single()
            : { data: null };
          await supabase.from('notifications').insert(toAdd.map(user_id => ({
            user_id,
            type: 'task_assigned',
            title: 'Te asignaron una tarea',
            message: `${actor?.full_name || actor?.email || 'Alguien'} te asignó: ${data.title}`,
            task_id: id,
            link: `/operations?task=${id}`,
          })));
        }
      }
    }

    const { data: assigneeRows } = await supabase.from('task_assignees').select('user_id, role').eq('task_id', id);
    const assigneeIds = (assigneeRows || []).map(r => r.user_id);
    const { data: assigneeUsers } = assigneeIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', assigneeIds)
      : { data: [] };
    const usersMap = Object.fromEntries((assigneeUsers || []).map(u => [u.id, u]));

    await logActivity(supabase, events);

    return NextResponse.json({
      data: {
        ...data,
        assignees: (assigneeRows || []).map(r => usersMap[r.user_id] && { ...usersMap[r.user_id], task_role: r.role }).filter(Boolean),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request, supabase);
    if (!user || !isStaff(user)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { data: targetTask } = await supabase.from('tasks').select('client_id, title').eq('id', id).single();
    if (!targetTask || !canAccessClient(user, targetTask.client_id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    await logActivity(supabase, { clientId: targetTask.client_id, area: 'task', entityType: 'task', entityId: id, entityTitle: targetTask.title, action: 'deleted', detail: 'Eliminó la tarea', actorId: user.id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
