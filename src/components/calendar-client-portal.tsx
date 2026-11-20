'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ContentSkeleton } from '@/components/content-skeleton';
import { STATUS_CONFIG } from '@/lib/social-config';

type Notification = { id: string; calendar_type: 'social' | 'ads'; month: string; idea_id: string | null; kind: string; content: string; actor_name: string; read_at: string | null; created_at: string };
type PortalData = { client: { social_calendar_enabled: boolean }; months: { month: string; social: number; ads: number; statuses: Record<string, number> }[]; notifications: Notification[] };

export function CalendarClientPortal({ token, authToken, overview, onOpen }: { token: string; authToken: string; overview: boolean; onOpen: (month: string, type: 'social' | 'ads', idea?: string) => void }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(false);
  const [month, setMonth] = useState('');
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    async function load() {
      try {
        const res = await fetch(`/api/calendar-links/${token}/portal${overview ? '' : '?view=feed'}`, { headers: { Authorization: `Bearer ${authToken}` } });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (active) { setData(json); setError(''); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'No se pudo cargar el portal'); }
    }
    void load();
    const timer = setInterval(load, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [token, authToken, overview]);
  async function markRead(item: Notification) {
    setPending(item.id);
    try {
      const res = await fetch(`/api/calendar-links/${token}/portal`, { method: 'PUT', headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(current => current ? { ...current, notifications: current.notifications.map(n => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n) } : current);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo marcar como leida'); }
    finally { setPending(null); }
  }
  return <section className="space-y-4">
    {error && <p role="alert" className="rounded-xl border p-3 text-sm text-destructive">{error}</p>}
    {!data && !error && <ContentSkeleton />}
    {overview && data && <>
      <div className="rounded-[1.6rem] border border-border bg-tint-blue p-6">
        <h2 className="text-2xl font-medium tracking-tight">Tus calendarios</h2>
        <p className="mt-2 text-sm text-muted-foreground">Elegí un mes para revisar publicaciones, estados y comentarios con el equipo.</p>
        <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">Ir a un mes<input aria-label="Elegir mes" type="month" value={month} onChange={e => setMonth(e.target.value)} className="rounded-full border bg-card px-4 py-2" /><Button disabled={!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)} onClick={() => onOpen(month, data.client.social_calendar_enabled ? 'social' : 'ads')}>Abrir mes</Button></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.months.map(row => <article key={row.month} className="space-y-4 rounded-[1.6rem] border border-border bg-card p-5">
        <h3 className="text-lg font-semibold capitalize">{new Date(`${row.month}-01T12:00:00`).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</h3>
        <p className="text-sm text-muted-foreground">{Number(row.social > 0) + Number(row.ads > 0)} calendarios · {row.social + row.ads} publicaciones</p>
        <p className="text-xs text-muted-foreground">{row.social} Redes · {row.ads} ADS</p>
        <div className="flex flex-wrap gap-2">{Object.entries(row.statuses).map(([status, count]) => <span key={status} className="rounded-full border bg-background px-3 py-1 text-xs">{STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}: {count}</span>)}</div>
        <div className="flex flex-wrap gap-2"><Button className="rounded-full" onClick={() => onOpen(row.month, row.social ? 'social' : 'ads')}>Ver calendario</Button>{row.ads > 0 && row.social > 0 && <Button variant="outline" className="rounded-full" onClick={() => onOpen(row.month, 'ads')}>Solo ADS</Button>}</div>
      </article>)}</div>
      {data.months.length === 0 && <p className="rounded-[1.6rem] border border-dashed p-6 text-sm text-muted-foreground">Todavia no hay publicaciones planificadas. Podés abrir un mes desde el selector.</p>}
    </>}
    {data && <div className="rounded-[1.6rem] border border-border bg-card p-5">
      <button type="button" aria-expanded={overview || showFeed} onClick={() => setShowFeed(v => !v)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left font-semibold">Para vos<span className="rounded-full bg-tint-blue px-3 py-1 text-xs">{data.notifications.filter(n => !n.read_at).length} sin leer</span></button>
      {(overview || showFeed) && <><p className="mt-2 text-xs text-muted-foreground">Tus ultimas 100 menciones y respuestas en este cliente. Los comentarios completos están en cada mes o publicación.</p>
        {data.notifications.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No tenés menciones ni respuestas todavía.</p>}
        <ul className="mt-4 max-h-96 space-y-3 overflow-y-auto">{data.notifications.map(item => <li key={item.id} className={`space-y-2 rounded-2xl border p-4 ${item.read_at ? '' : 'bg-tint-blue'}`}>
          <p className="text-sm font-medium">{item.actor_name} {item.kind === 'mention' ? 'te mencionó' : 'respondió a tu comentario'}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.content}</p>
          <p className="text-xs text-muted-foreground">{item.month} · {item.calendar_type === 'ads' ? 'ADS' : 'Redes'} · {new Date(item.created_at).toLocaleString('es')}</p>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onOpen(item.month, item.calendar_type, item.idea_id || undefined)}>Ver comentario</Button>{!item.read_at && <Button size="sm" variant="ghost" disabled={pending !== null} onClick={() => markRead(item)}>{pending === item.id ? 'Guardando...' : 'Marcar como leida'}</Button>}</div>
        </li>)}</ul></>}
    </div>}
  </section>;
}
