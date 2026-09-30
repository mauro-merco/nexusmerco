'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Send, Trash2, Loader2, AlertCircle, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MentionTextarea, MentionedText, type MentionUser } from '@/components/mention';
import { MarkdownBody } from '@/lib/markdown';
import { HighlightedText } from '@/components/highlighted-text';
import { useCalendarComments, type CalendarComment } from '@/lib/hooks/use-calendar-comments';
import { cn } from '@/lib/utils';

interface CalendarCommentsProps {
  clientId: string | null;
  calendarType: 'social' | 'ads';
  month: string | null;
  /** Public share link token, when rendered inside the client-facing calendar. */
  shareToken?: string;
  guestEmail?: string;
  viewerAuthToken?: string;
  /** Users offered as @mention suggestions. Empty disables the autocomplete. */
  mentionUsers?: MentionUser[];
  /** Id of the signed-in user, to show the delete button on their own comments. */
  currentUserId?: string;
  /** Email of the viewer, used by the public link where the id is not exposed. */
  currentUserEmail?: string;
  isAdmin?: boolean;
  title?: string;
  className?: string;
}

export function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return format(new Date(iso), 'd/MM/yyyy');
}

/**
 * Thread of comments about the calendar itself, not about a single idea: one
 * thread per client + calendar type + month, shared by the internal calendar and
 * the public client link. The comments written inside each idea are listed by
 * `CalendarIdeaComments`.
 */
export function CalendarComments({
  clientId,
  calendarType,
  month,
  shareToken,
  guestEmail,
  viewerAuthToken,
  mentionUsers = [],
  currentUserId,
  currentUserEmail,
  isAdmin,
  title,
  className,
}: CalendarCommentsProps) {
  const { comments, loading, error, addComment, removeComment } = useCalendarComments({
    clientId,
    calendarType,
    month,
    shareToken,
    guestEmail,
    viewerAuthToken,
  });

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const monthLabel = month ? format(new Date(`${month}-01T00:00:00`), 'MMMM yyyy') : '';
  const needle = query.trim().toLowerCase();

  // The API also returns the comments written on ideas, to feed the other
  // section. Here we only list the ones about the calendar.
  const general = useMemo(() => comments.filter(c => c.scope === 'calendar'), [comments]);
  const visible = useMemo(
    () => (needle.length < 2 ? general : general.filter(c => c.content.toLowerCase().includes(needle))),
    [general, needle],
  );

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await addComment(text);
      setContent('');
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeComment(id, 'calendar');
    } catch {
      /* keep the comment visible if the delete failed */
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (c: CalendarComment) => {
    const matchesEmail =
      !!currentUserEmail &&
      !!c.user?.email &&
      c.user.email.toLowerCase() === currentUserEmail.toLowerCase();
    return (!!currentUserId && c.user_id === currentUserId) || matchesEmail || !!isAdmin;
  };

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4 md:p-5', className)}>
      <header className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {title || 'Comentarios del mes'}
        </h3>
        {monthLabel && <span className="text-xs capitalize text-muted-foreground">· {monthLabel}</span>}
        {general.length > 0 && (
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {general.length}
          </span>
        )}
      </header>

      <div className="mb-4">
        <MentionTextarea
          value={content}
          onChange={setContent}
          users={mentionUsers}
          placeholder="Escribí un comentario sobre este mes del calendario…"
          rows={2}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            Enter para enviar · Shift+Enter para nueva línea
          </span>
          <Button size="sm" className="btn-cta" onClick={handleSend} disabled={!content.trim() || sending}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar
          </Button>
        </div>
        {sendError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> {sendError}
          </p>
        )}
      </div>

      {error && (
        <p className="mb-2 text-xs text-muted-foreground">No se pudieron cargar los comentarios.</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando comentarios…
        </div>
      ) : general.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">Todavía no hay comentarios sobre este mes.</p>
      ) : (
        <>
          {general.length > 1 && (
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar en los comentarios del mes…"
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
          )}

          {visible.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">
              Ningún comentario coincide con “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((comment: CalendarComment) => (
                <li key={comment.id} className="group flex gap-2.5">
                  <Avatar className="h-7 w-7 shrink-0">
                    {comment.user?.avatar_url && (
                      <AvatarImage src={comment.user.avatar_url} alt={comment.user.full_name} />
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
                      <MarkdownBody
                        text={comment.content}
                        renderMention={name => <MentionedText text={`@${name}`} className="font-medium" />}
                        renderText={
                          needle.length >= 2
                            ? (t, key) => <HighlightedText key={key} text={t} query={needle} />
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
