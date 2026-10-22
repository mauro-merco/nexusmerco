'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover } from '@/components/task-ui';
import type { SocialIdea, IdeaStatus } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, IDEA_STATUS_ORDER } from '@/lib/social-config';
import { ChevronRight, ChevronDown, Check, List as ListIcon, MessageSquare, Plus } from 'lucide-react';

/** true cuando el viewport es < 768px (mobile). SSR-safe. */
export function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [breakpoint]);
  return mobile;
}

function StatusChip({ idea, onChange }: { idea: SocialIdea; onChange?: (id: string, s: IdeaStatus) => void }) {
  const cfg = STATUS_CONFIG[idea.status];
  const chip = (
    <span className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', cfg.colorClass)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg.dotColor)} />
      <span className="truncate">{cfg.label}</span>
      {onChange && <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />}
    </span>
  );
  if (!onChange) return chip;
  return (
    <div onClick={e => e.stopPropagation()}>
      <Popover
        trigger={({ toggle }) => <button type="button" onClick={toggle} className="tm-press max-w-full">{chip}</button>}>
        {close => IDEA_STATUS_ORDER.map(k => {
          const s = STATUS_CONFIG[k];
          return (
            <button key={k} type="button" onClick={() => { close(); onChange(idea.id, k); }}
              className={cn('tm-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/60', k === idea.status && 'bg-muted/50')}>
              <span className={cn('h-2 w-2 shrink-0 rounded-full', s.dotColor)} />
              <span className="flex-1 whitespace-nowrap">{s.label}</span>
              {k === idea.status && <Check className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </Popover>
    </div>
  );
}

/** Vista de lista agrupada por día: la vista del calendario en mobile (y la "Agenda" en desktop). */
export function CalendarAgenda({ ideas, onIdeaClick, onStatusChange, onAdd, emptyLabel = 'No hay contenido planificado este mes.' }: {
  ideas: SocialIdea[];
  onIdeaClick: (idea: SocialIdea) => void;
  onStatusChange?: (id: string, s: IdeaStatus) => void;
  onAdd?: () => void;
  emptyLabel?: string;
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  const groups = useMemo(() => {
    const map = new Map<string, SocialIdea[]>();
    [...ideas].sort((a, b) => a.publish_date.localeCompare(b.publish_date)).forEach(i => {
      map.set(i.publish_date, [...(map.get(i.publish_date) || []), i]);
    });
    return [...map.entries()];
  }, [ideas]);

  if (groups.length === 0) {
    return (
      <div className="tm-fade flex flex-col items-center gap-3 rounded-3xl bg-muted/25 py-14 text-muted-foreground">
        <ListIcon className="h-8 w-8 opacity-40" />
        <p className="px-6 text-center text-sm">{emptyLabel}</p>
        {onAdd && <button type="button" onClick={onAdd} className="tm-press flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Agregar la primera</button>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([date, items]) => {
        const d = new Date(date + 'T12:00:00');
        const isToday = date === todayStr;
        return (
          <section key={date} className="tm-rise">
            <div className="mb-2 flex items-center gap-3 px-1">
              <span className={cn('flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl', isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50')}>
                <span className="text-[10px] font-semibold uppercase leading-none opacity-80">{d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')}</span>
                <span className="mt-0.5 text-lg font-bold leading-none">{d.getDate()}</span>
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold capitalize">{d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                <p className="text-xs text-muted-foreground">{isToday ? 'Hoy · ' : ''}{items.length} publicación{items.length !== 1 ? 'es' : ''}</p>
              </div>
            </div>
            <ul className="tm-stagger space-y-2 pl-0 sm:pl-[60px]">
              {items.map(idea => {
                const pt = POST_TYPE_CONFIG[idea.post_type];
                const Icon = pt.icon;
                const people = idea.assignees?.length || 0;
                return (
                  <li key={idea.id}>
                    <div role="button" tabIndex={0} onClick={() => onIdeaClick(idea)} onKeyDown={e => { if (e.key === 'Enter') onIdeaClick(idea); }}
                      className={cn('tm-lift tm-press group flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-3.5 shadow-[0_1px_2px_rgba(20,20,43,.06)]',
                        idea.status === 'espera_cliente' && 'bg-red-500/10', idea.status === 'posteado' && 'opacity-75')}>
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', pt.bgColorClass, pt.colorClass)}><Icon className="h-[18px] w-[18px]" /></span>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{idea.eje_contenido || idea.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pt.label}{idea.eje_contenido && idea.title !== idea.eje_contenido ? ` · ${idea.title}` : ''}{people ? ` · ${people} asignado${people !== 1 ? 's' : ''}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <StatusChip idea={idea} onChange={onStatusChange} />
                          {typeof (idea as { comment_count?: number }).comment_count === 'number' && (idea as { comment_count?: number }).comment_count! > 0 && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MessageSquare className="h-3 w-3" />{(idea as { comment_count?: number }).comment_count}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
