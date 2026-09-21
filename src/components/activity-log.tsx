'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import type { ActivityEntry } from '@/app/api/activity-log/route';
import {
  Loader2, RefreshCw, ClipboardList, Pencil, CheckCircle2, MessageSquare, Sparkles,
  FileText, FilePen, Mail, Lightbulb, Bug, StickyNote, CalendarDays, Inbox, Copy, Check,
  Rocket,
} from 'lucide-react';

const KIND_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; colorClass: string; bgClass: string }> = {
  sesion: { label: 'Avance', icon: Rocket, colorClass: 'text-primary', bgClass: 'bg-primary/10' },
  task_created: { label: 'Tarea', icon: ClipboardList, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-500/15' },
  task_updated: { label: 'Tarea', icon: Pencil, colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-500/15' },
  task_completed: { label: 'Tarea completada', icon: CheckCircle2, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-500/15' },
  task_comment: { label: 'Comentario', icon: MessageSquare, colorClass: 'text-sky-600 dark:text-sky-400', bgClass: 'bg-sky-500/15' },
  idea_created: { label: 'Idea social', icon: Sparkles, colorClass: 'text-pink-600 dark:text-pink-400', bgClass: 'bg-pink-500/15' },
  idea_updated: { label: 'Idea social', icon: Pencil, colorClass: 'text-fuchsia-600 dark:text-fuchsia-400', bgClass: 'bg-fuchsia-500/15' },
  doc_created: { label: 'Documento', icon: FileText, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-500/15' },
  doc_updated: { label: 'Documento', icon: FilePen, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-500/15' },
  message: { label: 'Mensaje', icon: Mail, colorClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-500/15' },
  suggestion: { label: 'Sugerencia', icon: Lightbulb, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-500/15' },
  bug: { label: 'Bug', icon: Bug, colorClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-500/15' },
  suggestion_comment: { label: 'Comentario', icon: MessageSquare, colorClass: 'text-orange-600 dark:text-orange-400', bgClass: 'bg-orange-500/15' },
  note_created: { label: 'Nota', icon: StickyNote, colorClass: 'text-teal-600 dark:text-teal-400', bgClass: 'bg-teal-500/15' },
};

const todayISO = () => new Date().toLocaleDateString('sv-SE');
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
};

// Registro fijo de la sesión de trabajo de hoy (se muestra solo en la fecha actual).
const SESSION_LOG: { kind: string; text: string; hour: number; minute: number }[] = [
  { kind: 'sesion', text: 'Sistema de tipo de tarea terminado: categorías y 18 tipos con selector y etiquetas en todo el tablero.', hour: 13, minute: 5 },
  { kind: 'sesion', text: 'Nuevo estado "Ejecutando" agregado al tablero de tareas.', hour: 13, minute: 10 },
  { kind: 'sesion', text: 'Nueva tarea ahora exige elegir el cliente antes de guardar.', hour: 13, minute: 15 },
  { kind: 'sesion', text: 'Muro de sugerencias y reportes de bug construido: botones flotantes, comentarios en hilo, reacciones y estados de gestión.', hour: 13, minute: 25 },
  { kind: 'sesion', text: 'Barra lateral reemplazada por un cajón de apps flotante con panel animado.', hour: 13, minute: 30 },
  { kind: 'sesion', text: 'Logo agregado arriba a la izquierda en escritorio.', hour: 13, minute: 32 },
  { kind: 'sesion', text: 'Reporte diario de actividad implementado en esta misma sección.', hour: 13, minute: 35 },
];

function sessionEntriesForToday(today: string): ActivityEntry[] {
  return SESSION_LOG.map((s, i) => {
    const ts = new Date();
    ts.setHours(s.hour, s.minute + i, 0, 0);
    return {
      kind: s.kind,
      date: today,
      ts: ts.toISOString(),
      author_name: 'Equipo Nexus',
      author_avatar: null,
      text: s.text,
    };
  });
}

export function ActivityLog() {
  const { token } = useAuthStore();
  const [days, setDays] = useState(14);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-log?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setEntries(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [days, token]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const today = todayISO();
  const yesterday = yesterdayISO();
  const groups = groupByDate([...sessionEntriesForToday(today), ...entries]);

  const copyReport = async () => {
    const lines: string[] = [];
    lines.push(`REPORTE DE ACTIVIDAD — ${days} días`);
    for (const group of groups) {
      lines.push('');
      const label = group.date === today ? `HOY — ${formatDayLabel(group.date)}` : formatDayLabel(group.date).toUpperCase();
      lines.push(label);
      lines.push('-'.repeat(label.length));
      for (const e of group.items) {
        const cfg = KIND_CONFIG[e.kind]?.label || e.kind;
        lines.push(`• [${cfg}] ${e.text} — ${e.author_name}${e.client_name ? ` (${e.client_name})` : ''}, ${formatTime(e.ts)}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="rounded-lg border border-input bg-background px-2.5 py-2 text-xs text-foreground">
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
            <option value={30}>Últimos 30 días</option>
          </select>
          <button onClick={fetchLog} className="flex h-8 w-8 items-center justify-center rounded-lg border border-input text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors" aria-label="Actualizar">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
          <button onClick={copyReport} className="flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-2 text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors" aria-label="Copiar reporte">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar reporte'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{entries.length} registro{entries.length === 1 ? '' : 's'} en este período</p>
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 opacity-30" />
          <p className="text-sm">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-muted-foreground">
          <CalendarDays className="h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Sin actividad en este período</p>
          <p className="text-xs max-w-sm text-center">Cuando se creen tareas, documentos, ideas o publicaciones, van a aparecer acá resumidas día por día.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(group => {
            const isToday = group.date === today;
            const isYesterday = group.date === yesterday;
            return (
              <section key={group.date} className="overflow-hidden rounded-2xl border bg-card">
                <header className={cn('flex items-center justify-between gap-2 border-b px-4 py-2.5', isToday && 'bg-primary/5')}>
                  <div className="flex items-center gap-2.5">
                    {isToday ? (
                      <span className="bg-gradient-tech rounded-md px-2 py-0.5 text-[10px] font-bold text-white">HOY</span>
                    ) : isYesterday ? (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold">AYER</span>
                    ) : (
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="text-sm font-bold capitalize">{formatDayLabel(group.date)}</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(group.counts).filter(([, n]) => n > 0).map(([label, n]) => (
                      <span key={label} className="rounded-full bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground">{label} · {n}</span>
                    ))}
                  </div>
                </header>
                {isToday && group.items.some(e => e.kind === 'sesion') && (
                  <p className="border-b border-border/60 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                    Nota: las migraciones 00043 (tipos de tarea) y 00044 (muro de sugerencias) deben aplicarse en el SQL Editor de Supabase para dejar esos módulos 100% operativos. Además, se corrigió 00044 para incluir el módulo "Mensajes" en usuarios nuevos.
                  </p>
                )}
                <ul className="divide-y divide-border/60">
                  {group.items.map((e, i) => {
                    const cfg = KIND_CONFIG[e.kind] || { label: e.kind, icon: MessageSquare, colorClass: 'text-muted-foreground', bgClass: 'bg-muted' };
                    const Icon = cfg.icon;
                    return (
                      <li key={`${e.kind}-${e.ts}-${i}`} className="flex items-start gap-3 px-4 py-3">
                        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg.bgClass, cfg.colorClass)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-foreground/90">{e.text}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            {e.author_avatar ? (
                              <img src={e.author_avatar} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                            ) : (
                              <span className="bg-gradient-tech flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold text-white">
                                {(e.author_name || '?').charAt(0)}
                              </span>
                            )}
                            <span className="font-medium">{e.author_name}</span>
                            {e.client_name && <span>· {e.client_name}</span>}
                          </div>
                        </div>
                        <time className="shrink-0 text-[11px] tabular-nums text-muted-foreground/70">{formatTime(e.ts)}</time>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function groupByDate(entries: ActivityEntry[]) {
  const map = new Map<string, { date: string; items: ActivityEntry[]; counts: Record<string, number> }>();
  for (const e of entries) {
    let g = map.get(e.date);
    if (!g) {
      g = { date: e.date, items: [], counts: {} };
      map.set(e.date, g);
    }
    g.items.push(e);
    const label = KIND_CONFIG[e.kind]?.label || e.kind;
    g.counts[label] = (g.counts[label] || 0) + 1;
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

function formatDayLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const name = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  return name;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}