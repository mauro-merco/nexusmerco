'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useDocuments } from '@/lib/hooks/use-documents';
import { useClients } from '@/lib/hooks/use-clients';
import { DocumentEditor } from '@/components/document-editor';
import { DocumentShareDialog } from '@/components/document-share-dialog';
import { DocumentAiDialog, type AiInsertMode } from '@/components/document-ai-dialog';
import { StickyNotes } from '@/components/sticky-notes';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { Label } from '@/components/ui/label';
import type { NexusDocument } from '@/lib/types';
import {
  FileText, Plus, Share2, Trash2, ArrowLeft, Loader2, Search,
  Clock, User, Save, Users, Sparkles, StickyNote, Globe, Building2, Eye,
} from 'lucide-react';

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function DocumentosPage() {
  const { user } = useAuthStore();

  if (!hasModuleAccess(user, 'documentos')) {
    return <NoAccess message="No tienes permiso para acceder a los documentos." />;
  }

  const { documents, loading, createDocument, getDocument, updateDocument, deleteDocument, refetch } = useDocuments();
  const { clients: clientOptions } = useClients();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [tab, setTab] = useState<'docs' | 'notes'>('docs');
  const [currentDoc, setCurrentDoc] = useState<NexusDocument | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [shareTarget, setShareTarget] = useState<NexusDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NexusDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [newDocOpen, setNewDocOpen] = useState(false);
  const [newDocClientId, setNewDocClientId] = useState('');
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = (doc: NexusDocument | null) => !!doc && doc.owner_id === user?.id;

  const filtered = documents.filter((d) => {
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchesClient = !clientFilter ||
      (clientFilter === 'none' ? !d.client_id : d.client_id === clientFilter);
    return matchesSearch && matchesClient;
  });

  const openEditor = useCallback(async (doc: NexusDocument) => {
    try {
      setError(null);
      const full = await getDocument(doc.id);
      setCurrentDoc(full);
      setTitle(full.title);
      setContent(full.content);
      setView('editor');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abrir documento');
    }
  }, [getDocument]);

  const handleNew = useCallback(() => {
    setNewDocClientId('');
    setNewDocOpen(true);
  }, []);

  const handleCreateDoc = useCallback(async () => {
    try {
      const doc = await createDocument('Sin título', '', newDocClientId || null);
      setNewDocOpen(false);
      await openEditor(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear documento');
    }
  }, [createDocument, openEditor, newDocClientId]);

  const handleClientChange = useCallback(async (clientId: string) => {
    if (!currentDoc) return;
    const next = clientId || null;
    setCurrentDoc(prev => prev ? { ...prev, client_id: next } : prev);
    try {
      await updateDocument(currentDoc.id, { client_id: next });
      setSavedAt(new Date());
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al vincular cliente');
    }
  }, [currentDoc, updateDocument, refetch]);

  const [triggerStartNew, setTriggerStartNew] = useState(false);

  const startNewNote = useCallback(() => {
    setTab('notes');
    setTriggerStartNew(true);
  }, []);

  const saveDoc = useCallback(async (t = title, c = content) => {
    if (!currentDoc) return;
    setSaving(true);
    try {
      await updateDocument(currentDoc.id, { title: t, content: c });
      setSavedAt(new Date());
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }, [currentDoc, title, content, updateDocument, refetch]);

  useEffect(() => {
    if (!currentDoc) return;
    if (currentDoc.can_edit === false) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDoc(title, content);
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, content, currentDoc?.id, currentDoc?.can_edit]);

  useEffect(() => {
    if (view !== 'list' || !user?.id) return;
    const docId = new URLSearchParams(window.location.search).get('doc');
    if (!docId) return;
    let cancelled = false;
    (async () => {
      try {
        const full = await getDocument(docId);
        if (cancelled) return;
        setCurrentDoc(full);
        setTitle(full.title);
        setContent(full.content);
        setView('editor');
      } catch {
        /* doc no encontrado o sin acceso */
      }
    })();
    return () => { cancelled = true; };
  }, [view, user?.id, getDocument]);

  const handleBack = () => {
    setView('list');
    setCurrentDoc(null);
    setSavedAt(null);
    if (window.location.search.includes('doc=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleAiGenerated = useCallback((html: string, mode: AiInsertMode) => {
    setContent((prev) => {
      const cur = prev || '';
      if (mode === 'replace' || !cur.trim()) return html;
      return cur + html;
    });
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      if (currentDoc?.id === deleteTarget.id) handleBack();
      refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleteDocument, currentDoc, refetch]);

  // Editor view
  if (view === 'editor' && currentDoc) {
    const owner = isOwner(currentDoc);
    const canEdit = currentDoc.can_edit ?? owner;
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {owner ? (
                  <><User className="h-3.5 w-3.5" /> Mío</>
                ) : (
                  <><Users className="h-3.5 w-3.5" /> Compartido conmigo</>
                )}
                {savedAt && (
                  <span className="flex items-center gap-1">
                    <Save className="h-3 w-3 text-emerald-500" /> Guardado {formatDate(savedAt.toISOString())}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {owner && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const next = !currentDoc.is_public;
                      setCurrentDoc({ ...currentDoc, is_public: next });
                      await updateDocument(currentDoc.id, { is_public: next });
                      refetch();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Error al cambiar visibilidad');
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
                  title={currentDoc.is_public ? 'Ocultar del perfil público' : 'Mostrar en mi perfil público'}
                >
                  <Globe className="h-3.5 w-3.5" />
                  {currentDoc.is_public ? 'Público' : 'Privado'}
                </button>
              )}
              {canEdit && (
                <>
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/15" onClick={() => setAiOpen(true)}>
                    <Sparkles className="h-3.5 w-3.5" /> Asistente IA
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl bg-muted/60 dark:bg-white/[0.06]" onClick={() => setShareTarget(currentDoc)}>
                    <Share2 className="h-3.5 w-3.5" /> Compartir
                  </Button>
                </>
              )}
              {owner && (
                <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400" onClick={() => setDeleteTarget(currentDoc)}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {owner ? (
              <select
                value={currentDoc.client_id || ''}
                onChange={(e) => handleClientChange(e.target.value)}
                className="h-8 max-w-[200px] rounded-xl border-0 bg-muted/50 dark:bg-white/[0.05] px-2.5 text-xs text-foreground focus-visible:outline-none"
              >
                <option value="">Sin cliente</option>
                {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <span className="font-medium text-foreground/80">{currentDoc.client?.name || 'Sin cliente'}</span>
            )}
            {!canEdit && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Eye className="h-3 w-3" /> Solo lectura
              </span>
            )}
          </div>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            'text-2xl font-bold h-auto py-2 px-3 border-0 shadow-none transition-all rounded-xl',
            canEdit ? 'bg-muted/40 dark:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-primary/30' : 'bg-transparent cursor-default'
          )}
          placeholder="Título del documento..."
          readOnly={!canEdit}
        />

        <DocumentEditor
          initialContent={content}
          onChange={setContent}
          readOnly={!canEdit}
        />

        {saving && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
          </div>
        )}

        <DocumentShareDialog
          document={shareTarget}
          isOwner={owner}
          onShared={() => {
            setShareTarget(null);
            refetch();
          }}
        />

        <DocumentAiDialog
          open={aiOpen}
          onOpenChange={setAiOpen}
          onGenerated={handleAiGenerated}
        />

        <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle>Eliminar documento</DialogTitle>
              <DialogDescription>
                ¿Seguro que querés eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" className="rounded-xl gap-2" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Documentos</h1>
        <p className="text-muted-foreground mt-1 text-sm">Documentos y notas del equipo, organizados por cliente.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-muted/40 dark:bg-white/[0.04] p-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setTab('docs')}
            className={cn(
              'flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              tab === 'docs' ? 'bg-background dark:bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-4 w-4" /> Documentos
          </button>
          <button
            type="button"
            onClick={() => setTab('notes')}
            className={cn(
              'flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              tab === 'notes' ? 'bg-background dark:bg-white/[0.08] text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <StickyNote className="h-4 w-4" /> Notas adhesivas
          </button>
        </div>

        <Button onClick={tab === 'notes' ? startNewNote : handleNew} className="gap-2 shrink-0 w-full sm:w-auto rounded-xl">
          <Plus className="h-4 w-4" /> {tab === 'notes' ? 'Nueva nota' : 'Nuevo documento'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="pl-9 rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-10 rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04] px-3 text-sm min-w-[200px]"
          >
            <option value="">Todos los clientes</option>
            <option value="none">Sin cliente</option>
            {clientOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {tab === 'notes' ? (
        <StickyNotes triggerStartNew={triggerStartNew} onTriggerNew={() => setTriggerStartNew(false)} />
      ) : (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="rounded-3xl bg-muted/40 dark:bg-white/[0.04] p-5 space-y-3 h-40 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 rounded-3xl bg-muted/30 dark:bg-white/[0.03]">
              <FileText className="h-12 w-12 opacity-40" />
              <p className="text-base font-medium">No hay documentos</p>
              <Button onClick={handleNew} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Crear el primero
              </Button>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  className="group cursor-pointer rounded-3xl bg-muted/40 dark:bg-white/[0.04] hover:bg-muted/60 dark:hover:bg-white/[0.06] transition-colors p-5 flex flex-col gap-3"
                  onClick={() => openEditor(doc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {doc.client && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-medium px-2 py-0.5">
                          <Building2 className="h-3 w-3" /> {doc.client.name}
                        </span>
                      )}
                      {doc.is_public ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5"><Globe className="h-3 w-3" /> Público</span>
                      ) : doc.is_shared_with_me ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-medium px-2 py-0.5"><Users className="h-3 w-3" /> Compartido</span>
                      ) : doc.shared_users && doc.shared_users.length > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium px-2 py-0.5"><Users className="h-3 w-3" /> {doc.shared_users.length}</span>
                      ) : null}
                    </div>
                  </div>

                  <p className="font-bold text-foreground truncate">{doc.title}</p>

                  <p
                    className="text-xs text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{
                      __html: doc.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').slice(0, 120),
                    }}
                  />

                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={doc.owner?.avatar_url} alt={doc.owner?.full_name} />
                        <AvatarFallback className="text-[9px]">{doc.owner?.full_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="truncate">{doc.owner?.full_name || 'Usuario'}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> {formatDate(doc.updated_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DocumentShareDialog
            document={shareTarget}
            isOwner={isOwner(shareTarget)}
            onShared={() => {
              setShareTarget(null);
              refetch();
            }}
          />
        </>
      )}

      <Dialog open={newDocOpen} onOpenChange={setNewDocOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo documento</DialogTitle>
            <DialogDescription>
              Elegí a qué cliente va a pertenecer este documento (opcional). Los documentos de un cliente están visibles para todo el equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <select
              value={newDocClientId}
              onChange={(e) => setNewDocClientId(e.target.value)}
              className="w-full rounded-xl border-0 bg-muted/50 dark:bg-white/[0.05] px-3 py-2 text-sm focus-visible:outline-none"
            >
              <option value="">Sin cliente (documento personal)</option>
              {clientOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setNewDocOpen(false)}>Cancelar</Button>
            <Button className="rounded-xl" onClick={handleCreateDoc}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
