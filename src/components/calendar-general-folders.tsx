'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

type Folder = { id: string; title: string; folder_url: string };

export function CalendarGeneralFolders({ clientId, shareToken, viewerAuthToken, calendarType = 'social' }: { clientId: string; shareToken?: string; viewerAuthToken?: string; calendarType?: 'social' | 'ads' }) {
  const { user, token } = useAuthStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const canEdit = !shareToken && (user?.role === 'admin' || user?.role === 'operador');
  const endpoint = shareToken ? `/api/calendar-links/${encodeURIComponent(shareToken)}/folders?kind=general&type=${calendarType}` : `/api/calendar-general-folders?client_id=${clientId}`;
  const authToken = shareToken ? viewerAuthToken : token;
  const load = async (signal?: AbortSignal) => {
    setError('');
    try {
      if (shareToken && !authToken) throw new Error('Inicia sesion para ver las carpetas');
      const res = await fetch(endpoint, { signal, cache: 'no-store', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las carpetas');
      setFolders(json.data || []);
    } catch (e) {
      if (signal?.aborted) return;
      setFolders([]);
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las carpetas');
    }
  };
  useEffect(() => { const controller = new AbortController(); setFolders([]); void load(controller.signal); return () => controller.abort(); }, [endpoint, authToken]);
  if (error) return <p role="alert" className="mb-4 text-sm text-destructive">Carpetas generales: {error}</p>;
  const add = async () => {
    if (!title.trim() || !url.trim()) return;
    await fetch('/api/calendar-general-folders', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ client_id: clientId, title, folder_url: url }) });
    setTitle(''); setUrl(''); load();
  };
  const del = async (id: string) => { await fetch(`/api/calendar-general-folders?id=${id}`, { method: 'DELETE', headers: token ? { Authorization: `Bearer ${token}` } : {} }); load(); };
  return <div className="mb-4 rounded-2xl border bg-card p-3"><div className="mb-2 flex items-center gap-2 font-semibold"><FolderOpen className="h-4 w-4 text-primary" /> Carpetas generales</div>{canEdit && <div className="mb-3 grid gap-2 md:grid-cols-[180px_1fr_auto]"><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nombre" className="h-9 rounded-xl border bg-background px-3 text-sm" /><input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link" className="h-9 rounded-xl border bg-background px-3 text-sm" /><button onClick={add} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-gradient-tech px-3 text-sm font-semibold text-white"><Plus className="h-3.5 w-3.5" /> Agregar</button></div>}<div className="flex flex-wrap gap-2">{folders.length === 0 ? <p className="text-xs text-muted-foreground">Sin carpetas generales.</p> : folders.map(f => <span key={f.id} className="inline-flex items-center gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm"><a href={f.folder_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /> {f.title}</a>{canEdit && <button onClick={() => del(f.id)} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>}</span>)}</div></div>;
}
