/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PostType, WorkRole } from '@/lib/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

type Source = 'task' | 'social' | 'ads';
type AssignmentRow = { item_id: string; user_id: string; role: WorkRole };

function taskPieces(task: Record<string, any>) {
  const typed = (task.pieces_stories || 0) + (task.pieces_feed || 0) + (task.pieces_reels || 0);
  return typed > 0 ? typed : (task.pieces_count || 0);
}

function periodKey(value: string, range: 'day' | 'week' | 'month') {
  const date = new Date(value);
  if (range === 'month') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  if (range === 'week') {
    const day = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - day);
  }
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const userId = searchParams.get('user_id');

    let taskQuery = supabase.from('tasks').select('*');
    let socialQuery = supabase.from('social_ideas').select('*');
    let adsQuery = supabase.from('ads_ideas').select('*');
    if (clientId) {
      taskQuery = taskQuery.eq('client_id', clientId);
      socialQuery = socialQuery.eq('client_id', clientId);
      adsQuery = adsQuery.eq('client_id', clientId);
    }

    const [{ data: tasks, error: taskError }, { data: social, error: socialError }, { data: ads, error: adsError }] = await Promise.all([
      taskQuery,
      socialQuery,
      adsQuery,
    ]);
    if (taskError) throw taskError;
    if (socialError) throw socialError;
    if (adsError) throw adsError;

    const taskIds = (tasks || []).map(row => row.id);
    const socialIds = (social || []).map(row => row.id);
    const adsIds = (ads || []).map(row => row.id);
    const [{ data: taskAssignments }, { data: socialAssignments }, { data: adsAssignments }] = await Promise.all([
      taskIds.length ? supabase.from('task_assignees').select('task_id, user_id, role').in('task_id', taskIds) : Promise.resolve({ data: [] }),
      socialIds.length ? supabase.from('social_idea_assignees').select('idea_id, user_id, role').in('idea_id', socialIds) : Promise.resolve({ data: [] }),
      adsIds.length ? supabase.from('ads_idea_assignees').select('idea_id, user_id, role').in('idea_id', adsIds) : Promise.resolve({ data: [] }),
    ]);

    const assignmentSets: Record<Source, AssignmentRow[]> = {
      task: (taskAssignments || []).map(row => ({ item_id: row.task_id, user_id: row.user_id, role: row.role as WorkRole })),
      social: (socialAssignments || []).map(row => ({ item_id: row.idea_id, user_id: row.user_id, role: row.role as WorkRole })),
      ads: (adsAssignments || []).map(row => ({ item_id: row.idea_id, user_id: row.user_id, role: row.role as WorkRole })),
    };
    const userIds = [...new Set(Object.values(assignmentSets).flat().map(row => row.user_id))];
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] };
    const usersById = Object.fromEntries((users || []).map(user => [user.id, user]));

    const assigneesFor = (source: Source, id: string) => assignmentSets[source]
      .filter(row => row.item_id === id)
      .map(row => usersById[row.user_id] && { ...usersById[row.user_id], work_role: row.role })
      .filter(Boolean);

    const items = [
      ...(tasks || []).map(task => ({
        id: task.id,
        source: 'task' as const,
        client_id: task.client_id,
        title: task.title,
        status: task.status,
        state: task.status === 'cerrada' ? 'closed' as const : 'active' as const,
        created_at: task.created_at,
        scheduled_at: task.due_date,
        completed_at: task.completed_at,
        post_type: null,
        piece_count: taskPieces(task),
        assignees: assigneesFor('task', task.id),
      })),
      ...(social || []).map(idea => ({
        id: idea.id,
        source: 'social' as const,
        client_id: idea.client_id,
        title: idea.title,
        status: idea.status,
        state: idea.status === 'posteado' ? 'closed' as const : 'active' as const,
        created_at: idea.created_at,
        scheduled_at: idea.publish_date,
        completed_at: idea.completed_at,
        post_type: idea.post_type as PostType,
        piece_count: 1,
        assignees: assigneesFor('social', idea.id),
      })),
      ...(ads || []).map(idea => ({
        id: idea.id,
        source: 'ads' as const,
        client_id: idea.client_id,
        title: idea.title,
        status: idea.status,
        state: idea.status === 'posteado' ? 'closed' as const : 'active' as const,
        created_at: idea.created_at,
        scheduled_at: idea.publish_date,
        completed_at: idea.completed_at,
        post_type: idea.post_type as PostType,
        piece_count: 1,
        assignees: assigneesFor('ads', idea.id),
      })),
    ].filter(item => !userId || item.assignees.some(assignee => assignee.id === userId));

    const byRole: Record<WorkRole, number> = { lead: 0, executor: 0, reviewer: 0 };
    for (const item of items) for (const assignee of item.assignees) {
      if (!userId || assignee.id === userId) byRole[assignee.work_role as WorkRole] += 1;
    }
    const series = Object.fromEntries((['day', 'week', 'month'] as const).map(range => {
      const grouped = new Map<string, { period: string; completed: number; pieces: number }>();
      for (const item of items) {
        if (item.state !== 'closed' || !item.completed_at) continue;
        const period = periodKey(item.completed_at, range);
        const current = grouped.get(period) || { period, completed: 0, pieces: 0 };
        current.completed += 1;
        current.pieces += item.piece_count;
        grouped.set(period, current);
      }
      return [range, [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period))];
    }));

    return NextResponse.json({
      data: {
        summary: {
          total: items.length,
          active: items.filter(item => item.state === 'active').length,
          closed: items.filter(item => item.state === 'closed').length,
          pieces: items.filter(item => item.state === 'closed').reduce((sum, item) => sum + item.piece_count, 0),
          by_source: {
            task: items.filter(item => item.source === 'task').length,
            social: items.filter(item => item.source === 'social').length,
            ads: items.filter(item => item.source === 'ads').length,
          },
          by_role: byRole,
        },
        series,
        items: items.sort((a, b) => (b.completed_at || b.scheduled_at || b.created_at).localeCompare(a.completed_at || a.scheduled_at || a.created_at)),
      },
    });
  } catch (error) {
    console.error('GET /api/work-stats error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
