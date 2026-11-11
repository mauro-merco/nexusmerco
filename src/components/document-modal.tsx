'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ContentSkeleton } from '@/components/content-skeleton';
import { DocumentEditor } from '@/components/document-editor';
import { DocumentShareDialog } from '@/components/document-share-dialog';
import { TaskPickerDialog } from '@/components/document-pickers';
import { MentionTextarea, MentionedText } from '@/components/mention';
import { Scroller, Menu, Popover, type MenuOption } from '@/components/task-ui';
import { Module } from '@/components/task-fields';
import { useClients } from '@/lib/hooks/use-clients';
import { useInternalUsers } from '@/lib/hooks/use-internal-users';
import { documentApi, useDocumentComments, type DocumentUpdate } from '@/lib/hooks/use-documents';
import { DOC_KIND_CONFIG, DOC_KINDS, DOC_STATUS_CONFIG, DOC_STATUSES, NOTE_COLORS, docKind, tagClass } from '@/lib/document-config';
import { taskStatusConfig } from '@/lib/task-config';
import { useAuthStore } from '@/store/auth-store';
import { useMinimizedStore } from '@/store/minimized-store';
import { cn } from '@/lib/utils';
import type { NexusDocument, DocumentComment, DocumentKind, DocumentStatus } from '@/lib/types';
import {
  Star, Share2, Minus, Trash2, Archive, ArchiveRestore, Globe, Lock, Loader2, Check, X, Plus,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Tag, Link2, Building2, Users2,
  MessageSquare, Send, Reply, CheckCircle2, Circle, Settings2, Copy, ExternalLink, MoreHorizontal,
} from 'lucide-react';

const KIND_OPTIONS: MenuOption[] = DOC_KINDS.map(k => ({ key: k, label: DOC_KIND_CONFIG[k].label, icon: DOC_KIND_CONFIG[k].icon, colorClass: DOC_KIND_CONFIG[k].colorClass }));
const STATUS_OPTIONS: MenuOption[] = DOC_STATUSES.map(s => ({ key: s, label: DOC_STATUS_CONFIG[s].label, icon: DOC_STATUS_CONFIG[s].icon, colorClass: DOC_STATUS_CONFIG[s].colorClass, bgClass: DOC_STATUS_CONFIG[s].bgClass }));
const EMOJIS = ['📄', '📝', '🤝', '🚀', '🎯', '📊', '💡', '📌', '✅', '⚠️', '🔥', '📣', '🧭', '🗂️', '💬', '🎨'];

function fmt(iso?: string | null, withTime = true) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'recién';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export interface DocumentModalProps {
  /** Id del documento a abrir. null = cerrado. */
  documentId: string | null;
  onOpenChange: (open: boolean) => void;
  /** Se llama cada vez que cambia algo del documento (para refrescar listas). */
  onChanged?: (doc: Partial<NexusDocument> & { id: string }) => void;
  onDeleted?: (id: string) => void;
}

/** Pop-up de documento a pantalla completa, con la misma estructura que el de tareas:
 *  propiedades (izquierda, colapsable) · editor (centro) · comentarios (derecha). */
export function DocumentModal({ documentId, onOpenChange, onChanged, onDeleted }: DocumentModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { minimize } = useMinimizedStore();
  const { clients } = useClients();
  const team = useInternalUsers(!!documentId);

  const [doc, setDoc] = useState<NexusDocument | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef<{ title?: string; content?: string }>({});

  const open = !!documentId;

  // Cargar documento
  useEffect(() => {
    if (!documentId) { setDoc(null); return; }
    let cancelled = false;
    setDoc(null); setLoadError(null); setSaveState('idle'); setConfirmDelete(false);
    documentApi.get(documentId)
      .then(d => {
        if (cancelled) return;
        setDoc(d); setTitle(d.title); setContent(d.content || '');
        // En notas cortas, los paneles laterales arrancan cerrados para dar aire.
        if (d.kind === 'nota') { setLeftOpen(true); setRightOpen(false); }
      })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'No se pudo abrir el documento'); });
    return () => { cancelled = true; };
  }, [documentId]);

  const canEdit = !!doc?.can_edit;
  const isOwner = !!doc && doc.owner_id === user?.id;

  const flush = useCallback(async () => {
    if (!doc) return;
    const pending = dirty.current;
    if (pending.title === undefined && pending.content === undefined) return;
    dirty.current = {};
    setSaveState('saving');
    try {
      await documentApi.update(doc.id, pending);
      setSaveState('saved');
      onChanged?.({ id: doc.id, ...pending, updated_at: new Date().toISOString() });
    } catch {
      dirty.current = { ...pending, ...dirty.current };
      setSaveState('error');
    }
  }, [doc, onChanged]);

  const queueSave = useCallback((patch: { title?: string; content?: string }) => {
    if (!canEdit) return;
    dirty.current = { ...dirty.current, ...patch };
    setSaveState('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  }, [canEdit, flush]);

  // Guardar al cerrar
  const close = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await flush();
    onOpenChange(false);
  }, [flush, onOpenChange]);

  // Minimizar a la barra inferior (igual que tareas e ideas): guarda lo pendiente y cierra.
  const minimizeDoc = useCallback(() => {
    if (!doc) return;
    minimize({ id: doc.id, type: 'doc', title: title || doc.title || 'Documento', subtitle: doc.client?.name || undefined, clientId: doc.client_id ?? null });
    void close();
  }, [doc, title, minimize, close]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /** Cambios de propiedades: se guardan al instante. */
  const saveProps = useCallback(async (patch: DocumentUpdate, local: Partial<NexusDocument> = {}) => {
    if (!doc) return;
    const prev = doc;
    const next = { ...doc, ...local, ...(patch as Partial<NexusDocument>) };
    setDoc(next);
    setSaveState('saving');
    try {
      await documentApi.update(doc.id, patch);
      setSaveState('saved');
      onChanged?.({ id: doc.id, ...local, ...(patch as Partial<NexusDocument>), ...(patch.archived !== undefined ? { archived_at: patch.archived ? new Date().toISOString() : null } : {}) });
    } catch {
      setDoc(prev);
      setSaveState('error');
    }
  }, [doc, onChanged]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || !doc) return;
    const tags = doc.tags || [];
    if (!tags.some(x => x.toLowerCase() === t.toLowerCase())) saveProps({ tags: [...tags, t] });
    setTagDraft('');
  };

  const linkTask = async (taskId: string) => {
    if (!doc) return;
    const t = await documentApi.linkTask(doc.id, taskId);
    const linked = [...(doc.linked_tasks || []).filter(x => x.id !== t.id), t];
    setDoc({ ...doc, linked_tasks: linked, client_id: doc.client_id || t.client_id });
    onChanged?.({ id: doc.id, linked_tasks: linked });
  };
  const unlinkTask = async (taskId: string) => {
    if (!doc) return;
    const linked = (doc.linked_tasks || []).filter(x => x.id !== taskId);
    setDoc({ ...doc, linked_tasks: linked });
    onChanged?.({ id: doc.id, linked_tasks: linked });
    await documentApi.unlinkTask(doc.id, taskId).catch(() => {});
  };

  const handleDelete = async () => {
    if (!doc) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await documentApi.remove(doc.id);
    onDeleted?.(doc.id);
    onOpenChange(false);
  };

  const copyLink = () => {
    if (!doc) return;
    navigator.clipboard?.writeText(`${window.location.origin}/documentos?doc=${doc.id}`).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };

  const clientOptions: MenuOption[] = useMemo(() => [
    { key: '', label: 'Sin cliente' },
    ...clients.map(c => ({ key: c.id, label: c.name, icon: Building2 })),
  ], [clients]);

  const kind = docKind(doc?.kind);
  const KindIcon = kind.icon;
  const isNote = doc?.kind === 'nota';
  const cols = `${leftOpen ? '300px' : '48px'} minmax(0,1fr) ${rightOpen ? 'minmax(300px,360px)' : '48px'}`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent showCloseButton={false} className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-dvh w-screen max-w-none! flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-none">
        {!doc ? (
          <div className="flex flex-1 items-center justify-center p-10">
            <DialogTitle className="sr-only">Documento</DialogTitle>
            {loadError ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-destructive">{loadError}</p>
                <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cerrar</Button>
              </div>
            ) : <div className="w-full max-w-3xl"><ContentSkeleton variant="form" label="Cargando documento" /></div>}
          </div>
        ) : (
          <>
            {/* ===== Header ===== */}
            <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-card px-4 py-2.5 md:px-5">
              <Popover width={232} trigger={({ toggle }) => (
                <button type="button" onClick={canEdit ? toggle : undefined} title={canEdit ? 'Cambiar ícono' : undefined}
                  className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg', kind.bgClass, kind.colorClass)}
                  style={isNote && doc.color ? { backgroundColor: doc.color, color: '#1e293b' } : undefined}>
                  {doc.icon || <KindIcon className="h-5 w-5" />}
                </button>
              )}>
                {closeMenu => (
                  <div className="grid grid-cols-8 gap-1 p-1">
                    {EMOJIS.map(e => (
                      <button key={e} type="button" onClick={() => { closeMenu(); saveProps({ icon: e }); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-muted">{e}</button>
                    ))}
                    <button type="button" onClick={() => { closeMenu(); saveProps({ icon: null }); }} className="col-span-8 mt-1 rounded-lg py-1 text-xs text-muted-foreground hover:bg-muted">Quitar ícono</button>
                  </div>
                )}
              </Popover>

              <div className="min-w-[200px] flex-1">
                <DialogTitle className="sr-only">{title || 'Documento'}</DialogTitle>
                <input
                  value={title}
                  readOnly={!canEdit}
                  onChange={e => { setTitle(e.target.value); queueSave({ title: e.target.value }); }}
                  placeholder="Título del documento"
                  className="w-full truncate bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/60"
                />
                <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  <span className={cn('font-semibold', kind.colorClass)}>{kind.label}</span>
                  {doc.client && <><span>·</span><span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{doc.client.name}</span></>}
                  <span>·</span>
                  <span>
                    {saveState === 'saving' ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Guardando…</span>
                      : saveState === 'saved' ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Check className="h-3 w-3" /> Guardado</span>
                      : saveState === 'error' ? <span className="text-destructive">No se pudo guardar</span>
                      : `Editado ${timeAgo(doc.updated_at)}${doc.last_editor ? ` por ${doc.last_editor.full_name}` : ''}`}
                  </span>
                  {!canEdit && <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">Solo lectura</span>}
                  {doc.archived_at && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">Archivado</span>}
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full" title="Minimizar a la barra inferior" onClick={minimizeDoc}>
                  <Minus className="h-4 w-4" /> <span className="hidden sm:inline">Minimizar</span>
                </Button>
                <div className="w-[160px]">
                  <Menu value={doc.status || 'borrador'} options={STATUS_OPTIONS} disabled={!canEdit}
                    onChange={k => saveProps({ status: k as DocumentStatus })} />
                </div>
                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" title={doc.is_favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  onClick={() => saveProps({ favorite: !doc.is_favorite }, { is_favorite: !doc.is_favorite })}>
                  <Star className={cn('h-4 w-4', doc.is_favorite && 'fill-amber-400 text-amber-400')} />
                </Button>
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 rounded-full" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Compartir</span>
                </Button>
                <Popover width={220} trigger={({ toggle }) => (
                  <Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" onClick={toggle} title="Más opciones"><MoreHorizontal className="h-4 w-4" /></Button>
                )}>
                  {closeMenu => (
                    <div className="space-y-0.5">
                      <button type="button" onClick={() => { closeMenu(); copyLink(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                        <Copy className="h-4 w-4" /> {copied ? '¡Copiado!' : 'Copiar enlace'}
                      </button>
                      <button type="button" onClick={() => { closeMenu(); window.open(`/documentos?doc=${doc.id}`, '_blank'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                        <ExternalLink className="h-4 w-4" /> Abrir en pestaña nueva
                      </button>
                      {canEdit && (
                        <button type="button" onClick={() => { closeMenu(); saveProps({ archived: !doc.archived_at }, { archived_at: doc.archived_at ? null : new Date().toISOString() }); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted">
                          {doc.archived_at ? <><ArchiveRestore className="h-4 w-4" /> Restaurar</> : <><Archive className="h-4 w-4" /> Archivar</>}
                        </button>
                      )}
                    </div>
                  )}
                </Popover>
                <DialogClose render={<Button variant="ghost" size="sm" className="h-9 w-9 rounded-full p-0" title="Cerrar" />}>
                  <X className="h-4 w-4" /><span className="sr-only">Cerrar</span>
                </DialogClose>
              </div>
            </div>

            {/* ===== Body ===== */}
            <div style={{ ['--cols' as string]: cols }}
              className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto bg-background p-3 transition-[grid-template-columns] duration-300 ease-out md:p-4 lg:overflow-hidden lg:[grid-template-columns:var(--cols)]">

              {/* PROPIEDADES */}
              <aside className="flex min-h-0 flex-col overflow-hidden">
                {!leftOpen && (
                  <button type="button" onClick={() => setLeftOpen(true)} title="Mostrar propiedades"
                    className="hidden h-full w-full flex-col items-center gap-3 rounded-2xl bg-card py-3 text-muted-foreground hover:text-foreground lg:flex">
                    <PanelLeftOpen className="h-4 w-4" />
                    <span className="text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">Propiedades</span>
                  </button>
                )}
                <div className={cn('flex min-h-0 flex-1 flex-col', !leftOpen && 'lg:hidden')}>
                  <div className="mb-2 hidden shrink-0 items-center justify-between px-1 lg:flex">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Propiedades</span>
                    <button type="button" onClick={() => setLeftOpen(false)} title="Ocultar" className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftClose className="h-4 w-4" /></button>
                  </div>
                  <Scroller className="flex-1" innerClassName="space-y-3 pb-24">
                    <Module icon={Settings2} title="Detalle" tone="text-tint-blue-foreground" toneBg="bg-tint-blue" className="bg-card">
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Tipo</p>
                          <Menu value={doc.kind || 'documento'} options={KIND_OPTIONS} disabled={!canEdit} onChange={k => saveProps({ kind: k as DocumentKind })} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Cliente</p>
                          <Menu value={doc.client_id || ''} options={clientOptions} disabled={!canEdit}
                            onChange={k => saveProps({ client_id: k || null }, { client: clients.find(c => c.id === k) as any || null })} />
                        </div>
                        {isNote && (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Color</p>
                            <div className="flex flex-wrap gap-1.5">
                              {NOTE_COLORS.map(c => (
                                <button key={c} type="button" disabled={!canEdit} onClick={() => saveProps({ color: c })}
                                  className={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition', doc.color === c ? 'ring-2 ring-primary' : 'ring-1 ring-border')}
                                  style={{ backgroundColor: c }} aria-label={`Color ${c}`} />
                              ))}
                            </div>
                          </div>
                        )}
                        {isOwner && (
                          <button type="button" onClick={() => saveProps({ is_public: !doc.is_public })}
                            className="flex w-full items-center justify-between rounded-xl bg-surface-inset px-3 py-2 text-left text-xs hover:bg-muted">
                            <span className="flex items-center gap-2">
                              {doc.is_public ? <Globe className="h-3.5 w-3.5 text-emerald-500" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                              <span><span className="font-semibold">{doc.is_public ? 'Visible en mi perfil' : 'Privado'}</span>
                                <span className="block text-[10px] text-muted-foreground">{doc.is_public ? 'Aparece en tu perfil público' : 'Solo vos y quienes lo compartas'}</span></span>
                            </span>
                            <span className="text-[10px] text-primary">Cambiar</span>
                          </button>
                        )}
                      </div>
                    </Module>

                    <Module icon={Tag} title="Etiquetas" tone="text-tint-red-foreground" toneBg="bg-tint-red" className="bg-card">
                      <div className="flex flex-wrap gap-1.5">
                        {(doc.tags || []).map(t => (
                          <span key={t} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', tagClass(t))}>
                            {t}
                            {canEdit && <button type="button" onClick={() => saveProps({ tags: (doc.tags || []).filter(x => x !== t) })} className="opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>}
                          </span>
                        ))}
                        {(doc.tags || []).length === 0 && !canEdit && <span className="text-xs text-muted-foreground">Sin etiquetas</span>}
                      </div>
                      {canEdit && (
                        <form className="mt-2 flex items-center gap-1.5" onSubmit={e => { e.preventDefault(); addTag(); }}>
                          <input value={tagDraft} onChange={e => setTagDraft(e.target.value)} placeholder="Nueva etiqueta…" maxLength={40}
                            className="h-8 min-w-0 flex-1 rounded-lg bg-surface-inset px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
                          <Button type="submit" size="sm" variant="ghost" className="h-8 w-8 rounded-lg p-0" disabled={!tagDraft.trim()}><Plus className="h-4 w-4" /></Button>
                        </form>
                      )}
                    </Module>

                    <Module icon={Link2} title={`Tareas vinculadas (${doc.linked_tasks?.length || 0})`} tone="text-tint-teal-foreground" toneBg="bg-tint-teal" className="bg-card"
                      right={<Button size="sm" variant="ghost" className="h-7 gap-1 rounded-lg px-2 text-xs" onClick={() => setTaskPickerOpen(true)}><Plus className="h-3.5 w-3.5" /> Vincular</Button>}>
                      {(doc.linked_tasks || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">Todavía no está adjunto a ninguna tarea.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(doc.linked_tasks || []).map(t => {
                            const st = taskStatusConfig(t.status as any);
                            return (
                              <div key={t.id} className="group flex items-center gap-2 rounded-xl bg-surface-inset px-2.5 py-2">
                                <span className={cn('h-2 w-2 shrink-0 rounded-full', st.dotColor)} />
                                <button type="button" onClick={async () => { await close(); router.push(`/operations?task=${t.id}`); }} className="min-w-0 flex-1 text-left">
                                  <span className="block truncate text-xs font-medium hover:text-primary">{t.title}</span>
                                  <span className="text-[10px] text-muted-foreground">{st.label}</span>
                                </button>
                                <button type="button" onClick={() => unlinkTask(t.id)} title="Desvincular" className="rounded-md p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Module>

                    <Module icon={Users2} title="Personas" tone="text-tint-amber-foreground" toneBg="bg-tint-amber" className="bg-card">
                      <div className="divide-y divide-border">
                        <Row label="Creado por">
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar className="h-5 w-5"><AvatarImage src={doc.owner?.avatar_url} /><AvatarFallback className="text-[9px]">{doc.owner?.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                            <span className="truncate text-xs font-medium">{doc.owner?.full_name || '—'}</span>
                          </span>
                        </Row>
                        <Row label="Compartido con">
                          {(doc.shared_users || []).length === 0 ? <span className="text-xs text-muted-foreground">Nadie</span> : (
                            <span className="flex -space-x-1.5">
                              {(doc.shared_users || []).slice(0, 6).map(u => (
                                <Avatar key={u.id} className="h-6 w-6 ring-2 ring-card" title={u.full_name}><AvatarImage src={u.avatar_url} /><AvatarFallback className="text-[9px]">{u.full_name?.charAt(0)}</AvatarFallback></Avatar>
                              ))}
                            </span>
                          )}
                        </Row>
                        <Row label="Creado"><span className="text-xs">{fmt(doc.created_at)}</span></Row>
                        <Row label="Última edición"><span className="text-xs">{fmt(doc.updated_at)}</span></Row>
                      </div>
                    </Module>

                    {isOwner || user?.role === 'admin' ? (
                      <div className="px-1">
                        {confirmDelete ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">¿Eliminar para siempre?</span>
                            <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={() => setConfirmDelete(false)}>No</Button>
                            <Button variant="destructive" size="sm" className="h-7 rounded-lg text-xs" onClick={handleDelete}>Sí, eliminar</Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-lg text-xs text-red-500 hover:text-red-600" onClick={handleDelete}>
                            <Trash2 className="h-3.5 w-3.5" /> Eliminar documento
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </Scroller>
                </div>
              </aside>

              {/* EDITOR */}
              <div className="min-h-0 overflow-hidden rounded-[1.25rem] border border-border bg-card lg:flex lg:flex-col">
                <div className="h-full overflow-y-auto" style={isNote && doc.color ? { backgroundImage: `linear-gradient(${doc.color}55, transparent 220px)` } : undefined}>
                  <div className="mx-auto max-w-[860px] px-2 pb-20 pt-3">
                    <DocumentEditor
                      key={doc.id}
                      compact
                      initialContent={content}
                      readOnly={!canEdit}
                      onChange={(html) => { setContent(html); queueSave({ content: html }); }}
                    />
                  </div>
                </div>
              </div>

              {/* COMENTARIOS */}
              <CommentsPanel docId={doc.id} open={rightOpen} onToggle={setRightOpen} users={team} meId={user?.id} canModerate={isOwner || user?.role === 'admin'} />
            </div>

            <DocumentShareDialog
              document={shareOpen ? doc : null}
              isOwner={isOwner}
              onShared={() => {
                setShareOpen(false);
                documentApi.get(doc.id).then(d => { setDoc(prev => prev ? { ...prev, shared_users: d.shared_users } : prev); onChanged?.({ id: doc.id, shared_users: d.shared_users }); }).catch(() => {});
              }}
            />
            <TaskPickerDialog open={taskPickerOpen} onOpenChange={setTaskPickerOpen} clientId={doc.client_id}
              excludeIds={(doc.linked_tasks || []).map(t => t.id)} onPick={t => linkTask(t.id)} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Comentarios ---------------- */

function CommentsPanel({ docId, open, onToggle, users, meId, canModerate }: {
  docId: string; open: boolean; onToggle: (o: boolean) => void;
  users: { id: string; full_name: string; email: string }[]; meId?: string; canModerate: boolean;
}) {
  const { comments, loading, add, toggleResolved, remove } = useDocumentComments(docId);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<DocumentComment | null>(null);
  const [sending, setSending] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const visible = comments.filter(c => showResolved || !c.resolved);
  const resolvedCount = comments.filter(c => c.resolved).length;

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await add(text.trim(), replyTo?.id); setText(''); setReplyTo(null); }
    finally { setSending(false); }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => onToggle(true)} title="Mostrar comentarios"
        className="hidden h-full w-full flex-col items-center gap-3 rounded-2xl bg-card py-3 text-muted-foreground hover:text-foreground lg:flex">
        <PanelRightOpen className="h-4 w-4" />
        <MessageSquare className="h-4 w-4" />
        {comments.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{comments.length}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-widest [writing-mode:vertical-rl]">Comentarios</span>
      </button>
    );
  }

  return (
    <div className="flex h-[60vh] min-h-0 flex-col overflow-hidden rounded-[1.25rem] border border-border bg-card p-4 lg:h-auto">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-tint-sky"><MessageSquare className="h-3.5 w-3.5 text-tint-sky-foreground" /></span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Comentarios ({comments.length})</h3>
        <button type="button" onClick={() => onToggle(false)} title="Ocultar" className="ml-auto hidden rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground lg:block"><PanelRightClose className="h-4 w-4" /></button>
      </div>
      {resolvedCount > 0 && (
        <button type="button" onClick={() => setShowResolved(v => !v)} className="mb-2 self-start text-[11px] text-primary hover:underline">
          {showResolved ? 'Ocultar resueltos' : `Ver ${resolvedCount} resuelto${resolvedCount === 1 ? '' : 's'}`}
        </button>
      )}
      <Scroller className="mb-3 flex-1" innerClassName="space-y-3">
        {loading && comments.length === 0 ? <ContentSkeleton variant="comments" label="Cargando comentarios" />
          : visible.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground/70">Sin comentarios. Usá @ para mencionar a alguien.</p>}
        {visible.map(c => (
          <div key={c.id} className={cn('rounded-2xl bg-surface-inset p-3', c.resolved && 'opacity-60')}>
            <CommentBody c={c} meId={meId} canModerate={canModerate} onDelete={remove} />
            <div className="mt-2 flex items-center gap-3 pl-8 text-[11px]">
              <button type="button" onClick={() => setReplyTo(c)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Reply className="h-3 w-3" /> Responder</button>
              <button type="button" onClick={() => toggleResolved(c.id, !c.resolved)} className={cn('inline-flex items-center gap-1', c.resolved ? 'text-emerald-600' : 'text-muted-foreground hover:text-foreground')}>
                {c.resolved ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />} {c.resolved ? 'Resuelto' : 'Resolver'}
              </button>
            </div>
            {(c.replies || []).length > 0 && (
              <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
                {(c.replies || []).map(r => <CommentBody key={r.id} c={r} meId={meId} canModerate={canModerate} onDelete={remove} small />)}
              </div>
            )}
          </div>
        ))}
      </Scroller>
      <div className="shrink-0 space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-lg bg-surface-inset px-3 py-1.5 text-xs text-muted-foreground">
            <Reply className="h-3 w-3" /> Respondiendo a <strong>{replyTo.user?.full_name || 'Usuario'}</strong>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground"><X className="h-3 w-3" /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <MentionTextarea value={text} onChange={setText} users={users} rows={1} disabled={sending}
            placeholder={replyTo ? 'Escribí tu respuesta…' : 'Comentá o mencioná con @…'}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <Button size="sm" onClick={send} disabled={sending || !text.trim()} className="h-9 w-9 shrink-0 rounded-full p-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CommentBody({ c, meId, canModerate, onDelete, small }: { c: DocumentComment; meId?: string; canModerate: boolean; onDelete: (id: string) => void; small?: boolean }) {
  return (
    <div className="group flex gap-2">
      <Avatar className={small ? 'h-5 w-5' : 'h-6 w-6'}>
        <AvatarImage src={c.user?.avatar_url} />
        <AvatarFallback className="text-[9px]">{c.user?.full_name?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs">
          <span className="font-semibold">{c.user?.full_name || 'Usuario'}</span>
          <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
          {(c.user_id === meId || canModerate) && (
            <button type="button" onClick={() => onDelete(c.id)} title="Eliminar" className="ml-auto rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
          )}
        </p>
        <MentionedText text={c.content} className="mt-0.5 block text-sm text-foreground/90" />
      </div>
    </div>
  );
}
