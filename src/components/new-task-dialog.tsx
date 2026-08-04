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
import type { TaskStatus, TaskPriority } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/task-config';
import { Loader2, User } from 'lucide-react';

interface UserRecord { id: string; full_name: string; email: string; avatar_url: string; }

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  users: UserRecord[];
  onCreateTask: (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    assignee_id?: string;
    author_id?: string;
    priority?: TaskPriority;
    due_date?: string;
  }) => Promise<unknown>;
}

export function NewTaskDialog({ open, onOpenChange, clientId, users, onCreateTask }: NewTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('en_espera');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setStatus('en_espera');
      setAssigneeId('');
      setPriority('medium');
      setDueDate('');
      setError(null);
    }
  }, [open]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Ingresá un título'); return; }
    setSaving(true);
    setError(null);
    try {
      await onCreateTask({
        title: title.trim(),
        description: description.trim(),
        status,
        assignee_id: assigneeId || undefined,
        priority,
        due_date: dueDate || undefined,
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
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Nueva Tarea</DialogTitle>
        <DialogDescription>Creá una nueva tarea para el tablero Kanban</DialogDescription>

        <div className="space-y-4 py-2">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Asignar a</Label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha límite</Label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

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
