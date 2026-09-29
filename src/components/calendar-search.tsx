'use client';

import { useMemo } from 'react';
import { Search, X, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { HighlightedText } from '@/components/highlighted-text';
import { POST_TYPE_CONFIG } from '@/lib/social-config';
import { format } from 'date-fns';
import type { SocialIdea } from '@/lib/types';
import { cn } from '@/lib/utils';

const SEARCHABLE_FIELDS: { key: keyof SocialIdea; label: string }[] = [
  { key: 'title', label: 'Título' },
  { key: 'brief', label: 'Brief' },
  { key: 'description', label: 'Descripción' },
  { key: 'eje_contenido', label: 'Eje de contenido' },
  { key: 'copy_text', label: 'Copy' },
];

function snippet(text: string, query: string, radius = 70) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

interface CalendarSearchProps {
  value: string;
  onChange: (v: string) => void;
  ideas: SocialIdea[];
  onSelect: (idea: SocialIdea) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Content search for the calendar of the month being viewed. Filters the ideas
 * already loaded for that month and highlights the matched text. When a query is
 * active the calendar grid is hidden, so this renders the whole result list.
 */
export function CalendarSearch({ value, onChange, ideas, onSelect, placeholder, className }: CalendarSearchProps) {
  const query = value.trim();

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const needle = query.toLowerCase();
    return ideas
      .map(idea => {
        const hits = SEARCHABLE_FIELDS.filter(({ key }) =>
          String(idea[key] || '').toLowerCase().includes(needle),
        );
        return hits.length > 0 ? { idea, hits } : null;
      })
      .filter((r): r is { idea: SocialIdea; hits: typeof SEARCHABLE_FIELDS } => r !== null);
  }, [ideas, query]);

  const showResults = query.length >= 2;

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Buscar en el contenido de este mes…'}
          className="h-10 pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showResults && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            {results.length === 0
              ? `Sin resultados para “${query}”`
              : `${results.length} ${results.length === 1 ? 'idea coincide' : 'ideas coinciden'}`}
          </p>

          {results.length > 0 && (
            <ul className="space-y-2">
              {results.map(({ idea, hits }) => {
                const ptConfig = POST_TYPE_CONFIG[idea.post_type];
                const otherHits = hits.filter(h => h.key !== 'title');
                return (
                  <li key={idea.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(idea)}
                      className="w-full rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-lg px-1.5 py-0.5 text-[10px] font-semibold', ptConfig?.bgColorClass, ptConfig?.colorClass)}>
                          {ptConfig?.label || idea.post_type}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(`${idea.publish_date}T00:00:00`), 'd MMM')}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm font-semibold text-foreground">
                        <HighlightedText text={idea.title} query={query} />
                      </p>

                      {otherHits.map(hit => {
                        const raw = String(idea[hit.key] || '');
                        return (
                          <p key={String(hit.key)} className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/60">{hit.label}: </span>
                            <HighlightedText text={snippet(raw, query)} query={query} />
                          </p>
                        );
                      })}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
