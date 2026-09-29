'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightedTextProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * Renders `text` marking every case-insensitive occurrence of `query`.
 * Used by the calendar search so the matched word stands out in results.
 */
export function HighlightedText({ text, query, className }: HighlightedTextProps) {
  const term = query.trim();
  if (!term) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${escapeRegExp(term)})`, 'ig'));
  const needle = term.toLowerCase();

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === needle ? (
          <mark
            key={i}
            className={cn(
              'rounded-[3px] bg-yellow-300/70 px-0.5 text-inherit dark:bg-yellow-400/35',
            )}
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </span>
  );
}
