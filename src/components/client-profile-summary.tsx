'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TeamActivity } from '@/components/team-activity';
import { WorkStatistics } from '@/components/work-statistics';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { ClientWall } from '@/components/client-wall';
import { TASK_ROLE_CONFIG, TASK_STATUS_CONFIG } from '@/lib/task-config';
import { cn } from '@/lib/utils';
import type { User, Task, NexusDocument } from '@/lib/types';
import { KanbanSquare, CheckCircle2, Users2, Loader2, ChevronRight, FileText, Plus, Calendar } from 'lucide-react';

function TaskRowInline({ task, onOpen, closed }: { task: Task; onOpen: () => void; closed?: boolean }) {
  const sConfig = TASK_STATUS_CONFIG[task.status];
  const SIcon = sConfig.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left hover:bg-muted/40 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0', sConfig.bgColorClass, sConfig.colorClass)}>
          <SIcon className="h-3 w-3" /> {sConfig.label}
        </Badge>
        <span className="text-sm font-medium truncate">{task.title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map(a => (
              <span
                key={`${a.id}-${a.task_role || ''}`}
                title={`${a.full_name || a.email}${a.task_role ? ` · ${TASK_ROLE_CONFIG[a.task_role]?.shortLabel || a.task_role}` : ''}`}
              >
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarImage src={a.avatar_url} />
                  <AvatarFallback className="text-[8px]">{a.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
              </span>
            ))}
            {task.assignees.length > 3 && (
              <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-semibold">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
        {closed ? (
          task.completed_at ? (
            <span className="text-[10px] text-muted-foreground">
              {new Date(task.completed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            </span>
          ) : null
        ) : task.due_date ? (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </span>
        ) : null}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
      </div>
    </button>
  );
}

export function ClientProfileSummary({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, loading, patchTask, refetch } = useTasks(clientId);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data || [])).catch(() => {});
  }, []);

  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeTasks = tasks.filter(t => t.status !== 'cerrada');
  const historyTasks = tasks.filter(t => t.status === 'cerrada');

  const teamMap = new Map<string, { user: User; count: number }>();
  for (const t of activeTasks) {
    for (const a of t.assignees) {
      const entry = teamMap.get(a.id);
      if (entry) entry.count += 1;
      else teamMap.set(a.id, { user: a, count: 1 });
    }
  }
  const team = [...teamMap.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <Card className="bg-card/50 backdrop-blur-xl border border-border/30">
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold flex items-center gap-2">
              <KanbanSquare className="h-4 w-4 text-primary" /> Perfil del cliente
            </p>
            <button
              type="button"
              onClick={() => router.push('/operations')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver todas las tareas <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-background/40 p-3.5">
              <p className="text-2xl font-bold">{activeTasks.length}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <KanbanSquare className="h-3 w-3 text-blue-500" /> Tareas en curso
              </p>
            </div>
            <div className="rounded-xl border bg-background/40 p-3.5">
              <p className="text-2xl font-bold">{historyTasks.length}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Finalizadas (historial)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Equipo trabajando en esto
            </p>
            {team.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">Nadie tiene tareas activas para este cliente.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {team.map(({ user, count }) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => router.push(`/u/${user.id}`)}
                    title={`Ver perfil de ${user.full_name}`}
                    className="flex items-center gap-2 rounded-full border bg-background/40 pl-1 pr-3 py-1 hover:bg-muted/50 hover:border-primary/30 transition-colors"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-[10px] font-semibold">{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{user.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" /> Tareas activas
            </p>
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">Sin tareas activas</p>
            ) : (
              <div className="space-y-1.5">
                {activeTasks.map(t => <TaskRowInline key={t.id} task={t} onOpen={() => setSelectedTask(t)} />)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Historial ({historyTasks.length})
            </p>
            {historyTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic">Todavía no hay tareas finalizadas.</p>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {historyTasks.map(t => (
                  <TaskRowInline
                    key={t.id}
                    task={t}
                    closed
                    onOpen={() => router.push(`/operations?task=${t.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          <TeamActivity tasks={tasks} />
          <WorkStatistics clientId={clientId} />
        </CardContent>
      </Card>

      <DocumentsSection clientId={clientId} />

      <ClientWall clientId={clientId} />

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onTaskUpdated={(updated) => { patchTask(updated); setSelectedTask(updated); }}
          onTaskDeleted={() => { setSelectedTask(null); refetch(); }}
          users={users}
        />
      )}
    </div>
  );
}

function DocumentsSection({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [docs, setDocs] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const authHeaders = useCallback((json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?client_id=${clientId}`, { headers: authHeaders() });
      const json = await res.json();
      setDocs(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [clientId, authHeaders]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ title: 'Nuevo documento', client_id: clientId }),
      });
      const json = await res.json();
      if (res.ok && json.data) router.push(`/documentos?doc=${json.data.id}`);
    } finally {
      setCreating(false);
    }
  }, [clientId, authHeaders, router]);

  return (
    <Card className="bg-card/50 backdrop-blur-xl border border-border/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Archivos del cliente
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Nuevo documento
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic text-center py-4">Sin documentos para este cliente</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => router.push(`/documentos?doc=${d.id}`)}
                className="w-full flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{d.title}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(d.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
