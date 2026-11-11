'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Popover, Collapse } from '@/components/task-ui';
import type { SocialIdea, PostType } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, ideaName } from '@/lib/social-config';
import { FolderOpen, ChevronDown, MessageSquare } from 'lucide-react';

export const CALENDAR_PANEL = 'min-w-0 rounded-[1.6rem] border border-border bg-card shadow-none';
export const CALENDAR_COLUMNS = 'grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]';
export const CALENDAR_TOOLBAR = 'flex min-w-0 flex-wrap items-center gap-2 rounded-[1.6rem] border border-border bg-card p-3 md:p-4';
export const CALENDAR_DAY = 'tm-fade min-w-0 rounded-2xl p-2 transition-colors cursor-pointer flex flex-col group';

export function CalendarMonthSummary({ ideas, month }: { ideas: SocialIdea[]; month: string }) {
  const monthly = ideas.filter(idea => idea.publish_date.startsWith(`${month}-`));
  return (
    <section className={cn(CALENDAR_PANEL, 'space-y-4 p-5')} aria-label="Resumen del mes">
      <p className="text-sm font-medium text-muted-foreground">Este mes</p>
      <div><p className="text-4xl font-light tracking-tight">{monthly.length}</p><p className="mt-1 text-xs text-muted-foreground">ideas / piezas planificadas</p></div>
      <div className="space-y-2 border-t border-border pt-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = monthly.filter(idea => idea.status === key).length;
          return count ? <div key={key} className="flex items-center gap-2 text-xs"><span className={cn('h-2 w-2 shrink-0 rounded-full', cfg.dotColor)} /><span className="flex-1 text-muted-foreground">{cfg.label}</span><span className="font-medium tabular-nums">{count}</span></div> : null;
        })}
      </div>
    </section>
  );
}

/** Carpetas (mes + generales) en un acordeón: ocupan 0px hasta que se necesitan. */
export function CalendarFolders({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem('cal-folders-open') === '1'); } catch { /* */ } }, []);
  const toggle = () => setOpen(v => { try { localStorage.setItem('cal-folders-open', v ? '0' : '1'); } catch { /* */ } return !v; });
  return (
    <div className={CALENDAR_PANEL}>
      <button type="button" onClick={toggle} className="tm-press flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-blue text-tint-blue-foreground"><FolderOpen className="h-4 w-4" /></span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-foreground/80">Carpetas</span>
        <span className="text-xs text-muted-foreground">del mes y generales</span>
        <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      <Collapse open={open}><div className="space-y-3 px-3 pb-3">{children}</div></Collapse>
    </div>
  );
}

/** Filtro por tipo como chips en una sola fila (reemplaza la caja lateral). */
export function CalendarTypeFilter({ ideas, active, onToggle }: { ideas: SocialIdea[]; active: Set<PostType>; onToggle: (t: PostType) => void }) {
  return (
    <div className="tm-fade flex flex-wrap items-center gap-1.5">
      {(Object.keys(POST_TYPE_CONFIG) as PostType[]).map(k => {
        const c = POST_TYPE_CONFIG[k]; const Icon = c.icon; const on = active.has(k);
        const n = ideas.filter(i => i.post_type === k).length;
        return (
          <button key={k} type="button" onClick={() => onToggle(k)}
            className={cn('tm-press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', on ? cn('border-transparent', c.bgColorClass, c.colorClass) : 'border-border bg-card text-muted-foreground/60 hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" /> {c.label}
            <span className="rounded-full bg-background/60 px-1.5 text-[10px] font-bold">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/** "+N más" de una celda del mes: abre la lista completa del día. */
export function DayOverflow({ ideas, onIdeaClick }: { ideas: SocialIdea[]; onIdeaClick: (i: SocialIdea) => void }) {
  return (
    <div onClick={e => e.stopPropagation()}>
      <Popover width={280}
        trigger={({ toggle }) => (
          <button type="button" onClick={toggle} className="tm-press rounded-md bg-background/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-background hover:text-foreground">+{ideas.length} más</button>
        )}>
        {close => ideas.map(i => {
          const c = POST_TYPE_CONFIG[i.post_type]; const Icon = c.icon;
          return (
            <button key={i.id} type="button" onClick={() => { close(); onIdeaClick(i); }} className="tm-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-muted/60">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', c.bgColorClass, c.colorClass)}><Icon className="h-3.5 w-3.5" /></span>
              <span className="line-clamp-2 flex-1 text-sm font-medium">{ideaName(i)}</span>
            </button>
          );
        })}
      </Popover>
    </div>
  );
}

/** Dos bloques de comentarios en pestañas (ambos montados, uno visible). */
export function CalendarTabs({ className, first, second, labels = ['Comentarios del mes', 'Comentarios de las ideas'] }: { className?: string; first: ReactNode; second: ReactNode; labels?: [string, string] | string[] }) {
  const [tab, setTab] = useState(0);
  return (
    <div className={className}>
      <div className="mb-4 flex w-fit max-w-full flex-wrap gap-1 rounded-[1.4rem] border border-border bg-card p-1">
        {labels.map((l, i) => (
          <button key={l} type="button" onClick={() => setTab(i)}
            className={cn('tm-press flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-colors', tab === i ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
            <MessageSquare className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>
      <div className={cn(tab !== 0 && 'hidden')}>{first}</div>
      <div className={cn(tab !== 1 && 'hidden')}>{second}</div>
    </div>
  );
}
