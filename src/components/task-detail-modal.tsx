'use client';

import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTaskComments, useTaskAttachments } from '@/lib/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MentionedText, MentionTextarea } from '@/components/mention';
import { MarkdownBody } from '@/lib/markdown';
import type { Task, TaskStatus, TaskPriority, TaskComment, TaskDepartment } from '@/lib/types';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES, PIECE_TYPES, taskPieceTotal, TASK_ROLE_CONFIG, TASK_ROLES, taskTypeInfo } from '@/lib/task-config';
import { TaskRolesPicker, rolesToList, rolesFromAssignees, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { TaskTypePicker } from '@/components/task-type-picker';
import { DepartmentPicker } from '@/components/department-picker';
import { departmentInfo } from '@/lib/department-config';
import { MaterialLinks } from '@/components/material-links';
import { CommentReadEye } from '@/components/comment-read';
import { useCommentReads, collectCommentIds, type CommentReader } from '@/lib/hooks/use-comment-reads';
import {
  Loader2, Trash2, Link as LinkIcon, Paperclip, Edit3, Calendar, Send, MessageSquare, Reply, Check, X, Layers,
  Share2, Copy, Globe, Lock, AlertTriangle, ChevronDown, FileText, Users2, Flag, Boxes, Tag, FolderOpen, Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TaskDetailModalProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: (task: Task) => void;
  onTaskDeleted: () => void;
  users: { id: string; full_name: string; email: string; avatar_url: string; }[];
}

/* ---------- small building blocks ---------- */

type MenuOption = { key: string; label: string; icon?: LucideIcon; colorClass?: string; bgClass?: string; dot?: string };

function Menu({ value, options, onChange, disabled, loading, className, align = 'left' }: {
  value: string; options: MenuOption[]; onChange: (k: string) => void;
  disabled?: boolean; loading?: boolean; className?: string; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const cur = options.find(o => o.key === value) || options[0];
  const CurIcon = cur.icon;
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(v => !v)}
        className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors', cur.bgClass || 'bg-muted/50', cur.colorClass, className)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : CurIcon ? <CurIcon className="h-4 w-4 shrink-0" /> : cur.dot ? <span className={cn('h-2 w-2 rounded-full', cur.dot)} /> : null}
        <span className="flex-1 truncate text-left">{cur.label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={cn('absolute top-full z-50 mt-1.5 max-h-[320px] min-w-full w-max overflow-auto rounded-2xl bg-popover p-1.5 shadow-xl [scrollbar-width:thin]', align === 'right' ? 'right-0' : 'left-0')}>
            {options.map(o => {
              const I = o.icon;
              return (
                <button key={o.key} type="button" onClick={() => { setOpen(false); onChange(o.key); }}
                  className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-muted/60', o.colorClass, o.key === value && 'bg-muted/50')}>
                  {I ? <I className="h-4 w-4 shrink-0" /> : o.dot ? <span className={cn('h-2 w-2 rounded-full', o.dot)} /> : null}
                  <span className="flex-1 whitespace-nowrap">{o.label}</span>
                  {o.key === value && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_OPTIONS: MenuOption[] = TASK_STATUSES.map(k => {
  const s = TASK_STATUS_CONFIG[k];
  return { key: k, label: s.label, icon: s.icon, colorClass: s.colorClass, bgClass: s.bgColorClass };
});
const PRIORITY_OPTIONS: MenuOption[] = TASK_PRIORITIES.map(k => {
  const p = TASK_PRIORITY_CONFIG[k];
  return { key: k, label: p.label, dot: p.dotColor, colorClass: p.colorClass };
});

function Module({ icon: Icon, title, tone = 'text-muted-foreground', toneBg = 'bg-muted/60', right, children, className }: {
  icon: LucideIcon; title: string; tone?: string; toneBg?: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-2xl bg-muted/25 p-4', className)}>
      <header className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', toneBg)}><Icon className={cn('h-3.5 w-3.5', tone)} /></span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</h3>
        {right && <div className="ml-auto">{right}</div>}
      </header>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-sm font-medium">{children}</div>
    </div>
  );
}

const fieldCls = 'w-full rounded-xl bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

function dueChip(dueDate: string, short = false) {
  const due = new Date(dueDate + 'T12:00:00');
  const diff = Math.ceil((due.getTime() - Date.now()) / 86400000);
  const overdue = diff < 0, soon = diff >= 0 && diff <= 3;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      overdue ? 'bg-red-500/15 text-red-500' : soon ? 'bg-amber-500/15 text-amber-600' : 'bg-blue-500/15 text-blue-500')}>
      <Calendar className="h-3.5 w-3.5" />
      {overdue ? 'Vencida ' : short ? '' : 'Límite '}{due.toLocaleDateString('es-AR', { day: 'numeric', month: short ? 'short' : 'long', year: 'numeric' })}
    </span>
  );
}

/* ---------- modal ---------- */

export function TaskDetailModal({ task, open, onOpenChange, onTaskUpdated, onTaskDeleted, users }: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const { comments, addComment, deleteComment, updateComment } = useTaskComments(task.id);
  const { attachments, addAttachment, removeAttachment } = useTaskAttachments(task.id);
  const commentIds = useMemo(() => collectCommentIds(comments), [comments]);
  const reads = useCommentReads('task_comment', commentIds, user ? { id: user.id, name: user.full_name || '' } : null);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [roles, setRoles] = useState<TaskRolesState>(() => rolesFromAssignees(task.assignees));
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [taskType, setTaskType] = useState(task.task_type || '');
  const [department, setDepartment] = useState<TaskDepartment | null>(task.department || null);
  const [startDate, setStartDate] = useState(task.start_date || '');
  const [isUrgent, setIsUrgent] = useState(!!task.is_urgent);
  const [piecesStories, setPiecesStories] = useState(task.pieces_stories != null ? String(task.pieces_stories) : '');
  const [piecesFeed, setPiecesFeed] = useState(task.pieces_feed != null ? String(task.pieces_feed) : '');
  const [piecesReels, setPiecesReels] = useState(task.pieces_reels != null ? String(task.pieces_reels) : '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [savingCommentEdit, setSavingCommentEdit] = useState(false);
  const [newAttachUrl, setNewAttachUrl] = useState('');
  const [addingAttach, setAddingAttach] = useState(false);

  const [problemNote, setProblemNote] = useState(task.problem_note || '');
  const [needsMaterial, setNeedsMaterial] = useState(!!task.needs_client_material);
  const [materialNote, setMaterialNote] = useState(task.client_material_note || '');
  const [problemPrompt, setProblemPrompt] = useState<null | { note: string }>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [savingProblem, setSavingProblem] = useState(false);

  const resetFields = useCallback(() => {
    setTitle(task.title); setDescription(task.description); setStatus(task.status); setPriority(task.priority);
    setRoles(rolesFromAssignees(task.assignees)); setDueDate(task.due_date || ''); setTaskType(task.task_type || '');
    setDepartment(task.department || null); setStartDate(task.start_date || ''); setIsUrgent(!!task.is_urgent);
    setPiecesStories(task.pieces_stories != null ? String(task.pieces_stories) : '');
    setPiecesFeed(task.pieces_feed != null ? String(task.pieces_feed) : '');
    setPiecesReels(task.pieces_reels != null ? String(task.pieces_reels) : '');
    setProblemNote(task.problem_note || ''); setNeedsMaterial(!!task.needs_client_material);
    setMaterialNote(task.client_material_note || '');
  }, [task]);

  useEffect(() => {
    resetFields();
    setProblemPrompt(null); setEditing(false); setConfirmDelete(false); setSaveError(null); setShareOpen(false); setCopied(false);
  }, [task, resetFields]);

  const handleSave = useCallback(async () => {
    setSaving(true); setSaveError(null);
    try {
      if (!roles.lead.length || !roles.executor.length || !roles.reviewer.length) throw new Error('Asigná al menos una persona como responsable, ejecutor y control');
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, status, priority, assignees: rolesToList(roles), department,
          start_date: startDate || null, is_urgent: isUrgent, due_date: dueDate || null, task_type: taskType || null,
          needs_client_material: needsMaterial, client_material_note: needsMaterial ? materialNote : '',
          pieces_stories: piecesStories.trim() === '' ? null : Number(piecesStories),
          pieces_feed: piecesFeed.trim() === '' ? null : Number(piecesFeed),
          pieces_reels: piecesReels.trim() === '' ? null : Number(piecesReels),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      onTaskUpdated(json.data); setEditing(false);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Error'); } finally { setSaving(false); }
  }, [task.id, title, description, status, priority, roles, department, startDate, isUrgent, dueDate, taskType, piecesStories, piecesFeed, piecesReels, needsMaterial, materialNote, onTaskUpdated]);

  const handleQuickStatus = useCallback(async (newStatus: TaskStatus) => {
    if (newStatus === status || changingStatus) return;
    if (newStatus === 'problemas') { setProblemPrompt({ note: problemNote }); return; }
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const json = await res.json();
      if (res.ok) { setStatus(newStatus); onTaskUpdated(json.data); }
    } catch { /* */ } finally { setChangingStatus(false); }
  }, [task.id, status, changingStatus, problemNote, onTaskUpdated]);

  const saveProblem = useCallback(async () => {
    const note = (problemPrompt?.note || '').trim();
    if (!note) return;
    setSavingProblem(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'problemas', problem_note: note }) });
      const json = await res.json();
      if (res.ok) { setStatus('problemas'); setProblemNote(note); setProblemPrompt(null); onTaskUpdated(json.data); }
    } catch { /* */ } finally { setSavingProblem(false); }
  }, [task.id, problemPrompt, onTaskUpdated]);

  const handleAddComment = useCallback(async () => {
    if (!newComment.trim() || !user?.id) return;
    setSendingComment(true);
    try { await addComment(user.id, newComment.trim(), replyTo || undefined); setNewComment(''); setReplyTo(null); } catch { /* */ } finally { setSendingComment(false); }
  }, [newComment, user?.id, addComment, replyTo]);

  const handleAddAttachment = useCallback(async () => {
    if (!newAttachUrl.trim()) return;
    setAddingAttach(true);
    try { await addAttachment(newAttachUrl.trim()); setNewAttachUrl(''); } catch { /* */ } finally { setAddingAttach(false); }
  }, [newAttachUrl, addAttachment]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' }); if (res.ok) { onTaskDeleted(); onOpenChange(false); } } finally { setConfirmDelete(false); }
  }, [task.id, confirmDelete, onTaskDeleted, onOpenChange]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/t/${task.share_token}` : '';
  const handleTogglePublic = useCallback(async () => {
    setTogglingPublic(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_public: !task.is_public }) });
      const json = await res.json();
      if (res.ok) onTaskUpdated(json.data);
    } finally { setTogglingPublic(false); }
  }, [task.id, task.is_public, onTaskUpdated]);
  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [shareUrl]);

  const pieceValues = { pieces_stories: [piecesStories, setPiecesStories], pieces_feed: [piecesFeed, setPiecesFeed], pieces_reels: [piecesReels, setPiecesReels] } as const;
  const typeInfo = taskTypeInfo(task.task_type);
  const dept = departmentInfo(department);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Full-window task view */}
      <DialogContent className="flex! h-dvh w-screen max-w-none! flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none">
        {/* ===== Header ===== */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-muted/20 px-5 py-3 pr-14">
          <div className="min-w-[220px] flex-1">
            {editing ? (
              <Input value={title} onChange={e => setTitle(e.target.value)} className="h-10 rounded-xl border-0 bg-background/70 text-lg font-bold" />
            ) : (
              <DialogTitle className="truncate text-lg font-bold">{task.title}</DialogTitle>
            )}
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              {task.client && <span className="rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">{task.client.name}</span>}
              {task.due_date && dueChip(task.due_date)}
            </DialogDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="w-[230px]">
              <Menu value={status} options={STATUS_OPTIONS} onChange={k => handleQuickStatus(k as TaskStatus)} loading={changingStatus} disabled={changingStatus} align="right" />
            </div>
            <div className="relative">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setShareOpen(v => !v)}><Share2 className="h-4 w-4" /></Button>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-80 space-y-3 rounded-2xl bg-popover p-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-semibold"><Share2 className="h-3.5 w-3.5" /> Compartir tarea</span>
                      <button onClick={() => setShareOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" onClick={handleTogglePublic} disabled={togglingPublic}
                      className="flex w-full items-center justify-between gap-2 rounded-xl bg-muted/35 px-3 py-2 text-left transition-colors hover:bg-muted/55">
                      <span className="flex items-center gap-2 text-xs">
                        {task.is_public ? <Globe className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span>
                          <span className="font-medium">{task.is_public ? 'Pública' : 'Privada'}</span>
                          <span className="block text-[10px] text-muted-foreground">{task.is_public ? 'Cualquiera con el link puede verla' : 'Solo usuarios @mercodigital.com'}</span>
                        </span>
                      </span>
                      {togglingPublic ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <span className="shrink-0 text-[10px] text-primary">Cambiar</span>}
                    </button>
                    <div className="flex items-center gap-2">
                      <Input value={shareUrl} readOnly className="h-8 rounded-lg border-0 bg-muted/35 text-xs" onFocus={e => e.target.select()} />
                      <Button size="sm" onClick={handleCopyLink} className="h-8 shrink-0 rounded-lg">{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {!editing ? (
              <Button size="sm" variant="secondary" className="gap-1.5 rounded-lg" onClick={() => setEditing(true)}><Edit3 className="h-3.5 w-3.5" /> Editar</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => { setEditing(false); setSaveError(null); resetFields(); }}>Cancelar</Button>
                <Button size="sm" className="rounded-lg" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar cambios
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ===== Body: main | properties | comments ===== */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_300px_minmax(320px,400px)] lg:overflow-hidden">
          {/* MAIN */}
          <div className="space-y-4 lg:min-h-0 lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]">
            {saveError && <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>}

            {status === 'problemas' && !problemPrompt && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Problema</p>
                  {problemNote ? <MarkdownBody text={problemNote} className="mt-1 text-sm text-foreground/85" /> : <p className="mt-1 text-sm italic text-muted-foreground">Sin descripción</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={() => setProblemPrompt({ note: problemNote })}><Edit3 className="mr-1 h-3 w-3" /> Editar</Button>
              </div>
            )}
            {problemPrompt && (
              <div className="space-y-2 rounded-2xl bg-red-500/5 p-4 ring-1 ring-red-500/30">
                <Label htmlFor="task-problem-note" className="text-red-600 dark:text-red-400">¿Cuál es el problema?</Label>
                <textarea id="task-problem-note" autoFocus value={problemPrompt.note}
                  onChange={e => setProblemPrompt({ note: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveProblem(); } if (e.key === 'Escape') setProblemPrompt(null); }}
                  placeholder="Describí qué está pasando y qué bloquea la tarea..."
                  className="min-h-[70px] w-full resize-none rounded-xl bg-background/70 px-3 py-2 text-sm outline-none" />
                <div className="flex items-center gap-1.5">
                  <Button size="sm" className="h-8 rounded-lg" onClick={saveProblem} disabled={savingProblem || !problemPrompt.note.trim()}>
                    {savingProblem && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 rounded-lg" onClick={() => setProblemPrompt(null)} disabled={savingProblem}>Cancelar</Button>
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl + Enter</span>
                </div>
              </div>
            )}

            {editing ? (
              <>
                <Module icon={Tag} title="Tipo y departamento" tone="text-pink-600" toneBg="bg-pink-500/15">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Tipo de tarea {taskType && <span className="font-normal text-muted-foreground">· {taskTypeInfo(taskType)?.label}</span>}</Label>
                      <TaskTypePicker value={taskType} onChange={setTaskType} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Departamento responsable</Label>
                      <DepartmentPicker value={department} onChange={setDepartment} />
                    </div>
                  </div>
                </Module>
                <Module icon={FileText} title="Descripción" tone="text-blue-600" toneBg="bg-blue-500/15">
                  <textarea className={cn(fieldCls, 'min-h-[180px] resize-y')} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción..." />
                </Module>
                <Module icon={Users2} title={`Equipo y roles${totalPeople(roles) > 0 ? ` · ${totalPeople(roles)}` : ''}`} tone="text-violet-600" toneBg="bg-violet-500/15">
                  <TaskRolesPicker roles={roles} onChange={setRoles} users={users} />
                </Module>
                <Module icon={AlertTriangle} title="Material del cliente" tone="text-red-600" toneBg="bg-red-500/15">
                  <label className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    <input type="checkbox" checked={needsMaterial} onChange={e => setNeedsMaterial(e.target.checked)} /> Necesito material del cliente
                  </label>
                  {needsMaterial && (
                    <textarea value={materialNote} onChange={e => setMaterialNote(e.target.value)} rows={2}
                      placeholder="Qué material se necesita para esta tarea..." className={cn(fieldCls, 'mt-2 min-h-[60px] resize-none')} />
                  )}
                </Module>
              </>
            ) : (
              <>
                {task.needs_client_material && (
                  <div className="rounded-2xl bg-red-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black uppercase text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4" /> Necesito material del cliente</p>
                    {task.client_material_note && <MarkdownBody text={task.client_material_note} className="mt-2 text-sm text-foreground/85" />}
                  </div>
                )}
                <Module icon={FileText} title="Descripción" tone="text-blue-600" toneBg="bg-blue-500/15">
                  {task.description
                    ? <MarkdownBody text={task.description} className="text-sm leading-relaxed text-foreground/85" />
                    : <p className="text-sm italic text-muted-foreground">Sin descripción</p>}
                </Module>
              </>
            )}

            <Module icon={FolderOpen} title="Material de la tarea" tone="text-indigo-600" toneBg="bg-indigo-500/15">
              <MaterialLinks entityType="task" entityId={task.id} />
            </Module>

            <Module icon={Paperclip} title={`Adjuntos (${attachments.length})`} tone="text-emerald-600" toneBg="bg-emerald-500/15">
              <div className="flex items-center gap-2">
                <Input placeholder="Pegá un link..." value={newAttachUrl} onChange={e => setNewAttachUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment(); } }}
                  className="h-9 rounded-xl border-0 bg-background/70 text-sm" />
                <Button size="sm" onClick={handleAddAttachment} disabled={addingAttach || !newAttachUrl.trim()} className="h-9 shrink-0 rounded-xl">
                  {addingAttach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between gap-2 rounded-xl bg-background/60 p-2 hover:bg-background">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span className="truncate text-xs font-medium">{att.url}</span>
                      </a>
                      <Button variant="ghost" size="sm" className="h-6 w-6 shrink-0 rounded-lg p-0 text-red-400 hover:text-red-600" onClick={() => removeAttachment(att.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Module>
          </div>

          {/* PROPERTIES */}
          <aside className="space-y-4 lg:min-h-0 lg:overflow-y-auto [scrollbar-width:thin]">
            <Module icon={Flag} title="Prioridad" tone="text-orange-600" toneBg="bg-orange-500/15">
              {editing
                ? <Menu value={priority} options={PRIORITY_OPTIONS} onChange={k => setPriority(k as TaskPriority)} />
                : <span className={cn('flex items-center gap-2 text-sm font-semibold', TASK_PRIORITY_CONFIG[task.priority].colorClass)}>
                    <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_CONFIG[task.priority].dotColor)} /> {TASK_PRIORITY_CONFIG[task.priority].label}
                  </span>}
            </Module>

            <Module icon={Clock} title="Plazos" tone="text-blue-600" toneBg="bg-blue-500/15">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1"><Label className="text-xs">Inicio</Label>
                    <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className={fieldCls} /></div>
                  <div className="space-y-1"><Label className="text-xs">Vencimiento</Label>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={fieldCls} /></div>
                  {department && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <input type="checkbox" checked={isUrgent} onChange={e => setIsUrgent(e.target.checked)} />
                      Urgente (SLA {isUrgent ? dept?.urgentSlaHours : dept?.slaHours}hs)
                    </label>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  <Row label="Inicio">{task.start_date ? new Date(task.start_date).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : <span className="text-muted-foreground">—</span>}</Row>
                  <Row label="Vencimiento">{task.due_date ? dueChip(task.due_date, true) : <span className="text-muted-foreground">—</span>}</Row>
                  {task.is_urgent && <Row label="Urgencia"><span className="text-amber-600">Urgente</span></Row>}
                </div>
              )}
            </Module>

            {!editing && (
              <Module icon={Tag} title="Clasificación" tone="text-pink-600" toneBg="bg-pink-500/15">
                <div className="divide-y divide-border/30">
                  <Row label="Tipo">{typeInfo ? <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold', typeInfo.category.bgColorClass, typeInfo.category.colorClass)}><typeInfo.category.icon className="h-3 w-3" />{typeInfo.label}</span> : <span className="text-muted-foreground">—</span>}</Row>
                  <Row label="Departamento">{task.department ? departmentInfo(task.department)?.label : <span className="text-muted-foreground">—</span>}</Row>
                </div>
              </Module>
            )}

            <Module icon={Boxes} title={`Piezas${!editing && taskPieceTotal(task) > 0 ? ` · ${taskPieceTotal(task)}` : ''}`} tone="text-violet-600" toneBg="bg-violet-500/15">
              {editing ? (
                <div className="grid grid-cols-3 gap-2">
                  {PIECE_TYPES.map(pt => {
                    const Icon = pt.icon; const [val, set] = pieceValues[pt.field];
                    return (
                      <div key={pt.field} className="space-y-1">
                        <span className={cn('flex items-center gap-1 truncate text-[10px] font-medium', pt.colorClass)}><Icon className="h-3 w-3 shrink-0" /> {pt.label.split(' ')[0]}</span>
                        <input type="number" min="0" placeholder="0" value={val} onChange={e => set(e.target.value)} className={fieldCls} />
                      </div>
                    );
                  })}
                </div>
              ) : taskPieceTotal(task) > 0 ? (
                <div className="divide-y divide-border/30">
                  {PIECE_TYPES.map(pt => { const n = task[pt.field]; if (!n) return null; const Icon = pt.icon;
                    return <Row key={pt.field} label={pt.label}><span className={cn('inline-flex items-center gap-1', pt.colorClass)}><Icon className="h-3 w-3" />{n}</span></Row>; })}
                </div>
              ) : <p className="text-xs text-muted-foreground">Sin piezas definidas</p>}
            </Module>

            {!editing && (
              <Module icon={Users2} title="Equipo" tone="text-violet-600" toneBg="bg-violet-500/15">
                {task.assignees && task.assignees.length > 0 ? (
                  <div className="space-y-2">
                    {TASK_ROLES.map(rk => {
                      const members = task.assignees.filter(a => a.task_role === rk);
                      if (!members.length) return null;
                      const cfg = TASK_ROLE_CONFIG[rk]; const Icon = cfg.icon;
                      return (
                        <div key={rk} className="rounded-xl bg-background/60 px-3 py-2">
                          <p className={cn('flex items-center gap-1.5 text-[11px] font-semibold', cfg.colorClass)}><Icon className="h-3 w-3" /> {cfg.label}</p>
                          <p className="mt-0.5 text-xs text-foreground/80">{Array.from(new Set(members.map(m => m.full_name))).join(', ')}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Sin asignar</p>}
              </Module>
            )}
          </aside>

          {/* COMMENTS */}
          <div className="flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-2xl bg-muted/25 p-4 lg:h-auto">
            <p className="mb-3 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15"><MessageSquare className="h-3.5 w-3.5 text-sky-600" /></span>
              Comentarios ({comments.length})
            </p>
            <div className="mb-3 min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:thin]">
              {comments.length === 0 && <p className="py-6 text-center text-sm italic text-muted-foreground/50">Sin comentarios</p>}
              {comments.map(c => (
                <TaskCommentItem key={c.id} comment={c} currentUserId={user?.id} onReply={setReplyTo} onDelete={deleteComment}
                  editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId}
                  editCommentContent={editCommentContent} setEditCommentContent={setEditCommentContent}
                  saveCommentEdit={async (id) => {
                    if (!editCommentContent.trim()) return;
                    setSavingCommentEdit(true);
                    try { await updateComment(id, editCommentContent.trim()); setEditingCommentId(null); } catch { /* */ } finally { setSavingCommentEdit(false); }
                  }}
                  cancelCommentEdit={() => { setEditingCommentId(null); setEditCommentContent(''); }}
                  savingCommentEdit={savingCommentEdit} readers={reads.readers} onToggleRead={reads.toggle} readPendingId={reads.pending} />
              ))}
            </div>
            <div className="shrink-0 space-y-2 pt-3">
              {replyTo && (() => {
                const find = (list: TaskComment[]): TaskComment | undefined => {
                  for (const c of list) { if (c.id === replyTo) return c; if (c.replies) { const f = find(c.replies); if (f) return f; } }
                  return undefined;
                };
                const target = find(comments);
                return target ? (
                  <div className="flex items-center gap-2 rounded-lg bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                    <Reply className="h-3 w-3" /><span>Respondiendo a <strong>{target.user?.full_name || 'Usuario'}</strong></span>
                    <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground"><X className="h-3 w-3" /></button>
                  </div>
                ) : null;
              })()}
              <div className="flex items-end gap-2">
                <MentionTextarea value={newComment} onChange={setNewComment} users={users}
                  placeholder={replyTo ? 'Escribí tu respuesta...' : 'Escribí un comentario... (usá @ para mencionar)'}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  rows={1} disabled={sendingComment} />
                <Button size="sm" onClick={handleAddComment} disabled={sendingComment || !newComment.trim()} className="h-9 w-9 shrink-0 rounded-lg p-0">
                  {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Footer ===== */}
        <div className="flex shrink-0 items-center justify-between bg-muted/20 px-5 py-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">¿Seguro?</span>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setConfirmDelete(false)}>No</Button>
              <Button variant="destructive" size="sm" className="gap-1 rounded-lg" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /> Sí, eliminar</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="rounded-lg text-red-500 hover:text-red-600" onClick={handleDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar</Button>
          )}
          <DialogClose render={<Button variant="outline" className="rounded-lg" />}>Cerrar</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TaskCommentItem({
  comment, currentUserId, onReply, onDelete,
  editingCommentId, setEditingCommentId, editCommentContent, setEditCommentContent,
  saveCommentEdit, cancelCommentEdit, savingCommentEdit, isReply,
  readers, onToggleRead, readPendingId,
}: {
  comment: TaskComment; currentUserId?: string; onReply: (parentId: string) => void; onDelete: (id: string) => void;
  editingCommentId: string | null; setEditingCommentId: (id: string | null) => void;
  editCommentContent: string; setEditCommentContent: (v: string) => void;
  saveCommentEdit: (id: string) => void; cancelCommentEdit: () => void; savingCommentEdit: boolean; isReply?: boolean;
  readers: Record<string, CommentReader[]>; onToggleRead: (id: string) => void; readPendingId: string | null;
}) {
  const isOwn = currentUserId === comment.user_id;
  const isEditing = editingCommentId === comment.id;
  return (
    <div className="group">
      <div className="flex items-start gap-3">
        <Avatar className={cn('mt-0.5 shrink-0', isReply ? 'h-7 w-7' : 'h-9 w-9')}>
          <AvatarImage src={comment.user?.avatar_url} />
          <AvatarFallback className={cn('font-semibold', isReply ? 'text-[10px]' : 'text-xs')}>{comment.user?.full_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', isReply ? 'text-xs' : 'text-sm')}>{comment.user?.full_name || 'Usuario'}</span>
            <span className="text-[11px] text-muted-foreground">{getTimeAgo(comment.created_at)}</span>
          </div>
          {isEditing ? (
            <div className="mt-1.5 space-y-1.5">
              <Input value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveCommentEdit(comment.id); } if (e.key === 'Escape') cancelCommentEdit(); }}
                className="h-9 rounded-lg border-0 bg-background/70 text-sm" autoFocus />
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={() => saveCommentEdit(comment.id)} disabled={savingCommentEdit || !editCommentContent.trim()}>
                  {savingCommentEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2.5 text-xs" onClick={cancelCommentEdit}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ) : (
            <MentionedText text={comment.content} className="mt-1 text-sm leading-relaxed text-foreground/80" />
          )}
          {!isEditing && (
            <div className="mt-1.5 flex items-center gap-1">
              <CommentReadEye readers={readers[comment.id]} currentUserId={currentUserId} onToggle={() => onToggleRead(comment.id)} pending={readPendingId === comment.id} />
              <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {!isReply && <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => onReply(comment.id)}><Reply className="h-3 w-3" /> Responder</Button>}
                {isOwn && (
                  <>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-lg px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }}><Edit3 className="h-3 w-3" /> Editar</Button>
                    <Button variant="ghost" size="sm" className="h-6 gap-1 rounded-lg px-2 text-[11px] text-red-400 hover:text-red-600" onClick={() => onDelete(comment.id)}><Trash2 className="h-3 w-3" /></Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-2 space-y-3 border-l-2 border-border/30 pl-4">
          {comment.replies.map(r => (
            <TaskCommentItem key={r.id} comment={r} currentUserId={currentUserId} isReply onReply={onReply} onDelete={onDelete}
              editingCommentId={editingCommentId} setEditingCommentId={setEditingCommentId}
              editCommentContent={editCommentContent} setEditCommentContent={setEditCommentContent}
              saveCommentEdit={saveCommentEdit} cancelCommentEdit={cancelCommentEdit} savingCommentEdit={savingCommentEdit}
              readers={readers} onToggleRead={onToggleRead} readPendingId={readPendingId} />
          ))}
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}
