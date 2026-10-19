import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityArea } from './activity-config';

type Db = SupabaseClient<any, any, any, any, any>;

export interface ActivityLogInput {
  clientId?: string | null;
  area: ActivityArea;
  entityType: string;
  entityId?: string | null;
  entityTitle?: string | null;
  action: string;
  detail?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  actorId?: string | null;
  createdAt?: string;
}

/**
 * Best-effort append to the activity log. Never throws: history must not break
 * the mutation that triggered it.
 */
export async function logActivity(db: Db, input: ActivityLogInput | ActivityLogInput[]): Promise<void> {
  const list = (Array.isArray(input) ? input : [input]).filter((e) => e && e.action);
  if (list.length === 0) return;
  const rows = list.map((e) => ({
    client_id: e.clientId || null,
    area: e.area,
    entity_type: e.entityType,
    entity_id: e.entityId || null,
    entity_title: e.entityTitle || null,
    action: e.action,
    detail: e.detail || null,
    from_value: e.fromValue || null,
    to_value: e.toValue || null,
    actor_id: e.actorId || null,
    ...(e.createdAt ? { created_at: e.createdAt } : {}),
  }));
  try {
    const { error } = await db.from('activity_events').insert(rows);
    if (error) console.error('logActivity error:', error.message);
  } catch (e) {
    console.error('logActivity failed:', e);
  }
}
