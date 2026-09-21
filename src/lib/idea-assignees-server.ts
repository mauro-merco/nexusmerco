/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkRole } from '@/lib/types';

type AdminClient = SupabaseClient<any, any, any, any, any>;
type AssignmentTable = 'social_idea_assignees' | 'ads_idea_assignees';

export const WORK_ROLES: WorkRole[] = ['lead', 'executor', 'reviewer'];

export function normalizeWorkAssignees(value: unknown): { user_id: string; role: WorkRole }[] {
  if (!Array.isArray(value)) return [];
  const byUser = new Map<string, WorkRole>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const id = 'id' in item && typeof item.id === 'string' ? item.id : '';
    const role = 'role' in item && WORK_ROLES.includes(item.role as WorkRole) ? item.role as WorkRole : null;
    if (id && role && !byUser.has(id)) byUser.set(id, role);
  }
  return [...byUser].map(([user_id, role]) => ({ user_id, role }));
}

export function hasEveryWorkRole(assignments: { role: WorkRole }[]) {
  return WORK_ROLES.every(role => assignments.some(assignment => assignment.role === role));
}

export async function enrichIdeasWithAssignees(
  supabase: AdminClient,
  table: AssignmentTable,
  ideas: Record<string, any>[],
) {
  const ideaIds = ideas.map(idea => idea.id).filter(Boolean);
  if (ideaIds.length === 0) return ideas.map(idea => ({ ...idea, assignees: [] }));

  const { data: rows, error } = await supabase
    .from(table)
    .select('idea_id, user_id, role')
    .in('idea_id', ideaIds);
  if (error) throw error;

  const userIds = [...new Set((rows || []).map((row: any) => row.user_id))];
  const { data: users, error: usersError } = userIds.length > 0
    ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
    : { data: [], error: null };
  if (usersError) throw usersError;

  const usersById = Object.fromEntries((users || []).map((user: any) => [user.id, user]));
  const byIdea: Record<string, Record<string, any>[]> = {};
  for (const row of rows || []) {
    const user = usersById[row.user_id];
    if (!user) continue;
    if (!byIdea[row.idea_id]) byIdea[row.idea_id] = [];
    byIdea[row.idea_id].push({ ...user, work_role: row.role });
  }

  return ideas.map(idea => ({ ...idea, assignees: byIdea[idea.id] || [] }));
}

export async function syncIdeaAssignees(
  supabase: AdminClient,
  table: AssignmentTable,
  ideaId: string,
  input: unknown,
) {
  const desired = normalizeWorkAssignees(input);
  const { data: existingRows, error: readError } = await supabase
    .from(table)
    .select('user_id, role')
    .eq('idea_id', ideaId);
  if (readError) throw readError;

  const existing = existingRows || [];
  const desiredIds = desired.map(row => row.user_id);
  const existingIds = existing.map((row: any) => row.user_id);
  const existingByUser = Object.fromEntries(existing.map((row: any) => [row.user_id, row.role]));
  const toRemove = existingIds.filter((id: string) => !desiredIds.includes(id));
  const toAdd = desired.filter(row => !existingByUser[row.user_id]);
  const toUpdate = desired.filter(row => existingByUser[row.user_id] && existingByUser[row.user_id] !== row.role);

  if (toRemove.length > 0) {
    const { error } = await supabase.from(table).delete().eq('idea_id', ideaId).in('user_id', toRemove);
    if (error) throw error;
  }
  for (const row of toUpdate) {
    const { error } = await supabase.from(table).update({ role: row.role }).eq('idea_id', ideaId).eq('user_id', row.user_id);
    if (error) throw error;
  }
  if (toAdd.length > 0) {
    const { error } = await supabase.from(table).insert(toAdd.map(row => ({ idea_id: ideaId, ...row })));
    if (error) throw error;
  }

  return { added: toAdd, desired };
}
