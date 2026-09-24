'use client';

import { useState, useRef, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import type { TaskRole } from '@/lib/types';
import { ChevronDown, Search } from 'lucide-react';

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

type Person = { id: string; full_name: string; email: string; avatar_url: string };

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

interface RolePickerFieldProps {
  roleKey: TaskRole;
  users: Person[];
  selected: string[];
  onToggle: (id: string) => void;
}

function RolePickerField({ roleKey, users, selected, onToggle }: RolePickerFieldProps) {
  const cfg = TASK_ROLE_CONFIG[roleKey];
  const Icon = cfg.icon;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const selectedUsers = users.filter(u => selected.includes(u.id));
  const filtered = users.filter(u => (u.full_name || u.email).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center gap-2.5 rounded-xl bg-muted/35 hover:bg-muted/55 px-3 py-2.5 text-left transition-colors', open && 'bg-muted/55')}
      >
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', cfg.bgColorClass, cfg.colorClass)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground leading-tight">{cfg.question}</p>
          {selectedUsers.length === 0 ? (
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Sin asignar</p>
          ) : (
            <div className="flex items-center -space-x-1.5 mt-1">
              {selectedUsers.slice(0, 4).map(u => (
                <span key={u.id} className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[8px] font-bold ring-1 ring-background">
                  {initials(u.full_name || u.email)}
                </span>
              ))}
              {selectedUsers.length > 4 && <span className="pl-2 text-[10px] text-muted-foreground">+{selectedUsers.length - 4}</span>}
            </div>
          )}
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] rounded-xl bg-popover shadow-xl z-50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar persona..."
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-52 overflow-y-auto p-1.5">
              {filtered.length === 0 && <p className="text-[11px] text-muted-foreground px-2 py-2">Sin resultados</p>}
              {filtered.map(u => {
                const isOn = selected.includes(u.id);
                return (
                  <label key={u.id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs cursor-pointer transition-colors', isOn ? cfg.bgColorClass : 'hover:bg-muted/50')}>
                    <Checkbox checked={isOn} onCheckedChange={() => onToggle(u.id)} />
                    <span className="truncate">{u.full_name || u.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface TaskRolesPickerProps {
  roles: TaskRolesState;
  onChange: (roles: TaskRolesState) => void;
  users: Person[];
}

export function TaskRolesPicker({ roles, onChange, users }: TaskRolesPickerProps) {
  const toggle = (role: TaskRole, id: string) => {
    const next: TaskRolesState = { ...roles, [role]: roles[role].includes(id) ? roles[role].filter(x => x !== id) : [...roles[role], id] };
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {TASK_ROLES.map(roleKey => (
        <RolePickerField key={roleKey} roleKey={roleKey} users={users} selected={roles[roleKey]} onToggle={(id) => toggle(roleKey, id)} />
      ))}
    </div>
  );
}
