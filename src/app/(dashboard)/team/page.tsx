'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserTasksModal } from '@/components/user-tasks-modal';
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
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/15 text-purple-500',
  operador: 'bg-blue-500/15 text-blue-500',
};

const PIE_COLORS: Record<TaskRole, string> = {
  lead: '#a78bfa',
  executor: '#22d3ee',
  reviewer: '#fbbf24',
};

export default function TeamPage() {
  const { user } = useAuthStore();
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

    return { byUser, roleTotals, totalRoleSlots, activeTasks, doneTasks };
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
    {
      label: 'Integrantes del equipo',
      value: users.length,
      icon: Users2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Proyectos activos',
      value: stats.activeTasks,
      icon: Activity,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Proyectos completados',
      value: stats.doneTasks,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Participaciones totales',
      value: stats.totalRoleSlots,
      icon: TrendingUp,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gradient-tech text-2xl md:text-3xl font-bold tracking-tight">Equipo</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Extracto general de todo el equipo: quién está encargado, quien lidera, quién ejecuta, quién revisa, y qué tiene activo o finalizado.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {users.length > 0 && tasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <Card className="lg:col-span-3 bg-card/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <KanbanSquare className="h-3.5 w-3.5 text-cyan-500" /> Proyectos por integrante
              </p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} width={24} />
                  <Tooltip cursor={{ fill: 'currentColor', opacity: 0.05 }} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid var(--border)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Activas" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Completadas" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-card/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-violet-500" /> Distribución de roles
              </p>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground/60 italic text-center py-16">Sin participaciones todavía.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[TASK_ROLES.find(r => TASK_ROLE_CONFIG[r].label === entry.name) as TaskRole]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid var(--border)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const userTasks = tasksByUser(u.id);
          const s = stats.byUser.get(u.id);
          const activeCount = s?.active || 0;
          const doneCount = s?.done || 0;
          return (
            <Card
              key={u.id}
              className="group cursor-pointer bg-card/50 backdrop-blur-xl border border-border/30 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all duration-300"
              onClick={() => setSelectedUser(u)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 ring-2 ring-border/30">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                      {u.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0 flex items-center gap-1 ${ROLE_COLORS[u.role]}`}>
                    <Shield className="h-2.5 w-2.5" /> {ROLE_LABELS[u.role]}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {TASK_ROLES.map(roleKey => {
                    const cfg = TASK_ROLE_CONFIG[roleKey];
                    const Icon = cfg.icon;
                    const count = s?.roles[roleKey] || 0;
                    return (
                      <div key={roleKey} className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 ${cfg.borderClass}`}>
                        <Icon className={`h-3 w-3 ${cfg.colorClass}`} />
                        <span className={`text-xs font-bold ${cfg.colorClass}`}>{count}</span>
                        <span className="text-[8px] leading-none text-muted-foreground uppercase">{cfg.shortLabel}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <KanbanSquare className="h-3 w-3 text-blue-500" /> {activeCount} en curso
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {doneCount} finalizadas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role participation sentences */}
      {tasks.length > 0 && users.length > 0 && (
        <Card className="bg-card/50">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" /> Qué hace cada integrante ahora
            </p>
            <div className="space-y-4">
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
                if (involved.length === 0) return null;
                const cfg = TASK_ROLE_CONFIG[roleKey];
                const Icon = cfg.icon;
                return (
                  <div key={roleKey}>
                    <p className={`flex items-center gap-2 text-xs font-semibold mb-2 ${cfg.colorClass}`}>
                      <Icon className="h-4 w-4" /> {cfg.label}
                    </p>
                    <ul className="space-y-1.5 pl-0.5">
                      {involved.map(({ u, items }) => (
                        <li key={u.id} className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="text-muted-foreground">
                            <strong className="text-foreground">{u.full_name}</strong>{' '}
                            {cfg.verb}{' '}
                            {items.slice(0, 3).map(t => (
                              <strong key={t.id} className="text-foreground/90">«{t.title}»</strong>
                            ))}
                          </span>
                          {items.length > 3 && (
                            <Badge variant="outline" className="text-[10px]">+{items.length - 3} más</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {users.length === 0 && (
        <Card className="border-dashed bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">No hay usuarios internos todavía.</p>
          </CardContent>
        </Card>
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
