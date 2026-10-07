'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, ExternalLink, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export function CalendarMonthFolder({ clientId, calendarType, month }: { clientId: string; calendarType: 'social' | 'ads'; month: string }) {
  const { user, token } = useAuthStore();
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const canEdit = user?.role === 'admin' || user?.role === 'operador';

  useEffect(() => {
    fetch(`/api/calendar-month-folders?client_id=${clientId}&calendar_type=${calendarType}&month=${month}`)
      .then(r => r.json())
      .then(json => { setUrl(json.data?.folder_url || ''); setTitle(json.data?.title || ''); })
      .catch(() => undefined);
  }, [clientId, calendarType, month]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/calendar-month-folders', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ client_id: clientId, calendar_type: calendarType, month, folder_url: url, title }) });
      if (!res.ok) throw new Error('Error');
    } finally { setSaving(false); }
  };

  return <div className="mb-4 rounded-2xl border bg-card p-3"><div className="flex flex-col gap-2 md:flex-row md:items-center"><div className="flex items-center gap-2 font-semibold"><FolderOpen className="h-4 w-4 text-primary" /> Carpeta del mes</div><input value={title} onChange={e => setTitle(e.target.value)} disabled={!canEdit} placeholder={`Contenido ${month}`} className="h-9 rounded-xl border bg-background px-3 text-sm md:w-52" /><input value={url} onChange={e => setUrl(e.target.value)} disabled={!canEdit} placeholder="Link de Drive / carpeta" className="h-9 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" />{url && <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border px-3 text-sm"><ExternalLink className="h-3.5 w-3.5" /> Abrir</a>}{canEdit && <button onClick={save} disabled={saving} className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-gradient-tech px-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar</button>}</div></div>;
}
