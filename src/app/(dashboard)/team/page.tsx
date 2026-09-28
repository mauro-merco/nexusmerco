'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserTasksModal } from '@/components/user-tasks-modal';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import type { Task, TaskRole, User } from '@/lib/types';
import {
  Loader2, Users2, KanbanSquare, CheckCircle2, Shield,
  Activity, Users, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', operador: 'Operador' };
const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-violet-500/12 text-violet-600 dark:text-violet-400',
  operador: 'bg-blue-500/12 text-blue-600 dark:text-blue-400',
};

const PIE_COLORS: Record<TaskRole, string> = {
  lead: '#a78bfa',
  executor: '#22d3ee',
  reviewer: '#fbbf24',
};

export default function TeamPage() {
  const { user } = useAuthStore();

  if (!hasModuleAccess(user, 'equipo')) {
    return <NoAccess message="No tienes permiso para acceder a la gestión de equipo." />;
  }

  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'operador';

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAdminOrTeam) { setLoading(false); return; }
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([usersJson, tasksJson]) => {
      setUsers((usersJson.data || []).filter((u: User) => u.role === 'admin' || u.role === 'operador'));
      setTasks(tasksJson.data || []);
    }).finally(() => setLoading(false));
  }, [isAdminOrTeam]);

  const stats = useMemo(() => {
    const byUser = new Map<string, {
      total: number; active: number; done: number;
      roles: Record<TaskRole, number>;
    }>();
    for (const u of users) {
      byUser.set(u.id, { total: 0, active: 0, done: 0, roles: { lead: 0, executor: 0, reviewer: 0 } });
    }
    let totalRoleSlots = 0;
    const roleTotals: Record<TaskRole, number> = { lead: 0, executor: 0, reviewer: 0 };

    for (const t of tasks) {
      const countedUsers = new Set<string>();
      for (const a of t.assignees) {
        const ud = byUser.get(a.id);
        if (!ud) continue;
        if (!countedUsers.has(a.id)) {
          countedUsers.add(a.id);
          ud.total += 1;
          if (t.status === 'cerrada') ud.done += 1; else ud.active += 1;
        }
        const r: TaskRole | undefined = a.task_role;
        if (r && roleTotals[r] !== undefined) {
          ud.roles[r] += 1;
          roleTotals[r] += 1;
          totalRoleSlots += 1;
        }
      }
    }

    const activeTasks = tasks.filter(t => t.status !== 'cerrada').length;
    const doneTasks = tasks.filter(t => t.status === 'cerrada').length;
    const maxTotal = Math.max(1, ...Array.from(byUser.values()).map(v => v.total));

    return { byUser, roleTotals, totalRoleSlots, activeTasks, doneTasks, maxTotal };
  }, [users, tasks]);

  const barData = useMemo(() =>
    users.map(u => {
      const s = stats.byUser.get(u.id);
      return {
        name: (u.full_name || u.email || '?').split(' ')[0],
        Activas: s?.active || 0,
        Completadas: s?.done || 0,
      };
    }),
  [users, stats]);

  const pieData = useMemo(() =>
    TASK_ROLES.map(r => ({
      name: TASK_ROLE_CONFIG[r].label,
      value: stats.roleTotals[r],
    })).filter(d => d.value > 0),
  [stats]);

  if (!isAdminOrTeam) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users2 className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Sin acceso</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasksByUser = (userId: string) => tasks.filter(t => t.assignees.some(a => a.id === userId));

  const statCards = [
    { label: 'Integrantes del equipo', value: users.length, icon: Users2, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/12' },
    { label: 'Proyectos activos', value: stats.activeTasks, icon: Activity, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/12' },
    { label: 'Proyectos completados', value: stats.doneTasks, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/12' },
    { label: 'Participaciones totales', value: stats.totalRoleSlots, icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/12' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Equipo</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
          Quién está encargado, quién lidera, quién ejecuta, quién revisa, y qué tiene activo o finalizado.
        </p>
      </div>

      {/* KPI bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5 flex flex-col gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${bg} ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-3xl font-bold leading-none text-foreground">{value}</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts bento */}
      {users.length > 0 && tasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-3 rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Proyectos por integrante
            </p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barData} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} width={24} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} contentStyle={{ fontSize: 12, borderRadius: 14, border: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Activas" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Completadas" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" /> Distribución de roles
            </p>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic text-center py-16">Sin participaciones todavía.</p>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3} stroke="none">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[TASK_ROLES.find(r => TASK_ROLE_CONFIG[r].label === entry.name) as TaskRole]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 14, border: 'none' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Team members */}
      <div className="rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
          <Users2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Integrantes
        </p>
        <div className="divide-y divide-border/40">
          {users.map(u => {
            const s = stats.byUser.get(u.id);
            const activeCount = s?.active || 0;
            const doneCount = s?.done || 0;
            const total = s?.total || 0;
            const loadPct = Math.round((total / stats.maxTotal) * 100);
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="w-full flex flex-col sm:flex-row sm:items-center gap-4 py-4 text-left rounded-2xl px-3 -mx-3 hover:bg-background/60 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 sm:w-56 shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="font-bold bg-primary/10 text-primary">
                      {u.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>

                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${ROLE_STYLES[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>

                <div className="flex items-center gap-4 flex-1 min-w-[220px]">
                  {TASK_ROLES.map(roleKey => {
                    const cfg = TASK_ROLE_CONFIG[roleKey];
                    const Icon = cfg.icon;
                    const count = s?.roles[roleKey] || 0;
                    return (
                      <div key={roleKey} className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 ${cfg.colorClass}`} />
                        <span className={`text-sm font-bold ${cfg.colorClass}`}>{count}</span>
                        <span className="text-[10px] text-muted-foreground uppercase hidden md:inline">{cfg.shortLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 text-[11px] font-medium">
                    <KanbanSquare className="h-3 w-3" /> {activeCount}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 text-[11px] font-medium">
                    <CheckCircle2 className="h-3 w-3" /> {doneCount}
                  </span>
                </div>

                <div className="hidden lg:block w-28 shrink-0">
                  <div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${loadPct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
          {users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Users2 className="h-10 w-10 opacity-30" />
              <p className="text-sm">No hay usuarios internos todavía.</p>
            </div>
          )}
        </div>
      </div>

      {/* Role participation sentences */}
      {tasks.length > 0 && users.length > 0 && (
        <div className="rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" /> Qué hace cada integrante ahora
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TASK_ROLES.map(roleKey => {
              const involved = users
                .map(u => {
                  const items = tasks.filter(t =>
                    t.status !== 'cerrada' &&
                    t.assignees.some(a => a.id === u.id && a.task_role === roleKey)
                  );
                  return { u, items };
                })
                .filter(x => x.items.length > 0);
              const cfg = TASK_ROLE_CONFIG[roleKey];
              const Icon = cfg.icon;
              return (
                <div key={roleKey} className="rounded-2xl bg-background/60 dark:bg-white/[0.03] p-4">
                  <p className={`flex items-center gap-2 text-xs font-semibold mb-3 ${cfg.colorClass}`}>
                    <Icon className="h-4 w-4" /> {cfg.label}
                  </p>
                  {involved.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 italic">Nadie en curso.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {involved.map(({ u, items }) => (
                        <li key={u.id} className="text-xs leading-relaxed">
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{u.full_name}</strong>{' '}
                            {cfg.verb}{' '}
                            {items.slice(0, 2).map((t, i) => (
                              <span key={t.id}>
                                {i > 0 && ', '}
                                <strong className="text-foreground/90">«{t.title}»</strong>
                              </span>
                            ))}
                            {items.length > 2 && <span className="text-muted-foreground"> +{items.length - 2} más</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <UserTasksModal
        user={selectedUser}
        tasks={selectedUser ? tasksByUser(selectedUser.id) : []}
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
      />
    </div>
  );
}
