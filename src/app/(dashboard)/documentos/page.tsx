'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useDocuments } from '@/lib/hooks/use-documents';
import { DocumentEditor } from '@/components/document-editor';
import { DocumentShareDialog } from '@/components/document-share-dialog';
import { DocumentAiDialog, type AiInsertMode } from '@/components/document-ai-dialog';
import type { NexusDocument } from '@/lib/types';
import {
  FileText, Plus, Share2, Trash2, ArrowLeft, Loader2, Search,
  Clock, User, Save, Users, Sparkles,
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
  const { documents, loading, createDocument, getDocument, updateDocument, deleteDocument, refetch } = useDocuments();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'editor'>('list');
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
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = (doc: NexusDocument | null) => !!doc && doc.owner_id === user?.id;

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

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

  const handleNew = useCallback(async () => {
    try {
      const doc = await createDocument('Sin título', '');
      await openEditor(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear documento');
    }
  }, [createDocument, openEditor]);

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

  // Autosave (debounced)
  useEffect(() => {
    if (!currentDoc) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveDoc(title, content);
    }, 2000);
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [title, content, currentDoc?.id]);

  const handleBack = () => {
    setView('list');
    setCurrentDoc(null);
    setSavedAt(null);
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
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            <div className="h-5 w-px bg-border/50" />
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10" onClick={() => setAiOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Asistente IA
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShareTarget(currentDoc)}>
              <Share2 className="h-3.5 w-3.5" /> Compartir
            </Button>
            {owner && (
              <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => setDeleteTarget(currentDoc)}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
            )}
          </div>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold h-auto py-2 px-0 border-0 shadow-none focus-visible:ring-0"
          placeholder="Título del documento..."
          readOnly={false}
        />

        <DocumentEditor
          initialContent={content}
          onChange={setContent}
          readOnly={false}
        />

        {saving && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-background border px-3 py-1.5 text-xs text-muted-foreground shadow-lg">
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar documento</DialogTitle>
              <DialogDescription>
                ¿Seguro que querés eliminar <strong>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-gradient-tech text-2xl md:text-3xl font-bold tracking-tight">Centro de Documentos</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Creá y organizá tus documentos. Compartilos con otros usuarios.
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nuevo documento
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar documentos..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <FileText className="h-12 w-12 opacity-40" />
          <p className="text-base font-medium">No hay documentos</p>
          <Button onClick={handleNew} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" /> Crear el primero
          </Button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 bg-card/50 backdrop-blur-xl"
              onClick={() => openEditor(doc)}
            >
              <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {doc.is_shared_with_me ? (
                    <Badge variant="secondary" className="text-[10px]"><Users className="h-3 w-3 mr-1" /> Compartido</Badge>
                  ) : doc.shared_users && doc.shared_users.length > 0 ? (
                    <Badge variant="outline" className="text-[10px]"><Users className="h-3 w-3 mr-1" /> {doc.shared_users.length}</Badge>
                  ) : null}
                </div>

                <div className="min-w-0">
                  <p className="font-bold truncate">{doc.title}</p>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 prose prose-sm max-w-none"
                   dangerouslySetInnerHTML={{
                     __html: doc.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').slice(0, 120),
                   }}
                />

                <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground border-t">
                  <div className="flex items-center gap-2 min-w-0">
                    {doc.owner?.avatar_url ? (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={doc.owner.avatar_url} alt={doc.owner.full_name} />
                        <AvatarFallback className="text-[9px]">{doc.owner.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[9px]">{doc.owner?.full_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="truncate">{doc.owner?.full_name || 'Usuario'}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" /> {formatDate(doc.updated_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
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
    </div>
  );
}
