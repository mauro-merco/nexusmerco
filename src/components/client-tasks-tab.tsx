'use client';

import { useRouter } from 'next/navigation';
import { useTasks } from '@/lib/hooks/use-tasks';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/lib/task-config';
import { Loader2, Calendar, KanbanSquare, CheckCircle2, Layers, ImageIcon } from 'lucide-react';

export function TaskRow({ task, onClick, showClient }: { task: Task; onClick: () => void; showClient?: boolean }) {
  const sConfig = TASK_STATUS_CONFIG[task.status];
  const pConfig = TASK_PRIORITY_CONFIG[task.priority];
  const SIcon = sConfig.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left"
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', sConfig.bgColorClass, sConfig.colorClass)}>
        <SIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {showClient && task.client?.name && (
            <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/70">{task.client.name}</span>
          )}
          <span className={cn('flex items-center gap-1 font-medium', sConfig.colorClass)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', sConfig.dotColor)} /> {sConfig.label}
          </span>
          <span className={cn('flex items-center gap-1 font-medium', pConfig.colorClass)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', pConfig.dotColor)} /> {pConfig.label}
          </span>
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {!!task.pieces_count && (
            <span className="flex items-center gap-1 font-medium text-violet-500">
              <Layers className="h-3 w-3" /> {task.pieces_count} pieza{task.pieces_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      {task.assignees.length > 0 && (
        <div className="flex -space-x-2 shrink-0">
          {task.assignees.slice(0, 3).map(a => (
            <Avatar key={a.id} className="h-7 w-7 border-2 border-card">
              <AvatarImage src={a.avatar_url} />
              <AvatarFallback className="text-[10px] font-semibold">{a.full_name?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
          ))}
          {task.assignees.length > 3 && (
            <div className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-semibold">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

const MONTH_LABEL = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
};

export function PiecesByMonth({ tasks }: { tasks: Task[] }) {
  const byMonth: Record<string, number> = {};
  for (const t of tasks) {
    if (!t.pieces_count) continue;
    const dateStr = t.completed_at || t.due_date || t.created_at;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] || 0) + t.pieces_count;
  }
  const entries = Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0]));
  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
        <ImageIcon className="h-3.5 w-3.5" /> Piezas diseñadas por mes
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground/60 italic py-4">Todavía no hay piezas registradas en tareas finalizadas.</p>
      ) : (
        <div className="space-y-2.5 rounded-xl border bg-card p-4">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground capitalize">{MONTH_LABEL(key)}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-tech rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-semibold">{count} pieza{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ClientTasksTab({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, loading } = useTasks(clientId);

  const activeTasks = tasks.filter(t => t.status !== 'aprobado');
  const historyTasks = tasks.filter(t => t.status === 'aprobado');

  const openTask = (id: string) => router.push(`/operations?task=${id}`);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <KanbanSquare className="h-12 w-12 opacity-20" />
        <p className="text-sm">Sin tareas para este cliente todavía.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <KanbanSquare className="h-3.5 w-3.5" /> En curso ({activeTasks.length})
        </p>
        {activeTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic py-4">Sin tareas activas.</p>
        ) : (
          <div className="space-y-2">
            {activeTasks.map(t => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />)}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" /> Historial ({historyTasks.length})
        </p>
        {historyTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic py-4">Todavía no hay tareas finalizadas.</p>
        ) : (
          <div className="space-y-2 opacity-80">
            {historyTasks.map(t => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} />)}
          </div>
        )}
      </div>

      <PiecesByMonth tasks={historyTasks} />
    </div>
  );
}
