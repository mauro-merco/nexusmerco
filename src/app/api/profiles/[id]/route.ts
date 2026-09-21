import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role, bio, headline, is_public, visible_modules')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
      }
      throw error;
    }

    const isPublic = user.is_public !== false;
    if (!isPublic) {
      return NextResponse.json({ error: 'Perfil no disponible' }, { status: 404 });
    }

    // Tasks where this user has a role (with the user's role + full team info)
    const { data: myRows } = await supabase.from('task_assignees').select('task_id, role').eq('user_id', id);
    const assignedTaskIds = (myRows || []).map(r => r.task_id);
    const { data: tasks } = assignedTaskIds.length > 0
      ? await supabase
          .from('tasks')
          .select('id, client_id, title, description, status, priority, task_type, due_date, position, author_id, created_at, updated_at, completed_at')
          .in('id', assignedTaskIds)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      : { data: [] };

    const [{ data: socialRows }, { data: adsRows }] = await Promise.all([
      supabase.from('social_idea_assignees').select('idea_id, role').eq('user_id', id),
      supabase.from('ads_idea_assignees').select('idea_id, role').eq('user_id', id),
    ]);
    const socialIds = (socialRows || []).map(r => r.idea_id);
    const adsIds = (adsRows || []).map(r => r.idea_id);
    const [{ data: socialIdeas }, { data: adsIdeas }] = await Promise.all([
      socialIds.length > 0
        ? supabase.from('social_ideas').select('id, client_id, title, status, post_type, publish_date, completed_at, created_at').in('id', socialIds)
        : Promise.resolve({ data: [] }),
      adsIds.length > 0
        ? supabase.from('ads_ideas').select('id, client_id, title, status, post_type, publish_date, completed_at, created_at').in('id', adsIds)
        : Promise.resolve({ data: [] }),
    ]);

    const workIdeas = [
      ...(socialIdeas || []).map(idea => ({ ...idea, source: 'social' as const, my_role: socialRows?.find(r => r.idea_id === idea.id)?.role })),
      ...(adsIdeas || []).map(idea => ({ ...idea, source: 'ads' as const, my_role: adsRows?.find(r => r.idea_id === idea.id)?.role })),
    ];

    const clientIds = [...new Set([...(tasks || []).map(t => t.client_id), ...workIdeas.map(i => i.client_id)].filter(Boolean))];
    const { data: clients } = clientIds.length > 0
      ? await supabase.from('clients').select('id, name').in('id', clientIds)
      : { data: [] };
    const clientsMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

    // Everyone involved in those tasks, with their role
    const myRolesByTask: Record<string, string[]> = {};
    for (const row of myRows || []) {
      if (!myRolesByTask[row.task_id]) myRolesByTask[row.task_id] = [];
      if (!myRolesByTask[row.task_id].includes(row.role)) myRolesByTask[row.task_id].push(row.role);
    }
    const { data: assigneeRows } = assignedTaskIds.length > 0
      ? await supabase.from('task_assignees').select('task_id, user_id, role').in('task_id', assignedTaskIds)
      : { data: [] as { task_id: string; user_id: string; role: string }[] };

    const assigneeUserIds = [...new Set((assigneeRows || []).map(r => r.user_id))];
    const { data: users } = assigneeUserIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', assigneeUserIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const assigneesByTask: Record<string, { id: string; full_name: string; avatar_url: string; email: string; role: string; task_role: string }[]> = {};
    for (const row of assigneeRows || []) {
      if (!assigneesByTask[row.task_id]) assigneesByTask[row.task_id] = [];
      const u = usersMap[row.user_id];
      if (u) assigneesByTask[row.task_id].push({ ...u, task_role: row.role });
    }

    const allTasks = (tasks || []).map(t => ({
      ...t,
      client: clientsMap[t.client_id] || null,
       my_role: myRolesByTask[t.id]?.[0] || null,
      my_roles: myRolesByTask[t.id] || [],
      assignees: assigneesByTask[t.id] || [],
    }));
    const allWorkItems = workIdeas
      .map(item => {
        const rows = item.source === 'social' ? socialRows : adsRows;
        const roles = (rows || []).filter(row => row.idea_id === item.id).map(row => row.role);
        return { ...item, my_role: roles[0], my_roles: roles, client: clientsMap[item.client_id] || null };
      })
      .sort((a, b) => (b.completed_at || b.publish_date || b.created_at).localeCompare(a.completed_at || a.publish_date || a.created_at));

    // Public documents owned by this user
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    // Public sticky notes
    const { data: notes } = await supabase
      .from('sticky_notes')
      .select('*')
      .eq('user_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      data: {
        user,
        tasks: allTasks,
        work_items: allWorkItems,
        documents: docs || [],
        notes: notes || [],
      },
    });
  } catch (e) {
    console.error('GET /api/profiles/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
