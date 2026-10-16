'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, FolderOpen, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

type MaterialLink = { id: string; title: string; url: string };

export function MaterialLinks({
  entityType,
  entityId,
  readOnly = false,
}: {
  entityType: 'task' | 'social_idea' | 'ads_idea';
  entityId: string;
  readOnly?: boolean;
}) {
  const { user, token } = useAuthStore();
  const [links, setLinks] = useState<MaterialLink[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canEdit = !readOnly && (user?.role === 'admin' || user?.role === 'operador');
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/material-links?entity_type=${entityType}&entity_id=${entityId}`, { headers: authHeaders })
      .then(r => r.json())
      .then(j => setLinks(j.data || []))
      .catch(() => setLinks([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId, token]);

  useEffect(() => { if (token) load(); else { setLinks([]); setLoading(false); } }, [load, token]);

  if (!token) return null;

  const add = async () => {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/material-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, title, url }),
      });
      if (res.ok) { setTitle(''); setUrl(''); load(); }
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await fetch(`/api/material-links?id=${id}`, { method: 'DELETE', headers: authHeaders });
    load();
  };

  return (
    <div className="rounded-2xl border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <FolderOpen className="h-4 w-4 text-primary" /> Material de la {entityType === 'task' ? 'tarea' : 'idea'}
      </div>
      {canEdit && (
        <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre" className="h-9 rounded-xl border bg-background px-3 text-sm" />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link o carpeta (Drive...)" className="h-9 rounded-xl border bg-background px-3 text-sm" />
          <button type="button" onClick={add} disabled={saving} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-gradient-tech px-3 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Agregar
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          : links.length === 0 ? <p className="text-xs text-muted-foreground">Sin material cargado.</p>
          : links.map(f => (
            <span key={f.id} className="inline-flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm">
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-primary">
                <ExternalLink className="h-3.5 w-3.5" /> {f.title}
              </a>
              {canEdit && <button type="button" onClick={() => del(f.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}
            </span>
          ))}
      </div>
    </div>
  );
}
