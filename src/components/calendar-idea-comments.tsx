'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ChevronRight,
  Loader2,
  MessageSquare,
  Search,
  Trash2,
  X,
  ArrowUpRight,
  CornerDownRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionedText } from '@/components/mention';
import { MarkdownBody } from '@/lib/markdown';
import { HighlightedText } from '@/components/highlighted-text';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { useCalendarComments, type CalendarComment } from '@/lib/hooks/use-calendar-comments';
import { timeAgo } from '@/components/calendar-comments';
import type { SocialIdea } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CalendarIdeaCommentsProps {
  clientId: string | null;
  calendarType: 'social' | 'ads';
  month: string | null;
  /** Public share link token, when rendered inside the client-facing calendar. */
  shareToken?: string;
  guestEmail?: string;
  viewerAuthToken?: string;
  /** Ideas of the month being viewed, used for the header and to open the idea. */
  ideas?: SocialIdea[];
  currentUserId?: string;
  currentUserEmail?: string;
  isAdmin?: boolean;
  /** Opens the idea card the comments belong to. */
  onOpenIdea?: (ideaId: string) => void;
  title?: string;
  className?: string;
}

function StatusChip({ status }: { status: SocialIdea['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px text-[9.5px] font-semibold uppercase leading-tight tracking-wide',
        cfg?.colorClass,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg?.dotColor)} />
      {cfg?.label || status}
    </span>
  );
}

/**
 * Comments grouped by the idea they were written on: one card per post of the
 * month, collapsed by default, that opens the thread and links to the idea.
 * The comments of the calendar itself live in `CalendarComments`.
 */
export function CalendarIdeaComments({
  clientId,
  calendarType,
  month,
  shareToken,
  guestEmail,
  viewerAuthToken,
  ideas = [],
  currentUserId,
  currentUserEmail,
  isAdmin,
  onOpenIdea,
  title,
  className,
}: CalendarIdeaCommentsProps) {
  const { comments, loading, error, removeComment } = useCalendarComments({
    clientId,
    calendarType,
    month,
    shareToken,
    guestEmail,
    viewerAuthToken,
  });

  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const needle = query.trim().toLowerCase();
  const ideaById = useMemo(() => new Map(ideas.map(i => [i.id, i])), [ideas]);

  const groups = useMemo(() => {
    const map = new Map<string, { idea: SocialIdea | null; meta: CalendarComment['idea']; items: CalendarComment[] }>();
    for (const c of comments) {
      if (c.scope !== 'idea' || !c.idea) continue;
      const existing = map.get(c.idea.id);
      if (existing) existing.items.push(c);
      else map.set(c.idea.id, { idea: ideaById.get(c.idea.id) ?? null, meta: c.idea, items: [c] });
    }
    return [...map.values()].sort((a, b) =>
      (a.meta?.publish_date || '').localeCompare(b.meta?.publish_date || ''),
    );
  }, [comments, ideaById]);

  const visible = useMemo(() => {
    if (needle.length < 2) return groups;
    return groups.filter(
      g =>
        (g.meta?.title || '').toLowerCase().includes(needle) ||
        g.items.some(
          c =>
            c.content.toLowerCase().includes(needle) ||
            c.replies.some(r => r.content.toLowerCase().includes(needle)),
        ),
    );
  }, [groups, needle]);

  const totalComments = groups.reduce(
    (n, g) => n + g.items.reduce((m, c) => m + 1 + c.replies.length, 0),
    0,
  );

  const toggle = (id: string) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const allExpanded = visible.length > 0 && visible.every(g => expanded.includes(g.meta!.id));

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeComment(id, 'idea');
    } catch {
      /* keep the comment visible if the delete failed */
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (c: { user_id: string; user: { email?: string | null } | null }) => {
    const matchesEmail =
      !!currentUserEmail &&
      !!c.user?.email &&
      c.user.email.toLowerCase() === currentUserEmail.toLowerCase();
    return (!!currentUserId && c.user_id === currentUserId) || matchesEmail || !!isAdmin;
  };

  const renderBody = (text: string) => (
    <MarkdownBody
      text={text}
      renderMention={name => <MentionedText text={`@${name}`} className="font-medium" />}
      renderText={
        needle.length >= 2
          ? (t, key) => <HighlightedText key={key} text={t} query={needle} />
          : undefined
      }
    />
  );

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4 md:p-5', className)}>
      <header className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title || 'Comentarios de las ideas'}</h3>
        {totalComments > 0 && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {totalComments}
          </span>
        )}
      </header>

      {error && (
        <p className="mb-2 text-xs text-muted-foreground">No se pudieron cargar los comentarios.</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando comentarios…
        </div>
      ) : groups.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">
          Ninguna idea de este mes tiene comentarios todavía.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar en los comentarios de las ideas…"
                className="h-9 pl-9 pr-9 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {visible.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setExpanded(
                    allExpanded ? [] : visible.map(g => g.meta!.id),
                  )
                }
                className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {allExpanded ? 'Ver ninguno' : 'Ver todos'}
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              Ningún comentario coincide con “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {visible.map(group => {
                const id = group.meta!.id;
                const isOpen = expanded.includes(id);
                const full = group.idea;
                const count = group.items.reduce((n, c) => n + 1 + c.replies.length, 0);
                const ptConfig = full ? POST_TYPE_CONFIG[full.post_type] : null;
                const label = full?.title || group.meta?.title || 'Idea';
                return (
                  <li
                    key={id}
                    className="overflow-hidden rounded-xl border border-border bg-background/40"
                  >
                    <div className="flex items-start gap-2 p-3">
                      {ptConfig && (
                        <span
                          className={cn(
                            'mt-1 h-2 w-2 shrink-0 rounded-full',
                            full?.status === 'posteado' ? 'bg-green-500' : ptConfig.dotColor,
                          )}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-foreground">
                          {needle.length >= 2 ? (
                            <HighlightedText text={label} query={needle} />
                          ) : (
                            label
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ChevronRight
                              className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-90')}
                            />
                            En esta idea se dejaron{' '}
                            <span className="font-semibold text-foreground/70">
                              {count} {count === 1 ? 'comentario' : 'comentarios'}
                            </span>
                          </span>
                          {group.meta?.publish_date && (
                            <span>
                              · {format(new Date(`${group.meta.publish_date}T00:00:00`), 'd MMM')}
                            </span>
                          )}
                        </p>
                      </button>

                      {full && <StatusChip status={full.status} />}

                      {onOpenIdea && (
                        <button
                          type="button"
                          onClick={() => onOpenIdea(id)}
                          className="mt-0.5 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          title="Ir a la idea"
                          aria-label="Ir a la idea"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {isOpen && (
                      <ul className="space-y-3 border-t border-border bg-muted/20 p-3">
                        {group.items.map(comment => (
                          <li key={comment.id} className="group flex gap-2.5">
                            <Avatar className="h-7 w-7 shrink-0">
                              {comment.user?.avatar_url && (
                                <AvatarImage
                                  src={comment.user.avatar_url}
                                  alt={comment.user.full_name}
                                />
                              )}
                              <AvatarFallback className="text-[10px] font-bold">
                                {(comment.user?.full_name || '?').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate text-xs font-semibold text-foreground">
                                  {comment.user?.full_name || 'Usuario'}
                                </span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {timeAgo(comment.created_at)}
                                </span>
                                {canDelete(comment) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={deletingId === comment.id}
                                    className="ml-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                                    aria-label="Eliminar comentario"
                                  >
                                    {deletingId === comment.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <div className="mt-0.5 text-sm text-foreground/80">
                                {renderBody(comment.content)}
                              </div>

                              {comment.replies.length > 0 && (
                                <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
                                  {comment.replies.map(reply => (
                                    <li key={reply.id} className="group flex gap-2">
                                      <CornerDownRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/60" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="truncate text-[11px] font-semibold text-foreground">
                                            {reply.user?.full_name || 'Usuario'}
                                          </span>
                                          <span className="shrink-0 text-[10px] text-muted-foreground">
                                            {timeAgo(reply.created_at)}
                                          </span>
                                          {canDelete(reply) && (
                                            <button
                                              type="button"
                                              onClick={() => handleDelete(reply.id)}
                                              disabled={deletingId === reply.id}
                                              className="ml-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                                              aria-label="Eliminar respuesta"
                                            >
                                              {deletingId === reply.id ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                              ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                        <div className="mt-0.5 text-xs text-foreground/75">
                                          {renderBody(reply.content)}
                                        </div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
