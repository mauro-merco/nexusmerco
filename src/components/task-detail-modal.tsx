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
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES, PIECE_TYPES, taskPieceTotal, TASK_ROLE_CONFIG, TASK_ROLES, taskTypeInfo, TASK_TYPE_CATEGORIES } from '@/lib/task-config';
import { TaskRolesPicker, rolesToList, rolesFromAssignees, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { Scroller, Menu, Collapse, Switch, Stepper } from '@/components/task-ui';
import { Module, DepartmentMenu, DateTimeField, DescriptionEditor, STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, isoIn } from '@/components/task-fields';
import { departmentInfo } from '@/lib/department-config';
import { MaterialLinks } from '@/components/material-links';
import { CommentReadEye } from '@/components/comment-read';
import { useCommentReads, collectCommentIds, type CommentReader } from '@/lib/hooks/use-comment-reads';
import {
  Loader2, Trash2, Link as LinkIcon, Paperclip, Edit3, Calendar, Send, MessageSquare, Reply, Check, X, Layers,
  Share2, Copy, Globe, Lock, AlertTriangle, ChevronDown, PanelLeftClose, PanelLeftOpen, Bold, Italic, List, ListOrdered, Heading2, Link2, FileText, Users2, Flag, Boxes, Tag, FolderOpen, Clock,
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
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(task.description);
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
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
    setEditingDescription(false); setDescriptionError(null);
    setProblemPrompt(null); setEditing(false); setConfirmDelete(false); setSaveError(null); setShareOpen(false); setCopied(false);
  }, [task, resetFields]);

  const saveDescription = async () => {
    setSavingDescription(true); setDescriptionError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionDraft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      onTaskUpdated(json.data); setEditingDescription(false);
    } catch (err) { setDescriptionError(err instanceof Error ? err.message : 'Error al guardar'); }
    finally { setSavingDescription(false); }
  };

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
      <DialogContent className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-dvh w-screen max-w-none! flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none">
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
              <Menu value={status} options={STATUS_OPTIONS} onChange={k => handleQuickStatus(k as TaskStatus)} loading={changingStatus} disabled={changingStatus} />
            </div>
            <div className="relative">
              <Button variant="ghost" size="sm" className="tm-press rounded-lg" onClick={() => setShareOpen(v => !v)}><Share2 className="h-4 w-4" /></Button>
              {shareOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                  <div className="tm-pop absolute right-0 top-full z-50 mt-2 w-80 space-y-3 rounded-2xl bg-popover p-3 shadow-xl">
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
              <Button size="sm" variant="secondary" className="tm-press gap-1.5 rounded-lg" disabled={editingDescription} onClick={() => setEditing(true)}><Edit3 className="h-3.5 w-3.5" /> Editar</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="tm-press rounded-lg" onClick={() => { setEditing(false); setSaveError(null); resetFields(); }}>Cancelar</Button>
                <Button size="sm" className="tm-press rounded-lg" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar cambios
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ===== Body: detalle (colapsable) | principal | comentarios ===== */}
        <div style={{ ['--cols' as string]: `${detailOpen ? '300px' : '48px'} minmax(0,1fr) minmax(320px,380px)` }}
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 transition-[grid-template-columns] duration-300 ease-out lg:overflow-hidden lg:[grid-template-columns:var(--cols)]">

          {/* DETALLE (izquierda, colapsable) */}
          <aside className="flex min-h-0 flex-col overflow-hidden">
            {!detailOpen && (
              <button type="button" onClick={() => setDetailOpen(true)} title="Mostrar detalle"
                className="tm-press tm-fade hidden h-full w-full flex-col items-center gap-3 rounded-2xl bg-muted/25 py-3 text-muted-foreground hover:bg-muted/40 hover:text-foreground lg:flex">
                <PanelLeftOpen className="h-4 w-4" />
                <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_CONFIG[priority].dotColor)} />
                <span className="text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">Detalle</span>
              </button>
            )}
            <div className={cn('flex min-h-0 flex-1 flex-col', !detailOpen && 'lg:hidden')}>
              <div className="mb-2 hidden shrink-0 items-center justify-between px-1 lg:flex">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Detalle</span>
                <button type="button" onClick={() => setDetailOpen(false)} title="Ocultar detalle" className="tm-press rounded-lg p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"><PanelLeftClose className="h-4 w-4" /></button>
              </div>
              <Scroller className="flex-1" innerClassName="tm-stagger space-y-3 pb-32">
                <Module icon={Flag} title="Prioridad" tone="text-orange-600" toneBg="bg-orange-500/15">
                  {editing
                    ? <Menu value={priority} options={PRIORITY_OPTIONS} onChange={k => setPriority(k as TaskPriority)} />
                    : <span className={cn('flex items-center gap-2 text-sm font-semibold', TASK_PRIORITY_CONFIG[task.priority].colorClass)}>
                        <span className={cn('h-2 w-2 rounded-full', TASK_PRIORITY_CONFIG[task.priority].dotColor)} /> {TASK_PRIORITY_CONFIG[task.priority].label}
                      </span>}
                </Module>

                <Module icon={Tag} title="Clasificación" tone="text-pink-600" toneBg="bg-pink-500/15">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="space-y-1"><Label className="text-xs">Tipo de tarea</Label>
                        <Menu value={taskType} options={TYPE_OPTIONS} onChange={setTaskType} placeholder="Elegí un tipo" /></div>
                      <div className="space-y-1"><Label className="text-xs">Departamento</Label>
                        <DepartmentMenu value={department} onChange={setDepartment} /></div>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      <Row label="Tipo">{typeInfo ? <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold', typeInfo.category.bgColorClass, typeInfo.category.colorClass)}><typeInfo.category.icon className="h-3 w-3" />{typeInfo.label}</span> : <span className="text-muted-foreground">—</span>}</Row>
                      <Row label="Departamento">{task.department ? departmentInfo(task.department)?.label : <span className="text-muted-foreground">—</span>}</Row>
                    </div>
                  )}
                </Module>

                <Module icon={Clock} title="Plazos" tone="text-blue-600" toneBg="bg-blue-500/15">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="space-y-1"><Label className="text-xs">Inicio</Label>
                        <DateTimeField withTime value={startDate} onChange={setStartDate} placeholder="Elegí inicio" /></div>
                      <div className="space-y-1"><Label className="text-xs">Vencimiento</Label>
                        <DateTimeField value={dueDate} onChange={setDueDate} placeholder="Elegí vencimiento" />
                        </div>
                      <Collapse open={!!department}>
                        <div className="pt-1"><Switch checked={isUrgent} onChange={setIsUrgent} tone="bg-amber-500"
                          label={<span className="text-amber-600 dark:text-amber-400">Urgente <span className="font-normal text-muted-foreground">· SLA {isUrgent ? dept?.urgentSlaHours : dept?.slaHours}hs</span></span>} /></div>
                      </Collapse>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      <Row label="Inicio">{task.start_date ? new Date(task.start_date).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : <span className="text-muted-foreground">—</span>}</Row>
                      <Row label="Vencimiento">{task.due_date ? dueChip(task.due_date, true) : <span className="text-muted-foreground">—</span>}</Row>
                      {task.is_urgent && <Row label="Urgencia"><span className="text-amber-600">Urgente</span></Row>}
                    </div>
                  )}
                </Module>

                <Module icon={Boxes} title={`Piezas${!editing && taskPieceTotal(task) > 0 ? ` · ${taskPieceTotal(task)}` : ''}`} tone="text-violet-600" toneBg="bg-violet-500/15">
                  {editing ? (
                    <div className="space-y-2">
                      {PIECE_TYPES.map(pt => {
                        const Icon = pt.icon; const [val, set] = pieceValues[pt.field];
                        return (
                          <div key={pt.field} className="flex items-center gap-2">
                            <span className={cn('flex flex-1 items-center gap-1.5 text-xs font-medium', pt.colorClass)}><Icon className="h-3.5 w-3.5" /> {pt.label}</span>
                            <div className="w-[118px]"><Stepper value={val} onChange={set} /></div>
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

                {editing ? (
                  <Module icon={AlertTriangle} title="Material del cliente" tone="text-red-600" toneBg="bg-red-500/15">
                    <Switch checked={needsMaterial} onChange={setNeedsMaterial} tone="bg-red-500" label={<span className="text-red-600 dark:text-red-400">Necesito material</span>} />
                    <Collapse open={needsMaterial}>
                      <textarea value={materialNote} onChange={e => setMaterialNote(e.target.value)} rows={3}
                        placeholder="Qué material se necesita..." className={cn(fieldCls, 'tm-noscroll mt-3 min-h-[72px] resize-none')} />
                    </Collapse>
                  </Module>
                ) : (
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
              </Scroller>
            </div>
          </aside>

          {/* PRINCIPAL */}
          <Scroller innerClassName={cn('flex min-h-full flex-col gap-4 pb-40', !editing && 'tm-stagger')}>
            {saveError && <div className="tm-pop rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>}

            {status === 'problemas' && !problemPrompt && (
              <div className="tm-pop flex items-start gap-2 rounded-2xl bg-red-500/10 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-red-600 dark:text-red-400">Problema</p>
                  {problemNote ? <MarkdownBody text={problemNote} className="mt-1 text-sm text-foreground/85" /> : <p className="mt-1 text-sm italic text-muted-foreground">Sin descripción</p>}
                </div>
                <Button variant="ghost" size="sm" className="tm-press h-7 shrink-0 text-xs" onClick={() => setProblemPrompt({ note: problemNote })}><Edit3 className="mr-1 h-3 w-3" /> Editar</Button>
              </div>
            )}
            {problemPrompt && (
              <div className="tm-pop space-y-2 rounded-2xl bg-red-500/5 p-4 ring-1 ring-red-500/30">
                <Label htmlFor="task-problem-note" className="text-red-600 dark:text-red-400">¿Cuál es el problema?</Label>
                <textarea id="task-problem-note" autoFocus value={problemPrompt.note}
                  onChange={e => setProblemPrompt({ note: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveProblem(); } if (e.key === 'Escape') setProblemPrompt(null); }}
                  placeholder="Describí qué está pasando y qué bloquea la tarea..."
                  className="min-h-[70px] w-full resize-none rounded-xl bg-background/70 px-3 py-2 text-sm outline-none" />
                <div className="flex items-center gap-1.5">
                  <Button size="sm" className="tm-press h-8 rounded-lg" onClick={saveProblem} disabled={savingProblem || !problemPrompt.note.trim()}>
                    {savingProblem && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar
                  </Button>
                  <Button variant="ghost" size="sm" className="tm-press h-8 rounded-lg" onClick={() => setProblemPrompt(null)} disabled={savingProblem}>Cancelar</Button>
                  <span className="ml-auto text-[10px] text-muted-foreground">Ctrl + Enter</span>
                </div>
              </div>
            )}

            {editing ? (
              <>
                <DescriptionEditor className="min-h-[460px] flex-1" value={description} onChange={setDescription} />

                <section className="tm-rise rounded-2xl bg-muted/25">
                  <button type="button" onClick={() => setTeamOpen(v => !v)} className="tm-press flex w-full items-center gap-2 p-4 text-left">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15"><Users2 className="h-3.5 w-3.5 text-violet-600" /></span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Equipo y roles</h3>
                    <span className="text-xs text-muted-foreground">{totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''}</span>
                    {(!roles.lead.length || !roles.executor.length || !roles.reviewer.length) && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Falta asignar</span>
                    )}
                    <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', teamOpen && 'rotate-180')} />
                  </button>
                  <Collapse open={teamOpen}><div className="px-4 pb-4"><TaskRolesPicker roles={roles} onChange={setRoles} users={users} /></div></Collapse>
                </section>
              </>
            ) : (
              <>
                {task.needs_client_material && (
                  <div className="rounded-2xl bg-red-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black uppercase text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4" /> Necesito material del cliente</p>
                    {task.client_material_note && <MarkdownBody text={task.client_material_note} className="mt-2 text-sm text-foreground/85" />}
                  </div>
                )}
                {editingDescription ? (
                  <div className="space-y-2">
                    <DescriptionEditor value={descriptionDraft} onChange={setDescriptionDraft} />
                    {descriptionError && <p role="alert" className="text-xs text-destructive">{descriptionError}</p>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" className="tm-press rounded-lg" disabled={savingDescription} onClick={() => { setEditingDescription(false); setDescriptionError(null); }}>Cancelar</Button>
                      <Button type="button" size="sm" className="tm-press rounded-lg" disabled={savingDescription} onClick={saveDescription}>
                        {savingDescription && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar descripción
                      </Button>
                    </div>
                  </div>
                ) : <Module icon={FileText} title="Descripción" tone="text-blue-600" toneBg="bg-blue-500/15"
                  right={<Button type="button" variant="ghost" size="sm" className="tm-press h-7 rounded-lg text-xs" onClick={() => { setDescriptionDraft(task.description); setDescriptionError(null); setEditingDescription(true); }}><Edit3 className="mr-1 h-3 w-3" /> Editar</Button>}>
                  {task.description
                    ? <MarkdownBody text={task.description} className="text-sm leading-relaxed text-foreground/85" />
                    : <p className="text-sm italic text-muted-foreground">Sin descripción</p>}
                </Module>}
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
                <Button size="sm" onClick={handleAddAttachment} disabled={addingAttach || !newAttachUrl.trim()} className="tm-press h-9 shrink-0 rounded-xl">
                  {addingAttach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                </Button>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {attachments.map(att => (
                    <div key={att.id} className="tm-rise flex items-center justify-between gap-2 rounded-xl bg-background/60 p-2 transition-colors hover:bg-background">
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2">
                        <LinkIcon className="h-3.5 w-3.5 shrink-0 text-green-500" />
                        <span className="truncate text-xs font-medium">{att.url}</span>
                      </a>
                      <Button variant="ghost" size="sm" className="tm-press h-6 w-6 shrink-0 rounded-lg p-0 text-red-400 hover:text-red-600" onClick={() => removeAttachment(att.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </Module>
          </Scroller>

          {/* COMENTARIOS */}
          <div className="flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-2xl bg-muted/25 p-4 lg:h-auto">
            <p className="mb-3 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15"><MessageSquare className="h-3.5 w-3.5 text-sky-600" /></span>
              Comentarios ({comments.length})
            </p>
            <Scroller className="mb-3 flex-1" innerClassName="space-y-4">
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
            </Scroller>
            <div className="shrink-0 space-y-2 pt-3">
              {replyTo && (() => {
                const find = (list: TaskComment[]): TaskComment | undefined => {
                  for (const c of list) { if (c.id === replyTo) return c; if (c.replies) { const f = find(c.replies); if (f) return f; } }
                  return undefined;
                };
                const target = find(comments);
                return target ? (
                  <div className="tm-pop flex items-center gap-2 rounded-lg bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
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
                <Button size="sm" onClick={handleAddComment} disabled={sendingComment || !newComment.trim()} className="tm-press h-9 w-9 shrink-0 rounded-lg p-0">
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
              <Button variant="ghost" size="sm" className="tm-press rounded-lg" onClick={() => setConfirmDelete(false)}>No</Button>
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
    <div className="tm-rise group">
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
