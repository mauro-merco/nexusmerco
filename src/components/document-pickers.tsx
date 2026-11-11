'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ContentSkeleton } from '@/components/content-skeleton';
import { cn } from '@/lib/utils';
import { taskStatusConfig } from '@/lib/task-config';
import { docKind, docStatus } from '@/lib/document-config';
import { useAuthStore } from '@/store/auth-store';
import { Search, Building2, Link2, Check } from 'lucide-react';
import type { NexusDocument, DocumentLinkedTask } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

type PickerTask = DocumentLinkedTask & { client?: { name: string } | null };

/** Elegir una tarea existente para vincular a un documento. */
export function TaskPickerDialog({ open, onOpenChange, clientId, excludeIds = [], onPick }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId?: string | null;
  excludeIds?: string[];
  onPick: (task: PickerTask) => Promise<void> | void;
}) {
  const [tasks, setTasks] = useState<PickerTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [onlyClient, setOnlyClient] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const url = clientId && onlyClient ? `/api/tasks?client_id=${clientId}` : '/api/tasks';
    fetch(url, { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setTasks(j.data || []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [open, clientId, onlyClient]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return tasks
      .filter(t => !excludeIds.includes(t.id))
      .filter(t => !nq || norm(`${t.title} ${t.client?.name || ''}`).includes(nq))
      .slice(0, 80);
  }, [tasks, q, excludeIds]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[1.6rem] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Vincular a una tarea</DialogTitle>
          <DialogDescription>El documento va a aparecer dentro de la tarea, y la tarea dentro del documento.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar tarea…" className="h-10 rounded-xl border-0 bg-surface-inset pl-9" />
        </div>
        {clientId && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={onlyClient} onChange={e => setOnlyClient(e.target.checked)} className="accent-[var(--primary)]" />
            Solo tareas de este cliente
          </label>
        )}
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {loading ? <ContentSkeleton /> : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay tareas para mostrar</p>
          ) : list.map(t => {
            const st = taskStatusConfig(t.status as any);
            return (
              <button key={t.id} type="button" disabled={!!busy}
                onClick={async () => { setBusy(t.id); try { await onPick(t); onOpenChange(false); } finally { setBusy(null); } }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-60">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', st.dotColor || 'bg-slate-400')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.title}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {t.client?.name && <><Building2 className="h-3 w-3" />{t.client.name} · </>}{st.label}
                  </span>
                </span>
                {busy === t.id && <span className="text-[11px] text-primary">Vinculando…</span>}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Elegir un documento existente para adjuntar a una tarea. */
export function DocumentPickerDialog({ open, onOpenChange, clientId, excludeIds = [], onPick }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clientId?: string | null;
  excludeIds?: string[];
  onPick: (doc: NexusDocument) => Promise<void> | void;
}) {
  const [docs, setDocs] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/documents', { headers: authHeaders() })
      .then(r => r.json())
      .then(j => setDocs(j.data || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [open]);

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return docs
      .filter(d => !excludeIds.includes(d.id) && !d.archived_at)
      .filter(d => !nq || norm(`${d.title} ${(d.tags || []).join(' ')} ${d.client?.name || ''}`).includes(nq))
      // Primero los del mismo cliente
      .sort((a, b) => Number(b.client_id === clientId) - Number(a.client_id === clientId))
      .slice(0, 80);
  }, [docs, q, excludeIds, clientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[1.6rem] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Adjuntar documento existente</DialogTitle>
          <DialogDescription>Elegí un documento o nota. Se vincula con la tarea en los dos sentidos.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por título, etiqueta o cliente…" className="h-10 rounded-xl border-0 bg-surface-inset pl-9" />
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {loading ? <ContentSkeleton /> : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay documentos para mostrar</p>
          ) : list.map(d => {
            const k = docKind(d.kind); const KIcon = k.icon; const st = docStatus(d.status);
            return (
              <button key={d.id} type="button" disabled={!!busy}
                onClick={async () => { setBusy(d.id); try { await onPick(d); onOpenChange(false); } finally { setBusy(null); } }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-60">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm', k.bgClass, k.colorClass)}>
                  {d.icon || <KIcon className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.title}</span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    {k.label} · {st.label}{d.client?.name ? ` · ${d.client.name}` : ''}
                  </span>
                </span>
                {d.client_id && d.client_id === clientId && <span className="rounded-full bg-tint-blue px-2 py-0.5 text-[10px] font-semibold text-tint-blue-foreground">Mismo cliente</span>}
                {busy === d.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
