export type ActivityArea = 'task' | 'social' | 'ads' | 'general';

export interface ActivityActor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export interface ActivityEvent {
  id: string;
  client_id: string | null;
  area: ActivityArea;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  action: string;
  detail: string | null;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  created_at: string;
  actor?: ActivityActor | null;
  client?: { id: string; name: string } | null;
}

export const ACTIVITY_AREAS: ActivityArea[] = ['task', 'social', 'ads', 'general'];

export const ACTIVITY_AREA_CONFIG: Record<ActivityArea, { label: string; colorClass: string }> = {
  task: { label: 'Tareas', colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30' },
  social: { label: 'Redes', colorClass: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30' },
  ads: { label: 'ADS', colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' },
  general: { label: 'General', colorClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30' },
};

/**
 * Human description of an action. Some actions (assignments, status changes)
 * carry the relevant value in detail / from_value / to_value, so the component
 * composes the final sentence with those when present.
 */
export const ACTIVITY_ACTION_LABEL: Record<string, string> = {
  created: 'Creó',
  updated: 'Editó',
  deleted: 'Eliminó',
  status_changed: 'Cambió el estado',
  completed: 'Completó',
  commented: 'Comentó',
  assignee_added: 'Asignó',
  assignee_removed: 'Quitó',
  material_requested: 'Pidió material del cliente',
  material_added: 'Agregó material',
  material_removed: 'Quitó material',
  problem_reported: 'Reportó un problema',
  approved: 'Aprobó',
  rejected: 'Rechazó',
};

export function activityActionLabel(action: string): string {
  return ACTIVITY_ACTION_LABEL[action] || action;
}
