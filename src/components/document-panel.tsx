'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContentSkeleton } from '@/components/content-skeleton';
import { DocumentModal } from '@/components/document-modal';
import { DocumentPickerDialog } from '@/components/document-pickers';
import { Popover } from '@/components/task-ui';
import { useDocuments, documentApi } from '@/lib/hooks/use-documents';
import { DOC_TEMPLATES, docKind, docStatus, tagClass } from '@/lib/document-config';
import { cn } from '@/lib/utils';
import type { NexusDocument } from '@/lib/types';
import { Plus, Link2, X, MessageSquare, Loader2, FileText } from 'lucide-react';

/**
 * Documentos de un cliente o de una tarea, con crear / adjuntar existente / abrir en pop-up.
 * - `taskId`: documentos vinculados a esa tarea (se pueden desvincular).
 * - `clientId`: documentos del cliente (propios + adjuntos a sus tareas).
 */
export function DocumentPanel({ clientId, taskId, variant = 'list', emptyText, max }: {
  clientId?: string | null;
  taskId?: string | null;
  variant?: 'list' | 'grid';
  emptyText?: string;
  max?: number;
}) {
  const scope = taskId ? { taskId } : { clientId };
  const { documents, loading, refetch, patchLocal, removeLocal } = useDocuments(scope);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = documents.filter(d => !d.archived_at);
  const shown = max && !showAll ? visible.slice(0, max) : visible;

  const create = async (templateKey: string) => {
    const tpl = DOC_TEMPLATES.find(t => t.key === templateKey) || DOC_TEMPLATES[0];
    setCreating(true); setError(null);
    try {
      const doc = await documentApi.create({
        title: tpl.title, content: tpl.content(), kind: tpl.kind, tags: tpl.tags, icon: tpl.key === 'blank' ? null : tpl.icon,
        client_id: clientId || null, task_id: taskId || null,
        color: tpl.kind === 'nota' ? '#FEF3C7' : null,
      });
      await refetch(true);
      setOpenId(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el documento');
    } finally {
      setCreating(false);
    }
  };

  const attachExisting = async (doc: NexusDocument) => {
    if (!taskId) return;
    await documentApi.linkTask(doc.id, taskId);
    await refetch(true);
  };

  const unlink = async (docId: string) => {
    if (!taskId) return;
    removeLocal(docId);
    await documentApi.unlinkTask(docId, taskId).catch(() => refetch(true));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Popover width={260} trigger={({ toggle }) => (
          <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5 rounded-full text-xs" onClick={toggle} disabled={creating}>
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Nuevo
          </Button>
        )}>
          {close => (
            <div className="space-y-0.5">
              {DOC_TEMPLATES.map(t => (
                <button key={t.key} type="button" onClick={() => { close(); create(t.key); }}
                  className="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-muted">
                  <span className="text-base leading-5">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{t.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Popover>
        {taskId && (
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5 rounded-full text-xs" onClick={() => setPickerOpen(true)}>
            <Link2 className="h-3.5 w-3.5" /> Adjuntar existente
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {loading && documents.length === 0 ? <ContentSkeleton /> : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface-inset py-6 text-center">
          <FileText className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">{emptyText || 'Sin documentos todavía'}</p>
        </div>
      ) : (
        <div className={cn(variant === 'grid' ? 'grid grid-cols-1 gap-2 sm:grid-cols-2' : 'space-y-1.5')}>
          {shown.map(d => (
            <DocumentRow key={d.id} doc={d} onOpen={() => setOpenId(d.id)} onUnlink={taskId ? () => unlink(d.id) : undefined} />
          ))}
        </div>
      )}
      {max && visible.length > max && (
        <button type="button" onClick={() => setShowAll(v => !v)} className="text-xs font-medium text-primary hover:underline">
          {showAll ? 'Ver menos' : `Ver todos (${visible.length})`}
        </button>
      )}

      <DocumentModal
        documentId={openId}
        onOpenChange={o => { if (!o) { setOpenId(null); refetch(true); } }}
        onChanged={patch => patchLocal(patch.id, patch)}
        onDeleted={id => removeLocal(id)}
      />
      {taskId && (
        <DocumentPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} clientId={clientId}
          excludeIds={documents.map(d => d.id)} onPick={attachExisting} />
      )}
    </div>
  );
}

export function DocumentRow({ doc, onOpen, onUnlink }: { doc: NexusDocument; onOpen: () => void; onUnlink?: () => void }) {
  const k = docKind(doc.kind); const KIcon = k.icon; const st = docStatus(doc.status);
  return (
    <div className="group flex items-center gap-2.5 rounded-xl bg-surface-inset p-2.5 transition-colors hover:bg-muted">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm', k.bgClass, k.colorClass)}
          style={doc.kind === 'nota' && doc.color ? { backgroundColor: doc.color, color: '#1e293b' } : undefined}>
          {doc.icon || <KIcon className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{doc.title}</span>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-px font-semibold', st.bgClass, st.colorClass)}>
              <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
            </span>
            {(doc.tags || []).slice(0, 2).map(t => <span key={t} className={cn('rounded-full px-1.5 py-px', tagClass(t))}>{t}</span>)}
            {!!doc.comment_count && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{doc.comment_count}</span>}
            <span>{new Date(doc.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
          </span>
        </span>
      </button>
      {onUnlink && (
        <button type="button" onClick={onUnlink} title="Quitar de esta tarea" className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
