'use client';

import { MessageSquare, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarkdownBody } from '@/lib/markdown';
import { MentionedText } from '@/components/mention';
import { timeAgo } from '@/components/calendar-comments';
import { useCalendarComments, type CalendarComment } from '@/lib/hooks/use-calendar-comments';
import { STATUS_CONFIG } from '@/lib/social-config';
import type { SocialIdea } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CalendarRecentCommentsProps {
  clientId: string | null;
  calendarType: 'social' | 'ads';
  month: string | null;
  ideas?: SocialIdea[];
  shareToken?: string;
  guestEmail?: string;
  viewerAuthToken?: string;
  onOpenIdea?: (ideaId: string) => void;
  className?: string;
}

type FlatComment = CalendarComment & { ideaMeta: CalendarComment['idea']; ideaStatus?: SocialIdea['status'] };

export function CalendarRecentComments({
  clientId,
  calendarType,
  month,
  ideas = [],
  shareToken,
  guestEmail,
  viewerAuthToken,
  onOpenIdea,
  className,
}: CalendarRecentCommentsProps) {
  const { comments, loading } = useCalendarComments({ clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken });
  const ideaById = new Map(ideas.map(i => [i.id, i]));
  const latest = comments
    .flatMap(c => [c, ...c.replies.map(r => ({ ...r, scope: c.scope, idea: c.idea, replies: [] }))] as FlatComment[])
    .map(c => ({ ...c, ideaMeta: c.idea, ideaStatus: c.idea?.id ? ideaById.get(c.idea.id)?.status : undefined }))
    .filter(c => c.scope === 'idea' && c.ideaMeta)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-4', className)}>
      <header className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Últimos comentarios</h3>
      </header>

      {loading ? (
        <p className="py-4 text-xs text-muted-foreground">Cargando comentarios...</p>
      ) : latest.length === 0 ? (
        <p className="py-4 text-xs text-muted-foreground">Todavía no hay comentarios en ideas este mes.</p>
      ) : (
        <div className="space-y-2.5">
          {latest.map(comment => {
            const statusCfg = comment.ideaStatus ? STATUS_CONFIG[comment.ideaStatus] : null;
            const author = comment.user?.full_name || comment.user?.email || 'Cliente';
            return (
              <button
                key={comment.id}
                type="button"
                onClick={() => comment.ideaMeta?.id && onOpenIdea?.(comment.ideaMeta.id)}
                className={cn(
                  'group w-full rounded-xl border bg-background/55 p-2.5 text-left transition-colors hover:bg-muted/45',
                  statusCfg?.colorClass || 'border-border',
                )}
              >
                <div className="mb-1.5 flex items-start gap-2">
                  <Avatar className="mt-0.5 h-6 w-6 shrink-0">
                    <AvatarImage src={comment.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">{author.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold">{author}</p>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">en {comment.ideaMeta?.title || 'idea'}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <div className="line-clamp-2 text-xs leading-snug text-foreground/85">
                  <MarkdownBody text={comment.content} renderMention={name => <MentionedText text={`@${name}`} className="font-medium" />} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
