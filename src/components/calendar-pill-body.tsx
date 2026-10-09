'use client';

import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import type { SocialIdea } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check } from 'lucide-react';

/**
 * Body of a calendar day pill: the post type dot and the title on the first
 * line, and the current status as a colored chip on the second, so the state of
 * each idea is readable on the grid without opening it. Shared by the social
 * calendar, the ads calendar and the public client calendar.
 */
export function CalendarPillBody({ idea, label }: { idea: SocialIdea; label?: string }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const statusCfg = STATUS_CONFIG[idea.status];
  const isPublished = idea.status === 'posteado';
  const highlight = statusHighlight(idea.status);
  const text = label ?? idea.title;

  return (
    <>
      {idea.status === 'espera_cliente' && (
        <span className="mb-1 flex w-full items-center gap-1 rounded-md bg-red-600 px-1.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
          <AlertTriangle className="h-3 w-3" /> En espera del cliente
        </span>
      )}
      {idea.needs_client_material && idea.status !== 'espera_cliente' && (
        <span className="mb-1 flex w-full items-center gap-1 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-white shadow-sm">
          <AlertTriangle className="h-2.5 w-2.5" /> Necesito material
        </span>
      )}
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            isPublished ? 'bg-green-500' : ptConfig?.dotColor,
          )}
        />
        <span className="truncate">{text}</span>
      </span>

      {highlight ? (
        <span className={cn('mt-1 inline-flex w-fit max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-black uppercase leading-tight tracking-wide shadow-sm', highlight.className)}>
          <Check className={cn('h-3.5 w-3.5 shrink-0', highlight.iconClass)} fill={highlight.fill ? 'currentColor' : 'none'} />
          <span className="truncate">{highlight.label}</span>
        </span>
      ) : (
        <span className={cn('mt-1 inline-flex w-fit max-w-full items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase leading-tight tracking-wide', statusCfg?.colorClass)}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusCfg?.dotColor)} />
          <span className="truncate">{statusCfg?.label || idea.status}</span>
        </span>
      )}
    </>
  );
}

function statusHighlight(status: SocialIdea['status']) {
  if (status === 'diseno_listo') return { label: 'Diseño listo', className: 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', iconClass: 'text-emerald-600 dark:text-emerald-300', fill: false };
  if (status === 'espera_cliente') return { label: 'Cliente pendiente', className: 'border-red-500 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 text-[11px]', iconClass: 'text-red-600 dark:text-red-300', fill: false };
  if (status === 'aprobada') return { label: 'Aprobado', className: 'border-green-400 bg-green-200 text-green-800 dark:bg-green-500/25 dark:text-green-200 text-[11px]', iconClass: 'text-cyan-500', fill: false };
  if (status === 'posteado') return { label: 'Posteado', className: 'border-green-500 bg-green-500 text-white text-[11px]', iconClass: 'text-white', fill: true };
  return null;
}

/** Tooltip with the title and the status, for the pills that truncate. */
export function calendarPillTitle(idea: SocialIdea, label?: string) {
  const statusCfg = STATUS_CONFIG[idea.status];
  return `${label ?? idea.title} — ${statusCfg?.label || idea.status}`;
}
