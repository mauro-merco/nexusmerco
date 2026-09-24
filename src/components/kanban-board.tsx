'use client';

import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, taskPieceTotal, taskTypeInfo } from '@/lib/task-config';
import { GripVertical, MessageSquare, Paperclip, Calendar, User, Layers } from 'lucide-react';

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, data: { task } });
  const pConfig = TASK_PRIORITY_CONFIG[task.priority];
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card rounded-2xl p-3 cursor-pointer transition-shadow hover:shadow-md group shadow-[0_1px_2px_rgba(20,20,43,.06)]',
        isDragging && 'opacity-50 shadow-xl',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2 mb-2">
        <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing shrink-0 mt-0.5">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">{task.title}</p>
        </div>
        <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', pConfig.dotColor)} />
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 ml-5">{task.description}</p>
      )}

      {taskTypeInfo(task.task_type) && (() => {
        const info = taskTypeInfo(task.task_type)!;
        const cat = info.category;
        const Icon = cat.icon;
        return (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold mb-2 ml-5', cat.bgColorClass, cat.colorClass)}>
            <Icon className="h-3 w-3 shrink-0" />
            <span className="max-w-[170px] truncate">{info.label}</span>
          </span>
        );
      })()}

      <div className="flex items-center justify-between ml-5">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {task.due_date && (() => {
            const due = new Date(task.due_date + 'T12:00:00');
            const now = new Date();
            const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0;
            const isSoon = diffDays >= 0 && diffDays <= 3;
            return (
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                isOverdue && 'bg-red-500/15 text-red-500',
                isSoon && !isOverdue && 'bg-amber-500/15 text-amber-500',
                !isOverdue && !isSoon && 'bg-blue-500/15 text-blue-500',
              )}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? 'VENCIDA' : 'LÍMITE'} {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </span>
            );
          })()}
          {task.assignees && task.assignees.length > 0 && (
            <span className="flex items-center gap-0.5 truncate max-w-[140px]">
              <User className="h-3 w-3 shrink-0" />
              {task.assignees.length > 2
                ? `${task.assignees.slice(0, 2).map(a => a.full_name.split(' ')[0]).join(', ')} +${task.assignees.length - 2}`
                : task.assignees.map(a => a.full_name.split(' ')[0]).join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {(task.comment_count || 0) > 0 && (
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" /> {task.comment_count}</span>
          )}
          {(task.attachment_count || 0) > 0 && (
            <span className="flex items-center gap-0.5"><Paperclip className="h-3 w-3" /> {task.attachment_count}</span>
          )}
          {taskPieceTotal(task) > 0 && (
            <span className="flex items-center gap-0.5 text-violet-500"><Layers className="h-3 w-3" /> {taskPieceTotal(task)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ status, tasks, onTaskClick }: { status: TaskStatus; tasks: Task[]; onTaskClick: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cfg = TASK_STATUS_CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl min-w-[280px] max-w-[320px] w-full transition-colors',
        cfg.bgColorClass,
        isOver && 'ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <Icon className={cn('h-4 w-4', cfg.colorClass)} />
        <span className={cn('text-sm font-semibold', cfg.colorClass)}>{cfg.label}</span>
        <span className="ml-auto text-xs text-muted-foreground font-medium bg-background/60 rounded-full px-2 py-0.5">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 p-2 space-y-2 min-h-[100px] overflow-y-auto max-h-[calc(100vh-280px)]">
        {tasks.map(task => <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />)}
        {tasks.length === 0 && <div className="text-center py-8 text-xs text-muted-foreground/50">Sin tareas</div>}
      </div>
    </div>
  );
}

function DragOverlayCard({ task }: { task: Task }) {
  const pConfig = TASK_PRIORITY_CONFIG[task.priority];
  return (
    <div className="bg-card rounded-2xl p-3 shadow-xl max-w-[300px]">
      <div className="flex items-start gap-2">
        <p className="text-sm font-semibold">{task.title}</p>
        <span className={cn('w-2 h-2 rounded-full shrink-0 mt-1.5', pConfig.dotColor)} />
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanBoard({ tasks, onTaskClick, onTaskMove }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksByStatus = TASK_STATUSES.map(status => ({
    status,
    tasks: tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position),
  }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = (event.active.data.current as { task?: Task })?.task;
    if (task) setActiveTask(task);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const task = (active.data.current as { task?: Task })?.task;
    const newStatus = over.id as TaskStatus;
    if (task && TASK_STATUSES.includes(newStatus) && task.status !== newStatus) onTaskMove(task.id, newStatus);
  }, [onTaskMove]);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {tasksByStatus.map(({ status, tasks: colTasks }) => (
          <KanbanColumn key={status} status={status} tasks={colTasks} onTaskClick={onTaskClick} />
        ))}
      </div>
      <DragOverlay>{activeTask ? <DragOverlayCard task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
