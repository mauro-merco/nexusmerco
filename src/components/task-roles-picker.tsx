'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import type { TaskRole } from '@/lib/types';

export type TaskRolesState = Record<TaskRole, string[]>;

const EMPTY_ROLES: TaskRolesState = { lead: [], executor: [], reviewer: [] };

export function emptyRoles(): TaskRolesState {
  return { lead: [], executor: [], reviewer: [] };
}

export function rolesFromAssignees(assignees: { id: string; task_role?: TaskRole }[] | undefined): TaskRolesState {
  const roles: TaskRolesState = JSON.parse(JSON.stringify(EMPTY_ROLES));
  for (const a of assignees || []) {
    if (a.task_role && roles[a.task_role] && !roles[a.task_role].includes(a.id)) {
      roles[a.task_role].push(a.id);
    }
  }
  return roles;
}

export function rolesToList(roles: TaskRolesState): { id: string; role: TaskRole }[] {
  const out: { id: string; role: TaskRole }[] = [];
  for (const role of TASK_ROLES) {
    for (const id of roles[role]) out.push({ id, role });
  }
  return out;
}

export function rolesCount(roles: TaskRolesState): number {
  return TASK_ROLES.reduce((acc, r) => acc + roles[r].length, 0);
}

export function totalPeople(roles: TaskRolesState): number {
  const s = new Set<string>();
  for (const r of TASK_ROLES) for (const id of roles[r]) s.add(id);
  return s.size;
}

interface TaskRolesPickerProps {
  roles: TaskRolesState;
  onChange: (roles: TaskRolesState) => void;
  users: { id: string; full_name: string; email: string; avatar_url: string }[];
}

export function TaskRolesPicker({ roles, onChange, users }: TaskRolesPickerProps) {
  const toggle = (role: TaskRole, id: string) => {
    const next: TaskRolesState = { ...roles, [role]: roles[role].includes(id) ? roles[role].filter(x => x !== id) : [...roles[role], id] };
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {TASK_ROLES.map(roleKey => {
        const cfg = TASK_ROLE_CONFIG[roleKey];
        const Icon = cfg.icon;
        const selected = roles[roleKey];
        return (
          <div key={roleKey} className={cn('rounded-xl border bg-card/50 p-3', cfg.borderClass)}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg.bgColorClass, cfg.colorClass)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className={cn('text-xs font-semibold leading-tight', cfg.colorClass)}>{cfg.question}</p>
                {selected.length > 0 && <p className="text-[10px] text-muted-foreground">{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</p>}
              </div>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
              {users.length === 0 && <p className="text-[11px] text-muted-foreground">Sin usuarios</p>}
              {users.map(u => {
                const isOn = selected.includes(u.id);
                return (
                  <label key={u.id} className={cn(
                    'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs cursor-pointer transition-colors',
                    isOn ? cn(cfg.bgColorClass, 'border-transparent') : 'border-transparent hover:bg-muted/50',
                  )}>
                    <Checkbox
                      checked={isOn}
                      onCheckedChange={() => toggle(roleKey, u.id)}
                    />
                    <span className="truncate">{u.full_name || u.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
