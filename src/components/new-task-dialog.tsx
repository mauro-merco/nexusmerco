'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, TaskRole } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES, PIECE_TYPES, taskTypeLabel } from '@/lib/task-config';
import { TaskRolesPicker, emptyRoles, rolesToList, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { TaskTypePicker } from '@/components/task-type-picker';
import { Loader2 } from 'lucide-react';

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
      setTitle('');
      setDescription('');
      setStatus('en_espera');
      setRoles(emptyRoles());
      setPriority('medium');
      setDueDate('');
      setTaskType('');
      setSelClient('');
      setPiecesStories('');
      setPiecesFeed('');
      setPiecesReels('');
      setError(null);
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
      <DialogContent className="sm:max-w-none sm:w-[90vw] sm:h-[90vh] aspect-[9/16] sm:aspect-auto max-h-[85dvh] sm:max-h-none overflow-hidden flex flex-col">
        <DialogTitle>Nueva Tarea</DialogTitle>
        <DialogDescription>Creá una nueva tarea para el tablero Kanban</DialogDescription>

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 py-2">
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Cliente de la tarea *</Label>
            <select
              value={selClient}
              onChange={e => setSelClient(e.target.value)}
              className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleccioná el cliente de la tarea...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label>
              Tipo de tarea{' '}
              {taskType && <span className="text-muted-foreground font-normal">· {taskTypeLabel(taskType)}</span>}
            </Label>
            <TaskTypePicker value={taskType} onChange={setTaskType} />
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input placeholder="Título de la tarea..." value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-none"
                placeholder="Descripción de la tarea..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <div className="flex gap-2 flex-wrap">
                {TASK_STATUSES.map(key => {
                  const s = TASK_STATUS_CONFIG[key];
                  const Icon = s.icon;
                  return (
                    <button key={key} type="button" onClick={() => setStatus(key)}
                      className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        status === key ? [s.bgColorClass, s.colorClass] : 'border-border text-muted-foreground hover:border-border/60')}>
                      <Icon className="h-4 w-4" /> {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Prioridad</Label>
              <div className="flex gap-2 flex-wrap">
                {TASK_PRIORITIES.map(key => {
                  const p = TASK_PRIORITY_CONFIG[key];
                  return (
                    <button key={key} type="button" onClick={() => setPriority(key)}
                      className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        priority === key ? 'border-current bg-current/10 ' + p.colorClass : 'border-border text-muted-foreground hover:border-border/60')}>
                      <span className={cn('w-2.5 h-2.5 rounded-full', p.dotColor)} /> {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha límite</Label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full max-w-[220px] rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label>Piezas a diseñar</Label>
              <div className="grid grid-cols-3 gap-3">
                {PIECE_TYPES.map(pt => {
                  const Icon = pt.icon;
                  const value = pt.field === 'pieces_stories' ? piecesStories : pt.field === 'pieces_feed' ? piecesFeed : piecesReels;
                  const setValue = pt.field === 'pieces_stories' ? setPiecesStories : pt.field === 'pieces_feed' ? setPiecesFeed : setPiecesReels;
                  return (
                    <div key={pt.field} className="space-y-1">
                      <span className={cn('flex items-center gap-1 text-[11px] font-medium', pt.colorClass)}>
                        <Icon className="h-3 w-3" /> {pt.label}
                      </span>
                      <input type="number" min="0" placeholder="0" value={value}
                        onChange={e => setValue(e.target.value)}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Equipo y roles {totalPeople(roles) > 0 && <span className="text-muted-foreground font-normal">({totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''})</span>}
              </Label>
              <TaskRolesPicker roles={roles} onChange={setRoles} users={users} />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="cta" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Crear Tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
