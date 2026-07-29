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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { Task, TaskStatus, TaskPriority, TaskComment } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES } from '@/lib/task-config';
import {
  Loader2, Trash2, Link as LinkIcon, Paperclip,
  Edit3, Calendar, User, Send, MessageSquare, Reply, Check, X,
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
  const { comments, addComment, deleteComment, updateComment } = useTaskComments(task.id);
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
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
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
      await addComment(user.id, newComment.trim(), replyTo || undefined);
      setNewComment('');
      setReplyTo(null);
    } catch { /* */ } finally {
      setSendingComment(false);
    }
  }, [newComment, user?.id, addComment, replyTo]);

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
              {task.due_date && (() => {
                const due = new Date(task.due_date + 'T12:00:00');
                const now = new Date();
                const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isSoon = diffDays >= 0 && diffDays <= 3;
                return (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    isOverdue && 'bg-red-500/15 text-red-500',
                    isSoon && !isOverdue && 'bg-amber-500/15 text-amber-500',
                    !isOverdue && !isSoon && 'bg-blue-500/15 text-blue-500',
                  )}>
                    <Calendar className="h-3.5 w-3.5" />
                    FECHA LÍMITE: {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                );
              })()}
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
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className={cn('flex items-center gap-1 font-medium', TASK_PRIORITY_CONFIG[task.priority].colorClass)}>
                      <span className={cn('w-2 h-2 rounded-full', TASK_PRIORITY_CONFIG[task.priority].dotColor)} />
                      Prioridad {TASK_PRIORITY_CONFIG[task.priority].label}
                    </span>
                    {task.due_date && (() => {
                      const due = new Date(task.due_date + 'T12:00:00');
                      const now = new Date();
                      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = diffDays < 0;
                      const isSoon = diffDays >= 0 && diffDays <= 3;
                      return (
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          isOverdue && 'bg-red-500/15 text-red-500',
                          isSoon && !isOverdue && 'bg-amber-500/15 text-amber-500',
                          !isOverdue && !isSoon && 'bg-blue-500/15 text-blue-500',
                        )}>
                          <Calendar className="h-3 w-3" />
                          {isOverdue ? 'VENCIDA' : 'FECHA LÍMITE'} {due.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      );
                    })()}
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
            <div className="md:col-span-2 flex flex-col min-h-0 rounded-xl bg-muted/30 border border-border/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1.5 mb-3 shrink-0">
                <MessageSquare className="h-3.5 w-3.5" /> Comentarios ({comments.length})
              </p>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-4 mb-3">
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground/50 italic text-center py-6">Sin comentarios</p>
                )}
                {comments.map(c => (
                  <TaskCommentItem
                    key={c.id}
                    comment={c}
                    currentUserId={user?.id}
                    onReply={setReplyTo}
                    onDelete={deleteComment}
                    editingCommentId={editingCommentId}
                    setEditingCommentId={setEditingCommentId}
                    editCommentContent={editCommentContent}
                    setEditCommentContent={setEditCommentContent}
                    saveCommentEdit={async (id) => {
                      if (!editCommentContent.trim()) return;
                      setSavingCommentEdit(true);
                      try { await updateComment(id, editCommentContent.trim()); setEditingCommentId(null); } catch { /* */ } finally { setSavingCommentEdit(false); }
                    }}
                    cancelCommentEdit={() => { setEditingCommentId(null); setEditCommentContent(''); }}
                    savingCommentEdit={savingCommentEdit}
                  />
                ))}
              </div>
              <div className="space-y-2 shrink-0 border-t border-border/30 pt-3">
                {replyTo && (() => {
                  const findReplyTarget = (list: typeof comments): typeof comments[0] | undefined => {
                    for (const c of list) {
                      if (c.id === replyTo) return c;
                      if (c.replies) { const found = findReplyTarget(c.replies); if (found) return found; }
                    }
                    return undefined;
                  };
                  const target = findReplyTarget(comments);
                  return target ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                      <Reply className="h-3 w-3" />
                      <span>Respondiendo a <strong>{target.user?.full_name || 'Usuario'}</strong></span>
                      <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-2">
                  <Input placeholder={replyTo ? 'Escribí tu respuesta...' : 'Escribí un comentario...'} value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                    className="flex-1 h-9 text-sm" disabled={sendingComment} />
                  <Button size="sm" onClick={handleAddComment} disabled={sendingComment || !newComment.trim()} className="h-9 w-9 p-0 shrink-0">
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
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

function TaskCommentItem({
  comment,
  currentUserId,
  onReply,
  onDelete,
  editingCommentId,
  setEditingCommentId,
  editCommentContent,
  setEditCommentContent,
  saveCommentEdit,
  cancelCommentEdit,
  savingCommentEdit,
  isReply,
}: {
  comment: TaskComment;
  currentUserId?: string;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editCommentContent: string;
  setEditCommentContent: (v: string) => void;
  saveCommentEdit: (id: string) => void;
  cancelCommentEdit: () => void;
  savingCommentEdit: boolean;
  isReply?: boolean;
}) {
  const isOwn = currentUserId === comment.user_id;
  const isEditing = editingCommentId === comment.id;
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        <Avatar className={cn('shrink-0 mt-0.5', isReply ? 'h-7 w-7' : 'h-9 w-9')}>
          <AvatarImage src={comment.user?.avatar_url} />
          <AvatarFallback className={cn('font-semibold', isReply ? 'text-[10px]' : 'text-xs')}>
            {comment.user?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', isReply ? 'text-xs' : 'text-sm')}>{comment.user?.full_name || 'Usuario'}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          </div>
          {isEditing ? (
            <div className="mt-1.5 space-y-1.5">
              <Input
                value={editCommentContent}
                onChange={(e) => setEditCommentContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCommentEdit(comment.id); } if (e.key === 'Escape') cancelCommentEdit(); }}
                className="h-9 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => saveCommentEdit(comment.id)} disabled={savingCommentEdit || !editCommentContent.trim()}>
                  {savingCommentEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={cancelCommentEdit}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn('text-foreground/80 mt-1 whitespace-pre-wrap leading-relaxed', isReply ? 'text-sm' : 'text-sm')}>{comment.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => onReply(comment.id)}>
                  <Reply className="h-3 w-3" /> Responder
                </Button>
              )}
              {isOwn && (
                <>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }}>
                    <Edit3 className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-red-400 hover:text-red-600 gap-1"
                    onClick={() => onDelete(comment.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-2 space-y-3 border-l-2 border-border/30 pl-4">
          {comment.replies.map(reply => (
            <TaskCommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReply
              onReply={onReply}
              onDelete={onDelete}
              editingCommentId={editingCommentId}
              setEditingCommentId={setEditingCommentId}
              editCommentContent={editCommentContent}
              setEditCommentContent={setEditCommentContent}
              saveCommentEdit={saveCommentEdit}
              cancelCommentEdit={cancelCommentEdit}
              savingCommentEdit={savingCommentEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}
