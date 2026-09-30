'use client';

import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import type { SocialIdea } from '@/lib/types';
import { cn } from '@/lib/utils';

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
  const text = label ?? idea.title;

  return (
    <>
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full',
            isPublished ? 'bg-green-500' : ptConfig?.dotColor,
          )}
        />
        <span className="truncate">{text}</span>
      </span>

      <span
        className={cn(
          'mt-1 inline-flex w-fit max-w-full items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase leading-tight tracking-wide',
          statusCfg?.colorClass,
        )}
      >
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', statusCfg?.dotColor)} />
        <span className="truncate">{statusCfg?.label || idea.status}</span>
      </span>
    </>
  );
}

/** Tooltip with the title and the status, for the pills that truncate. */
export function calendarPillTitle(idea: SocialIdea, label?: string) {
  const statusCfg = STATUS_CONFIG[idea.status];
  return `${label ?? idea.title} — ${statusCfg?.label || idea.status}`;
}
