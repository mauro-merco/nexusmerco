'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTaskComments, useTaskAttachments } from '@/lib/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import type { Task, TaskStatus, TaskPriority } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/task-config';
import {
  Loader2, Trash2, Link as LinkIcon, Paperclip,
  Edit3, Calendar, User, Send, MessageSquare,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: () => void;
  users: { id: string; full_name: string; email: string; avatar_url: string; }[];
}

export function TaskDetailModal({ task, open, onOpenChange, onTaskUpdated, onTaskDeleted, users }: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const { comments, addComment, deleteComment } = useTaskComments(task.id);
  const { attachments, addAttachment, removeAttachment } = useTaskAttachments(task.id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [newAttachUrl, setNewAttachUrl] = useState('');
  const [addingAttach, setAddingAttach] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setAssigneeId(task.assignee_id || '');
    setDueDate(task.due_date || '');
    setEditing(false);
    setConfirmDelete(false);
    setSaveError(null);
  }, [task]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        title, description, status, priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      onTaskUpdated(json.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }, [task.id, title, description, status, priority, assigneeId, dueDate, onTaskUpdated]);

  const handleQuickStatus = useCallback(async (newStatus: TaskStatus) => {
    if (newStatus === status) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (res.ok) {
        setStatus(newStatus);
        onTaskUpdated(json.data);
      }
    } catch { /* */ }
  }, [task.id, status, onTaskUpdated]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !user?.id) return;
    setSendingComment(true);
    try {
      await addComment(user.id, newComment.trim());
      setNewComment('');
    } catch { /* */ } finally {
      setSendingComment(false);
    }
  }, [newComment, user?.id, addComment]);

  const handleAddAttachment = useCallback(async () => {
    if (!newAttachUrl.trim()) return;
    setAddingAttach(true);
    try {
      await addAttachment(newAttachUrl.trim());
      setNewAttachUrl('');
    } catch { /* */ } finally {
      setAddingAttach(false);
    }
  }, [newAttachUrl, addAttachment]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (res.ok) { onTaskDeleted(); onOpenChange(false); }
    } finally { setConfirmDelete(false); }
  }, [task.id, confirmDelete, onTaskDeleted, onOpenChange]);

  const sConfig = TASK_STATUS_CONFIG[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 shrink-0 pr-10">
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input value={title} onChange={e => setTitle(e.target.value)} className="text-lg font-bold" />
            ) : (
              <DialogTitle className="text-lg">{task.title}</DialogTitle>
            )}
            <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap text-xs">
              {task.client && <span className="text-muted-foreground">{task.client.name}</span>}
              {task.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
              {task.assignee && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" /> {task.assignee.full_name}
                </span>
              )}
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!editing ? (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  setEditing(false); setSaveError(null);
                  setTitle(task.title); setDescription(task.description);
                  setStatus(task.status); setPriority(task.priority);
                  setAssigneeId(task.assignee_id || ''); setDueDate(task.due_date || '');
                }}>Cancelar</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Status pills */}
        <div className="shrink-0">
          <div className="flex gap-2 flex-wrap">
            {TASK_STATUSES.map(key => {
              const s = TASK_STATUS_CONFIG[key];
              const Icon = s.icon;
              const isActive = status === key;
              return (
                <button key={key} type="button" onClick={() => handleQuickStatus(key)}
                  className={cn('flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all',
                    isActive ? [s.bgColorClass, s.colorClass, 'shadow-md ring-1 ring-current/20 scale-[1.02]'] : 'border-border/40 text-muted-foreground/60 hover:border-border hover:text-muted-foreground')}>
                  <Icon className="h-4 w-4" /> {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* LEFT — Detail + Attachments */}
            <div className="md:col-span-3 space-y-4">
              {editing ? (
                <div className="space-y-3">
                  {saveError && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>}
                  <div className="space-y-1.5">
                    <Label>Descripción</Label>
                    <textarea className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[100px] resize-none"
                      value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prioridad</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {TASK_PRIORITIES.map(key => {
                          const p = TASK_PRIORITY_CONFIG[key];
                          return (
                            <button key={key} type="button" onClick={() => setPriority(key)}
                              className={cn('flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                priority === key ? 'border-current bg-current/10 ' + p.colorClass : 'border-border text-muted-foreground')}>
                              <span className={cn('w-2 h-2 rounded-full', p.dotColor)} /> {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Asignar a</Label>
                      <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}
                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm">
                        <option value="">Sin asignar</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fecha límite</Label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {task.description ? (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Descripción</p>
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin descripción</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className={cn('flex items-center gap-1 font-medium', TASK_PRIORITY_CONFIG[task.priority].colorClass)}>
                      <span className={cn('w-2 h-2 rounded-full', TASK_PRIORITY_CONFIG[task.priority].dotColor)} />
                      Prioridad {TASK_PRIORITY_CONFIG[task.priority].label}
                    </span>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
                  <Paperclip className="h-3 w-3" /> Adjuntos ({attachments.length})
                </p>
                <div className="flex items-center gap-2">
                  <Input placeholder="Pegá un link..." value={newAttachUrl}
                    onChange={e => setNewAttachUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment(); } }}
                    className="h-8 text-xs" />
                  <Button size="sm" onClick={handleAddAttachment} disabled={addingAttach || !newAttachUrl.trim()} className="h-8 shrink-0">
                    {addingAttach ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 hover:bg-muted/50">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 min-w-0 flex-1">
                          <LinkIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-xs font-medium truncate underline decoration-dotted underline-offset-2">{att.url}</span>
                        </a>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0"
                          onClick={() => removeAttachment(att.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Comments */}
            <div className="md:col-span-2 flex flex-col min-h-0 rounded-xl bg-muted/30 border border-border/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1 mb-2 shrink-0">
                <MessageSquare className="h-3 w-3" /> Comentarios ({comments.length})
              </p>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-3 mb-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 italic text-center py-4">Sin comentarios</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="group">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold">{c.user?.full_name || 'Usuario'}</span>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {c.user_id === user?.id && (
                        <button onClick={() => deleteComment(c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input placeholder="Escribí un comentario..." value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  className="h-8 text-xs" />
                <Button size="sm" onClick={handleAddComment} disabled={sendingComment || !newComment.trim()} className="h-8 w-8 p-0 shrink-0">
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 border-t pt-3 mt-2">
          <div className="flex items-center justify-between w-full">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">¿Seguro?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>No</Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Sí, eliminar
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
              </Button>
            )}
            <DialogClose render={<Button variant="outline" />}>Cerrar</DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
