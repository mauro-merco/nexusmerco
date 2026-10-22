'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useSocialAttachments, useSocialComments } from '@/lib/hooks/use-social-ideas';
import { SocialComment } from '@/components/social-comment';
import { TaskRolesPicker, rolesFromAssignees, rolesToList, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { useAuthStore } from '@/store/auth-store';
import type { SocialIdea, PostType, IdeaStatus, User as NexusUser } from '@/lib/types';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import { POST_TYPE_CONFIG, STATUS_CONFIG, IDEA_STATUS_ORDER } from '@/lib/social-config';
import { MaterialLinks } from '@/components/material-links';
import { MarkdownBody } from '@/lib/markdown';
import { MoveIdeaDialog } from '@/components/move-idea-dialog';
import { Scroller, Menu, Collapse, Switch, type MenuOption } from '@/components/task-ui';
import { Module, DateTimeField, DescriptionEditor } from '@/components/task-fields';
import {
  Loader2, Trash2, Link, Paperclip, Copy, AlertTriangle, Edit3, Calendar, Check, Zap, ChevronDown, MessageSquare,
  PanelLeftClose, PanelLeftOpen, Shapes, CalendarDays, Hash, FileText, Users2, FolderOpen, ClipboardCopy,
} from 'lucide-react';

const POST_TYPE_OPTIONS: MenuOption[] = (Object.keys(POST_TYPE_CONFIG) as PostType[]).map(k => {
  const c = POST_TYPE_CONFIG[k];
  return { key: k, label: c.label, icon: c.icon, colorClass: c.colorClass };
});
const IDEA_STATUS_OPTIONS: MenuOption[] = IDEA_STATUS_ORDER.map(k => {
  const s = STATUS_CONFIG[k];
  return { key: k, label: s.label, dot: s.dotColor, bgClass: s.colorClass };
});

const CONTENT_TABS = [
  { key: 'brief', label: 'Brief', ph: 'Descripción general de la publicación...' },
  { key: 'description', label: 'Guión', ph: 'Guión detallado o descripción del contenido...' },
  { key: 'copy', label: 'Copy', ph: 'Texto del copy para la publicación...' },
] as const;
type ContentTab = typeof CONTENT_TABS[number]['key'];

interface SocialIdeaModalProps {
  idea: SocialIdea;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIdeaUpdated: (idea: SocialIdea) => void;
  onIdeaDeleted: () => void;
  users: NexusUser[];
  calendarType?: 'social' | 'ads';
}

const fieldCls = 'w-full rounded-xl bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

export function SocialIdeaModal({ idea, open, onOpenChange, onIdeaUpdated, onIdeaDeleted, users, calendarType = 'social' }: SocialIdeaModalProps) {
  const { user } = useAuthStore();
  const isSocial = calendarType === 'social';
  const endpoint = calendarType === 'ads' ? '/api/ads-ideas' : '/api/social-ideas';
  const { attachments, addAttachment, removeAttachment } = useSocialAttachments(isSocial ? idea.id : null);
  const { comments, addComment, deleteComment, updateComment } = useSocialComments(isSocial ? idea.id : null);

  const [editing, setEditing] = useState(false);
  const [detailOpen, setDetailOpen] = useState(true);
  const [teamOpen, setTeamOpen] = useState(false);
  const [contentTab, setContentTab] = useState<ContentTab>('brief');
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [brief, setBrief] = useState(idea.brief || '');
  const [copyText, setCopyText] = useState(idea.copy_text || '');
  const [ejeContenido, setEjeContenido] = useState(idea.eje_contenido || '');
  const [roles, setRoles] = useState<TaskRolesState>(() => rolesFromAssignees((idea.assignees || []).map(a => ({ id: a.id, task_role: a.work_role }))));
  const [postType, setPostType] = useState<PostType>(idea.post_type);
  const [status, setStatus] = useState<IdeaStatus>(idea.status);
  const [publishDate, setPublishDate] = useState(idea.publish_date);
  const [needsMaterial, setNeedsMaterial] = useState(!!idea.needs_client_material);
  const [materialNote, setMaterialNote] = useState(idea.client_material_note || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [newAttachUrl, setNewAttachUrl] = useState('');
  const [addingAttach, setAddingAttach] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const resetFields = useCallback(() => {
    setTitle(idea.title); setDescription(idea.description); setBrief(idea.brief || ''); setCopyText(idea.copy_text || '');
    setEjeContenido(idea.eje_contenido || '');
    setRoles(rolesFromAssignees((idea.assignees || []).map(a => ({ id: a.id, task_role: a.work_role }))));
    setPostType(idea.post_type); setStatus(idea.status); setPublishDate(idea.publish_date);
    setNeedsMaterial(!!idea.needs_client_material); setMaterialNote(idea.client_material_note || '');
  }, [idea]);

  useEffect(() => { resetFields(); setEditing(false); setConfirmDelete(false); setSaveError(null); }, [idea, resetFields]);

  const handleSave = useCallback(async () => {
    setSaving(true); setSaveError(null);
    try {
      if (!roles.lead.length || !roles.executor.length || !roles.reviewer.length) throw new Error('Asigná al menos una persona como responsable, ejecutor y control');
      const res = await fetch(`${endpoint}/${idea.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, brief, eje_contenido: ejeContenido, copy_text: copyText,
          post_type: postType, status, publish_date: publishDate, assignees: rolesToList(roles),
          needs_client_material: needsMaterial, client_material_note: materialNote,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      onIdeaUpdated(json.data); setEditing(false);
    } catch (err) { setSaveError(err instanceof Error ? err.message : 'Error al guardar'); } finally { setSaving(false); }
  }, [idea.id, endpoint, title, description, brief, copyText, ejeContenido, roles, postType, status, publishDate, needsMaterial, materialNote, onIdeaUpdated]);

  const handleQuickStatusChange = useCallback(async (newStatus: IdeaStatus) => {
    if (newStatus === idea.status) return;
    setChangingStatus(true);
    try {
      const res = await fetch(`${endpoint}/${idea.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cambiar estado');
      setStatus(newStatus); onIdeaUpdated(json.data);
    } catch { /* se revierte al reabrir */ } finally { setChangingStatus(false); }
  }, [idea.id, idea.status, endpoint, onIdeaUpdated]);

  const handleAddAttachment = useCallback(async () => {
    if (!newAttachUrl.trim()) return;
    setAddingAttach(true);
    try { await addAttachment({ type: 'link', url: newAttachUrl.trim(), name: '' }); setNewAttachUrl(''); } catch { /* */ } finally { setAddingAttach(false); }
  }, [newAttachUrl, addAttachment]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { const res = await fetch(`${endpoint}/${idea.id}`, { method: 'DELETE' }); if (res.ok) { onIdeaDeleted(); onOpenChange(false); } } finally { setConfirmDelete(false); }
  }, [idea.id, endpoint, confirmDelete, onIdeaDeleted, onOpenChange]);

  const dateStr = new Date(idea.publish_date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const copyIdeaLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.origin + '/calendarios');
    url.searchParams.set('client', idea.client_id);
    url.searchParams.set('type', calendarType === 'ads' ? 'ads' : 'redes');
    url.searchParams.set('month', idea.publish_date.slice(0, 7));
    url.searchParams.set('idea', idea.id);
    await navigator.clipboard.writeText(url.toString());
    setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1800);
  }, [calendarType, idea.client_id, idea.id, idea.publish_date]);

  const copyCopyText = async () => {
    await navigator.clipboard.writeText(idea.copy_text || '');
    setCopiedCopy(true); setTimeout(() => setCopiedCopy(false), 1600);
  };

  const banner = modalStatusStyle(status);
  const pt = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = pt.icon;
  const tabValues: Record<ContentTab, [string, (v: string) => void]> = { brief: [brief, setBrief], description: [description, setDescription], copy: [copyText, setCopyText] };
  const [tabValue, setTabValue] = tabValues[contentTab];
  const cols = `${detailOpen ? '300px' : '48px'} minmax(0,1fr)${isSocial ? ' minmax(320px,380px)' : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-dvh w-screen max-w-none! flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none">
        {/* Banner de estado */}
        <div className={cn('shrink-0 px-5 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors duration-300', banner.banner)}>{banner.label}</div>

        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-muted/20 px-5 py-3 pr-14">
          <div className="min-w-[220px] flex-1">
            {editing
              ? <Input value={title} onChange={e => setTitle(e.target.value)} className="h-10 rounded-xl border-0 bg-background/70 text-lg font-bold" />
              : <DialogTitle className="truncate text-lg font-bold">{idea.eje_contenido || idea.title}</DialogTitle>}
            <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="flex items-center gap-1 capitalize text-muted-foreground"><Calendar className="h-3 w-3" /> {dateStr}</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold', pt.bgColorClass, pt.colorClass)}><PtIcon className="h-3 w-3" /> {pt.label}</span>
            </DialogDescription>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div className="w-[230px]"><Menu value={status} options={IDEA_STATUS_OPTIONS} onChange={k => handleQuickStatusChange(k as IdeaStatus)} loading={changingStatus} disabled={changingStatus} /></div>
            {isSocial && !editing && (
              <Button variant="ghost" size="sm" className="tm-press gap-1 rounded-lg text-cyan-600 dark:text-cyan-400" onClick={() => setShowMoveDialog(true)} title="Mover a calendario ADS"><Zap className="h-3.5 w-3.5" /> Mover a ADS</Button>
            )}
            <Button variant="ghost" size="sm" className="tm-press gap-1 rounded-lg" onClick={copyIdeaLink} title="Copiar link de la idea">
              {copiedLink ? <Check className="tm-fade h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}{copiedLink ? 'Copiado' : null}
            </Button>
            {!editing ? (
              <Button size="sm" variant="secondary" className="tm-press gap-1.5 rounded-lg" onClick={() => setEditing(true)}><Edit3 className="h-3.5 w-3.5" /> Editar</Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="tm-press rounded-lg" onClick={() => { setEditing(false); setSaveError(null); resetFields(); }}>Cancelar</Button>
                <Button size="sm" className="tm-press rounded-lg" onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Guardar cambios</Button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ ['--cols' as string]: cols }}
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 transition-[grid-template-columns] duration-300 ease-out lg:overflow-hidden lg:[grid-template-columns:var(--cols)]">

          {/* DETALLE */}
          <aside className="flex min-h-0 flex-col overflow-hidden">
            {!detailOpen && (
              <button type="button" onClick={() => setDetailOpen(true)} title="Mostrar detalle"
                className="tm-press tm-fade hidden h-full w-full flex-col items-center gap-3 rounded-2xl bg-muted/25 py-3 text-muted-foreground hover:bg-muted/40 hover:text-foreground lg:flex">
                <PanelLeftOpen className="h-4 w-4" />
                <PtIcon className={cn('h-4 w-4', pt.colorClass)} />
                <span className="text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">Detalle</span>
              </button>
            )}
            <div className={cn('flex min-h-0 flex-1 flex-col', !detailOpen && 'lg:hidden')}>
              <div className="mb-2 hidden shrink-0 items-center justify-between px-1 lg:flex">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Detalle</span>
                <button type="button" onClick={() => setDetailOpen(false)} title="Ocultar detalle" className="tm-press rounded-lg p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"><PanelLeftClose className="h-4 w-4" /></button>
              </div>
              <Scroller className="flex-1" innerClassName="tm-stagger space-y-3 pb-32">
                <Module icon={Shapes} title="Formato" tone="text-pink-600" toneBg="bg-pink-500/15">
                  {editing
                    ? <Menu value={postType} options={POST_TYPE_OPTIONS} onChange={k => setPostType(k as PostType)} />
                    : <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold', pt.bgColorClass, pt.colorClass)}><PtIcon className="h-4 w-4" /> {pt.label}</span>}
                </Module>

                <Module icon={CalendarDays} title="Publicación" tone="text-blue-600" toneBg="bg-blue-500/15">
                  {editing
                    ? <DateTimeField value={publishDate} onChange={v => v && setPublishDate(v)} placeholder="Elegí la fecha" />
                    : <p className="text-sm font-semibold capitalize">{dateStr}</p>}
                </Module>

                <Module icon={Hash} title="Eje de contenido" tone="text-violet-600" toneBg="bg-violet-500/15">
                  {editing
                    ? <input value={ejeContenido} onChange={e => setEjeContenido(e.target.value)} placeholder="Promoción de verano..." className={fieldCls} />
                    : <p className={cn('text-sm', idea.eje_contenido ? 'font-semibold' : 'italic text-muted-foreground')}>{idea.eje_contenido || 'Sin eje definido'}</p>}
                </Module>

                {editing ? (
                  <Module icon={AlertTriangle} title="Material del cliente" tone="text-red-600" toneBg="bg-red-500/15">
                    <Switch checked={needsMaterial} onChange={setNeedsMaterial} tone="bg-red-500" label={<span className="text-red-600 dark:text-red-400">Necesito material</span>} />
                    <Collapse open={needsMaterial}>
                      <textarea value={materialNote} onChange={e => setMaterialNote(e.target.value)} rows={3} placeholder="Qué material se necesita..." className={cn(fieldCls, 'tm-noscroll mt-3 min-h-[72px] resize-none')} />
                    </Collapse>
                  </Module>
                ) : (
                  <Module icon={Users2} title="Equipo" tone="text-violet-600" toneBg="bg-violet-500/15">
                    <div className="space-y-2">
                      {TASK_ROLES.map(role => {
                        const cfg = TASK_ROLE_CONFIG[role]; const Icon = cfg.icon;
                        const assigned = (idea.assignees || []).filter(a => a.work_role === role);
                        return (
                          <div key={role} className="rounded-xl bg-background/60 px-3 py-2">
                            <p className={cn('flex items-center gap-1.5 text-[11px] font-semibold', cfg.colorClass)}><Icon className="h-3 w-3" /> {cfg.label}</p>
                            <p className="mt-0.5 text-xs text-foreground/80">{assigned.map(a => a.full_name || a.email).join(', ') || <span className="text-muted-foreground">Sin asignar</span>}</p>
                          </div>
                        );
                      })}
                    </div>
                  </Module>
                )}
              </Scroller>
            </div>
          </aside>

          {/* PRINCIPAL */}
          <Scroller innerClassName={cn('flex min-h-full flex-col gap-4 pb-40', !editing && 'tm-stagger')}>
            {saveError && <div className="tm-pop rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>}

            {editing ? (
              <>
                <DescriptionEditor key={contentTab} className="min-h-[460px] flex-1" value={tabValue} onChange={setTabValue}
                  placeholder={CONTENT_TABS.find(t => t.key === contentTab)!.ph}
                  title={
                    <div className="flex rounded-xl bg-background/70 p-0.5">
                      {CONTENT_TABS.map(t => (
                        <button key={t.key} type="button" onClick={() => setContentTab(t.key)}
                          className={cn('tm-press rounded-lg px-3 py-1.5 text-xs font-semibold', contentTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                          {t.label}{tabValues[t.key][0].trim() ? ' •' : ''}
                        </button>
                      ))}
                    </div>
                  } />
                <section className="tm-rise rounded-2xl bg-muted/25">
                  <button type="button" onClick={() => setTeamOpen(v => !v)} className="tm-press flex w-full items-center gap-2 p-4 text-left">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15"><Users2 className="h-3.5 w-3.5 text-violet-600" /></span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Equipo asignado</h3>
                    <span className="text-xs text-muted-foreground">{totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''}</span>
                    {(!roles.lead.length || !roles.executor.length || !roles.reviewer.length) && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Falta asignar</span>}
                    <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', teamOpen && 'rotate-180')} />
                  </button>
                  <Collapse open={teamOpen}><div className="px-4 pb-4"><TaskRolesPicker roles={roles} onChange={setRoles} users={users} /></div></Collapse>
                </section>
              </>
            ) : (
              <>
                {idea.needs_client_material && (
                  <div className="rounded-2xl bg-red-500/10 p-4">
                    <p className="flex items-center gap-2 text-sm font-black uppercase text-red-600 dark:text-red-400"><AlertTriangle className="h-4 w-4" /> Necesito material del cliente</p>
                    {idea.client_material_note && <MarkdownBody text={idea.client_material_note} className="mt-2 text-sm text-foreground/85" />}
                  </div>
                )}
                {idea.brief && <Module icon={FileText} title="Brief" tone="text-blue-600" toneBg="bg-blue-500/15"><MarkdownBody text={idea.brief} className="text-sm leading-relaxed text-foreground/85" /></Module>}
                {idea.description && <Module icon={FileText} title="Guión / Descripción" tone="text-indigo-600" toneBg="bg-indigo-500/15"><MarkdownBody text={idea.description} className="text-sm leading-relaxed text-foreground/85" /></Module>}
                {idea.copy_text && (
                  <Module icon={FileText} title="Copy" tone="text-emerald-600" toneBg="bg-emerald-500/15"
                    right={<button type="button" onClick={copyCopyText} className="tm-press flex items-center gap-1 rounded-lg bg-background/70 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      {copiedCopy ? <Check className="tm-fade h-3 w-3 text-emerald-500" /> : <ClipboardCopy className="h-3 w-3" />}{copiedCopy ? 'Copiado' : 'Copiar'}</button>}>
                    <MarkdownBody text={idea.copy_text} className="text-sm leading-relaxed text-foreground/85" />
                  </Module>
                )}
                {!idea.brief && !idea.description && !idea.copy_text && (
                  <Module icon={FileText} title="Contenido" tone="text-blue-600" toneBg="bg-blue-500/15"><p className="text-sm italic text-muted-foreground">Sin contenido</p></Module>
                )}
              </>
            )}

            <Module icon={FolderOpen} title="Material" tone="text-indigo-600" toneBg="bg-indigo-500/15">
              <MaterialLinks entityType={calendarType === 'ads' ? 'ads_idea' : 'social_idea'} entityId={idea.id} />
            </Module>

            {isSocial && (
              <Module icon={Paperclip} title={`Adjuntos (${attachments.length})`} tone="text-emerald-600" toneBg="bg-emerald-500/15">
                <div className="flex items-center gap-2">
                  <Input placeholder="Pegá un link de Drive..." value={newAttachUrl} onChange={e => setNewAttachUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAttachment(); } }} className="h-9 rounded-xl border-0 bg-background/70 text-sm" />
                  <Button size="sm" onClick={handleAddAttachment} disabled={addingAttach || !newAttachUrl.trim()} className="tm-press h-9 shrink-0 rounded-xl">
                    {addingAttach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {attachments.map(att => (
                      <div key={att.id} className="tm-rise flex items-center justify-between gap-2 rounded-xl bg-background/60 p-2 transition-colors hover:bg-background">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2"><Link className="h-3.5 w-3.5 shrink-0 text-green-500" /><span className="truncate text-xs font-medium">{att.url}</span></a>
                        <Button variant="ghost" size="sm" className="tm-press h-6 w-6 shrink-0 rounded-lg p-0 text-red-400 hover:text-red-600" onClick={() => removeAttachment(att.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </Module>
            )}
          </Scroller>

          {/* COMENTARIOS */}
          {isSocial && (
            <div className="flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-2xl bg-muted/25 p-4 lg:h-auto">
              <p className="mb-3 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15"><MessageSquare className="h-3.5 w-3.5 text-sky-600" /></span>
                Comentarios ({comments.length})
              </p>
              <div className="min-h-0 flex-1">
                <SocialComment ideaId={idea.id} comments={comments} onAddComment={addComment} onDeleteComment={deleteComment} onUpdateComment={updateComment} currentUserId={user?.id} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between bg-muted/20 px-5 py-3">
          {confirmDelete ? (
            <div className="tm-pop flex items-center gap-2">
              <span className="text-xs text-muted-foreground">¿Seguro?</span>
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setConfirmDelete(false)}>No</Button>
              <Button variant="destructive" size="sm" className="gap-1 rounded-lg" onClick={handleDelete}><Trash2 className="h-3.5 w-3.5" /> Sí, eliminar</Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="tm-press rounded-lg text-red-500 hover:text-red-600" onClick={handleDelete}><Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar</Button>
          )}
          <DialogClose render={<Button variant="outline" className="tm-press rounded-lg" />}>Cerrar</DialogClose>
        </div>
      </DialogContent>

      {showMoveDialog && (
        <MoveIdeaDialog ideaId={idea.id} ideaTitle={idea.title} clientId={idea.client_id} onClose={() => setShowMoveDialog(false)}
          onSuccess={() => { onIdeaDeleted(); onOpenChange(false); }} />
      )}
    </Dialog>
  );
}

function modalStatusStyle(status: IdeaStatus) {
  const m: Partial<Record<IdeaStatus, { label: string; banner: string }>> = {
    borrador: { label: 'Borrador', banner: 'bg-gray-500/15 text-gray-700 dark:text-gray-200' },
    en_revision: { label: 'En revisión', banner: 'bg-amber-400/20 text-amber-800 dark:text-amber-100' },
    espera_cliente: { label: '⚠ En espera del cliente', banner: 'bg-red-600 text-white' },
    necesita_modificaciones: { label: 'Necesita modificaciones', banner: 'bg-orange-500 text-white' },
    idea_aprobada: { label: '✓ Idea aprobada', banner: 'bg-teal-500/20 text-teal-800 dark:text-teal-100' },
    idea_rechazada: { label: 'Idea rechazada', banner: 'bg-rose-600 text-white' },
    listo_para_disenar: { label: 'Listo para diseñar', banner: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-100' },
    diseno_listo: { label: '✓ Diseño listo', banner: 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-100' },
    aprobada: { label: '✓ Aprobado', banner: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-100' },
    listo_para_postear: { label: 'Listo para postear', banner: 'bg-violet-500/20 text-violet-900 dark:text-violet-100' },
    programando: { label: '⏱ Programando', banner: 'bg-violet-600 text-white' },
    posteado: { label: '✓ Publicado', banner: 'bg-green-600 text-white' },
  };
  return m[status] || { label: String(status), banner: 'bg-muted/50 text-muted-foreground' };
}
