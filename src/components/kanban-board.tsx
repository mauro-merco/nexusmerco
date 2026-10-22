'use client';

import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, taskPieceTotal, taskTypeInfo } from '@/lib/task-config';
import { Scroller } from '@/components/task-ui';
import { MessageSquare, Paperclip, Calendar, Layers } from 'lucide-react';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

function dueInfo(task: Task) {
  if (!task.due_date) return null;
  const due = new Date(task.due_date + 'T12:00:00');
  const diff = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const overdue = diff < 0 && task.status !== 'cerrada';
  const soon = diff >= 0 && diff <= 3;
  return {
    overdue, soon,
    label: due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
  };
}

function TaskCard({ task, onClick, showClient }: { task: Task; onClick: () => void; showClient?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const p = TASK_PRIORITY_CONFIG[task.priority];
  const due = dueInfo(task);
  const type = taskTypeInfo(task.task_type);
  const people = task.assignees || [];
  const uniq = people.filter((a, i) => people.findIndex(b => b.id === a.id) === i);
  const pieces = taskPieceTotal(task);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined}
      onClick={onClick}
      className={cn(
        'tm-rise tm-lift tm-press group cursor-pointer touch-none select-none rounded-xl bg-card p-3 shadow-[0_1px_2px_rgba(20,20,43,.06)]',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-[11px] font-semibold text-primary/80">{showClient && task.client?.name ? task.client.name : '\u00A0'}</span>
        <span title={`Prioridad ${p.label}`} className={cn('h-2 w-2 shrink-0 rounded-full', p.dotColor)} />
      </div>
      <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{task.title}</p>

      {type && (
        <span className={cn('mt-2 inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold', type.category.bgColorClass, type.category.colorClass)}>
          <type.category.icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{type.label}</span>
        </span>
      )}

      <div className="mt-3 flex items-center gap-2">
        {due && (
          <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
            due.overdue ? 'bg-red-500/15 text-red-500' : due.soon ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/60 text-muted-foreground')}>
            <Calendar className="h-3 w-3" /> {due.overdue ? 'Vencida ' : ''}{due.label}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          {(task.comment_count || 0) > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{task.comment_count}</span>}
          {(task.attachment_count || 0) > 0 && <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{task.attachment_count}</span>}
          {pieces > 0 && <span className="flex items-center gap-0.5 text-violet-500"><Layers className="h-3 w-3" />{pieces}</span>}
          {uniq.length > 0 && (
            <span className="flex -space-x-1.5">
              {uniq.slice(0, 3).map(a => (
                <span key={a.id} title={a.full_name} className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-foreground/70 ring-2 ring-card">{initials(a.full_name)}</span>
              ))}
              {uniq.length > 3 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-bold ring-2 ring-card">+{uniq.length - 3}</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, tasks, onTaskClick, showClient }: { status: TaskStatus; tasks: Task[]; onTaskClick: (t: Task) => void; showClient?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = TASK_STATUS_CONFIG[status];
  const Icon = cfg.icon;
  const empty = tasks.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex shrink-0 flex-col rounded-2xl transition-[width,box-shadow] duration-300 ease-out',
        cfg.bgColorClass,
        empty ? 'w-[190px]' : 'w-[272px]',
        isOver && 'shadow-[inset_0_0_0_2px_rgb(99_102_241/.45)]',
      )}
    >
      <div className={cn('sticky top-0 z-10 flex items-center gap-2 rounded-t-2xl px-3 py-2.5 backdrop-blur', cfg.bgColorClass)}>
        <Icon className={cn('h-4 w-4 shrink-0', cfg.colorClass)} />
        <span className={cn('truncate text-[13px] font-semibold', cfg.colorClass)}>{cfg.label}</span>
        <span className="ml-auto rounded-full bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex min-h-[72px] flex-col gap-2 px-2 pb-2">
        {tasks.map(t => <TaskCard key={t.id} task={t} onClick={() => onTaskClick(t)} showClient={showClient} />)}
        {empty && <div className="py-4 text-center text-[11px] text-muted-foreground/50">Soltá una tarea acá</div>}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  showClient?: boolean;
}

export function KanbanBoard({ tasks, onTaskClick, onTaskMove, showClient }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = TASK_STATUSES.map(status => ({
    status,
    tasks: tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position),
  }));

  const onStart = useCallback((e: DragStartEvent) => {
    const t = (e.active.data.current as { task?: Task })?.task;
    if (t) setActiveTask(t);
  }, []);

  const onEnd = useCallback((e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const t = (active.data.current as { task?: Task })?.task;
    const next = over.id as TaskStatus;
    if (t && TASK_STATUSES.includes(next) && t.status !== next) onTaskMove(t.id, next);
  }, [onTaskMove]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onStart} onDragEnd={onEnd}>
      {/* Single scroll container for the whole board: one horizontal + one vertical bar, thin */}
      <Scroller axis="x" className="h-auto" innerClassName="h-auto rounded-2xl">
        <div className="flex w-max items-start gap-3 pb-2 pr-2">
          {columns.map(c => <KanbanColumn key={c.status} status={c.status} tasks={c.tasks} onTaskClick={onTaskClick} showClient={showClient} />)}
        </div>
      </Scroller>
      <DragOverlay>
        {activeTask ? (
          <div className="max-w-[260px] rotate-2 rounded-xl bg-card p-3 shadow-2xl">
            <p className="text-sm font-semibold">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
