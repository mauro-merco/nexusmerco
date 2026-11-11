'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, ExternalLink, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export function CalendarMonthFolder({ clientId, calendarType, month, shareToken, viewerAuthToken }: { clientId: string; calendarType: 'social' | 'ads'; month: string; shareToken?: string; viewerAuthToken?: string }) {
  const { user, token } = useAuthStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canEdit = !shareToken && (user?.role === 'admin' || user?.role === 'operador');

  useEffect(() => {
    const controller = new AbortController();
    setUrl(''); setTitle(''); setError('');
    const load = async () => {
      try {
        const authToken = shareToken ? viewerAuthToken : token;
        if (shareToken && !authToken) throw new Error('Inicia sesion para ver la carpeta');
        const endpoint = shareToken ? `/api/calendar-links/${encodeURIComponent(shareToken)}/folders?type=${calendarType}&month=${encodeURIComponent(month)}` : `/api/calendar-month-folders?client_id=${clientId}&calendar_type=${calendarType}&month=${month}`;
        const res = await fetch(endpoint, { signal: controller.signal, cache: 'no-store', headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'No se pudo cargar la carpeta');
        setUrl(json.data?.folder_url || ''); setTitle(json.data?.title || '');
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar la carpeta');
      }
    };
    void load();
    return () => controller.abort();
  }, [clientId, calendarType, month, shareToken, viewerAuthToken, token]);

  if (error) return <p role="alert" className="mb-4 text-sm text-destructive">Carpeta del mes: {error}</p>;
  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/calendar-month-folders', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ client_id: clientId, calendar_type: calendarType, month, folder_url: url, title }) });
      if (!res.ok) throw new Error('Error');
    } finally { setSaving(false); }
  };

  return <div className="mb-4 rounded-2xl border bg-card p-3"><div className="flex flex-col gap-2 md:flex-row md:items-center"><div className="flex items-center gap-2 font-semibold"><FolderOpen className="h-4 w-4 text-primary" /> Carpeta del mes</div><input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} placeholder={`Contenido ${month}`} className="h-9 rounded-xl border bg-background px-3 text-sm md:w-52" /><input value={url} onChange={e => setUrl(e.target.value)} disabled={!canEdit} placeholder="Link de Drive / carpeta" className="h-9 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" />{url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-3 text-sm"><ExternalLink className="h-3.5 w-3.5" /> Abrir</a>}{canEdit && <button onClick={save} disabled={saving} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-gradient-tech px-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar</button>}</div></div>;
}
