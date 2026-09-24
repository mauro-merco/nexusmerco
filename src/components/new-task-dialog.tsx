'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, TaskRole } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES, PIECE_TYPES, taskTypeLabel } from '@/lib/task-config';
import { TaskRolesPicker, emptyRoles, rolesToList, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { TaskTypePicker } from '@/components/task-type-picker';
import { Loader2, Calendar, Users2, ListChecks, LayoutList } from 'lucide-react';

interface UserRecord { id: string; full_name: string; email: string; avatar_url: string; }

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  users: UserRecord[];
  onCreateTask: (data: {
    client_id: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    assignees?: { id: string; role: TaskRole }[];
    author_id?: string;
    priority?: TaskPriority;
    due_date?: string;
    task_type?: string;
    pieces_stories?: number | null;
    pieces_feed?: number | null;
    pieces_reels?: number | null;
  }) => Promise<unknown>;
}

export function NewTaskDialog({ open, onOpenChange, clients, users, onCreateTask }: NewTaskDialogProps) {
  const [selClient, setSelClient] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('en_espera');
  const [roles, setRoles] = useState<TaskRolesState>(emptyRoles());
  const [taskType, setTaskType] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [piecesStories, setPiecesStories] = useState('');
  const [piecesFeed, setPiecesFeed] = useState('');
  const [piecesReels, setPiecesReels] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(''); setDescription(''); setStatus('en_espera'); setRoles(emptyRoles());
      setPriority('medium'); setDueDate(''); setTaskType(''); setSelClient('');
      setPiecesStories(''); setPiecesFeed(''); setPiecesReels(''); setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!selClient) { setError('Seleccioná el cliente de la tarea'); return; }
    if (!title.trim()) { setError('Ingresá un título'); return; }
    if (!roles.lead.length || !roles.executor.length || !roles.reviewer.length) {
      setError('Asigná al menos una persona como responsable, ejecutor y control');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreateTask({
        client_id: selClient,
        title: title.trim(),
        description: description.trim(),
        status,
        assignees: rolesToList(roles),
        priority,
        due_date: dueDate || undefined,
        task_type: taskType || undefined,
        pieces_stories: piecesStories.trim() === '' ? null : Number(piecesStories),
        pieces_feed: piecesFeed.trim() === '' ? null : Number(piecesFeed),
        pieces_reels: piecesReels.trim() === '' ? null : Number(piecesReels),
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg md:w-[min(92vw,760px)] md:max-w-none rounded-2xl p-0">
        <div className="px-6 pt-6 pb-4">
          <DialogTitle>Nueva Tarea</DialogTitle>
          <DialogDescription>Creá una nueva tarea para el tablero Kanban</DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* Cliente + título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <select
              value={selClient}
              onChange={e => setSelClient(e.target.value)}
              className="w-full rounded-xl bg-muted/35 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">Seleccioná el cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input placeholder="Título de la tarea..." value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl bg-muted/35 border-0 h-[42px]" />
          </div>

          <textarea
            className="w-full rounded-xl bg-muted/30 px-3.5 py-3 text-sm placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
            placeholder="Descripción de la tarea..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Tipo de tarea */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <LayoutList className="h-3.5 w-3.5" /> Tipo de tarea
              {taskType && <span className="text-muted-foreground/70 font-normal">· {taskTypeLabel(taskType)}</span>}
            </div>
            <TaskTypePicker value={taskType} onChange={setTaskType} />
          </div>

          {/* Estado / Prioridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Estado</div>
              <div className="flex gap-1.5 flex-wrap">
                {TASK_STATUSES.map(key => {
                  const s = TASK_STATUS_CONFIG[key];
                  const Icon = s.icon;
                  return (
                    <button key={key} type="button" onClick={() => setStatus(key)}
                      className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                        status === key ? [s.bgColorClass, s.colorClass, 'font-semibold'] : 'bg-muted/40 text-muted-foreground hover:bg-muted/60')}>
                      <Icon className="h-3.5 w-3.5" /> {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Prioridad</div>
              <div className="flex gap-1.5 flex-wrap">
                {TASK_PRIORITIES.map(key => {
                  const p = TASK_PRIORITY_CONFIG[key];
                  return (
                    <button key={key} type="button" onClick={() => setPriority(key)}
                      className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                        priority === key ? cn('bg-current/10 font-semibold', p.colorClass) : 'bg-muted/40 text-muted-foreground hover:bg-muted/60')}>
                      <span className={cn('w-2 h-2 rounded-full', p.dotColor)} /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Fecha + piezas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> Fecha límite</div>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-xl bg-muted/35 px-3 py-2.5 text-sm outline-none" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground">Piezas a diseñar</div>
              <div className="grid grid-cols-3 gap-2">
                {PIECE_TYPES.map(pt => {
                  const Icon = pt.icon;
                  const value = pt.field === 'pieces_stories' ? piecesStories : pt.field === 'pieces_feed' ? piecesFeed : piecesReels;
                  const setValue = pt.field === 'pieces_stories' ? setPiecesStories : pt.field === 'pieces_feed' ? setPiecesFeed : setPiecesReels;
                  return (
                    <div key={pt.field} className="space-y-1">
                      <span className={cn('flex items-center gap-1 text-[10px] font-medium', pt.colorClass)}><Icon className="h-3 w-3" /> {pt.label}</span>
                      <input type="number" min="0" placeholder="0" value={value} onChange={e => setValue(e.target.value)}
                        className="w-full rounded-lg bg-muted/35 px-2.5 py-1.5 text-sm outline-none" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users2 className="h-3.5 w-3.5" /> Equipo y roles
              {totalPeople(roles) > 0 && <span className="text-muted-foreground/70 font-normal">({totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''})</span>}
            </div>
            <TaskRolesPicker roles={roles} onChange={setRoles} users={users} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border/40">
          <DialogClose render={<Button variant="outline" className="rounded-lg" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="default" disabled={saving} className="rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Crear Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
