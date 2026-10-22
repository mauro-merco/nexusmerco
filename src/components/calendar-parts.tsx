'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Popover, Collapse } from '@/components/task-ui';
import type { SocialIdea, PostType } from '@/lib/types';
import { POST_TYPE_CONFIG } from '@/lib/social-config';
import { FolderOpen, ChevronDown, MessageSquare } from 'lucide-react';

/** Carpetas (mes + generales) en un acordeón: ocupan 0px hasta que se necesitan. */
export function CalendarFolders({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { setOpen(localStorage.getItem('cal-folders-open') === '1'); } catch { /* */ } }, []);
  const toggle = () => setOpen(v => { try { localStorage.setItem('cal-folders-open', v ? '0' : '1'); } catch { /* */ } return !v; });
  return (
    <div className="rounded-2xl bg-muted/25">
      <button type="button" onClick={toggle} className="tm-press flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15"><FolderOpen className="h-3.5 w-3.5 text-indigo-600" /></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Carpetas</span>
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
            className={cn('tm-press flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors', on ? cn(c.bgColorClass, c.colorClass) : 'bg-muted/30 text-muted-foreground/50 hover:bg-muted/50')}>
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
              <span className="line-clamp-2 flex-1 text-sm font-medium">{i.eje_contenido || i.title}</span>
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
      <div className="mb-3 flex w-fit rounded-xl bg-muted/40 p-1">
        {labels.map((l, i) => (
          <button key={l} type="button" onClick={() => setTab(i)}
            className={cn('tm-press flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold', tab === i ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <MessageSquare className="h-3.5 w-3.5" /> {l}
          </button>
        ))}
      </div>
      <div className={cn(tab !== 0 && 'hidden')}>{first}</div>
      <div className={cn(tab !== 1 && 'hidden')}>{second}</div>
    </div>
  );
}
