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
      .select('id, full_name, avatar_url, bio, headline, is_public')
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
          .select('id, client_id, title, description, status, priority, task_type, due_date')
          .in('id', assignedTaskIds)
          .eq('is_public', true)
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

    const myRolesByTask: Record<string, string[]> = {};
    for (const row of myRows || []) {
      if (!myRolesByTask[row.task_id]) myRolesByTask[row.task_id] = [];
      if (!myRolesByTask[row.task_id].includes(row.role)) myRolesByTask[row.task_id].push(row.role);
    }
    const allTasks = (tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      task_type: t.task_type,
      due_date: t.due_date,
      client: clientsMap[t.client_id] ? { name: clientsMap[t.client_id].name } : null,
      my_role: myRolesByTask[t.id]?.[0] || null,
      my_roles: myRolesByTask[t.id] || [],
    }));
    const allWorkItems = workIdeas
      .map(item => {
        const rows = item.source === 'social' ? socialRows : adsRows;
        const roles = (rows || []).filter(row => row.idea_id === item.id).map(row => row.role);
        return {
          id: item.id,
          title: item.title,
          status: item.status,
          post_type: item.post_type,
          publish_date: item.publish_date,
          source: item.source,
          my_role: roles[0],
          my_roles: roles,
          client: clientsMap[item.client_id] ? { name: clientsMap[item.client_id].name } : null,
          _sort_date: item.completed_at || item.publish_date || item.created_at,
        };
      })
      .sort((a, b) => b._sort_date.localeCompare(a._sort_date))
      .map(({ _sort_date, ...item }) => item);

    // Public documents owned by this user
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, content, updated_at')
      .eq('owner_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    // Public sticky notes
    const { data: notes } = await supabase
      .from('sticky_notes')
      .select('id, title, content, color, category')
      .eq('user_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          bio: user.bio,
          headline: user.headline,
          is_public: true,
        },
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
