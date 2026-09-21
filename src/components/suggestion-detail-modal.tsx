'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useSuggestionDetail } from '@/lib/hooks/use-suggestions';
import { MentionedText } from '@/components/mention';
import { SUGGESTION_TYPE_CONFIG, SUGGESTION_STATUS_CONFIG, SUGGESTION_STATUSES } from '@/lib/suggestion-config';
import type { Suggestion, SuggestionComment } from '@/lib/types';
import { Heart, MessageSquare, Trash2, Loader2, Send, Reply, Calendar } from 'lucide-react';

interface SuggestionDetailModalProps {
  suggestion: Suggestion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (s: Suggestion) => void;
  onDeleted: (id: string) => void;
}

export function SuggestionDetailModal({ suggestion, open, onOpenChange, onUpdated, onDeleted }: SuggestionDetailModalProps) {
  const { user } = useAuthStore();
  const { suggestion: detail, loading, refetch, addComment, deleteComment, updateStatus, toggleLike } = useSuggestionDetail(open ? suggestion.id : null);
  const current = detail || suggestion;

  const canManage = user?.role === 'admin' || user?.role === 'operador';
  const isAuthor = user?.id === current.author_id;
  const canDelete = isAuthor || user?.role === 'admin';

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<SuggestionComment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setReplyTo(null);
      setCommentText('');
      refetch();
    }
  }, [open, suggestion.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = useCallback((s: Suggestion | undefined) => {
    if (s) onUpdated({ ...s, comments: undefined });
  }, [onUpdated]);

  const handleSend = async () => {
    if (!commentText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addComment(commentText.trim(), replyTo?.id || null);
      setCommentText('');
      setReplyTo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (status: Suggestion['status']) => {
    setError(null);
    try {
      const s = await updateStatus(status);
      notify(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleLike = async () => {
    setError(null);
    try {
      await toggleLike();
      refetch();
      notify(detail || suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleDeleteComment = async (c: SuggestionComment) => {
    await deleteComment(c.id);
    refetch();
    notify(detail || suggestion);
  };

  const tConfig = SUGGESTION_TYPE_CONFIG[current.type];
  const TypeIcon = tConfig.icon;
  const sConfig = SUGGESTION_STATUS_CONFIG[current.status];
  const StatusIcon = sConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85dvh] overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">{current.title}</DialogTitle>

        <div className="flex items-start justify-between gap-3 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tConfig.bgColorClass, tConfig.colorClass)}>
              <TypeIcon className="h-3 w-3" /> {tConfig.label}
            </span>
            {canManage ? (
              <div className="flex gap-1.5 flex-wrap">
                {SUGGESTION_STATUSES.map(status => {
                  const st = SUGGESTION_STATUS_CONFIG[status];
                  const SI = st.icon;
                  const active = current.status === status;
                  return (
                    <button key={status} type="button" onClick={() => handleStatus(status)}
                      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors',
                        active ? cn(st.bgColorClass, st.colorClass, 'border-transparent') : 'border-border text-muted-foreground hover:border-border/60')}>
                      <SI className="h-3 w-3" /> {st.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', sConfig.bgColorClass, sConfig.colorClass)}>
                <StatusIcon className="h-3 w-3" /> {sConfig.label}
              </span>
            )}
          </div>
          {canDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-500/10 shrink-0"
              onClick={async () => { if (confirm('¿Eliminar esta publicación?')) { await onDeleted(current.id); onOpenChange(false); } }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-4">
          {loading && !current.title && (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {current.author?.avatar_url ? (
                <img src={current.author.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="bg-gradient-tech flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white">
                  {(current.author?.full_name || '?').charAt(0)}
                </span>
              )}
              <span className="text-sm font-semibold">{current.author?.full_name || 'Usuario'}</span>
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(current.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <h2 className="text-lg font-bold leading-snug mb-1">{current.title}</h2>
            <div className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">
              <MentionedText text={current.content} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => !busy && handleLike()}
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                current.liked_by_me ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary')}>
              <Heart className={cn('h-3.5 w-3.5', current.liked_by_me && 'fill-current')} />
              {current.like_count || 0} {current.like_count === 1 ? 'Me gusta' : 'Me gustas'}
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> {current.comment_count || 0} {current.comment_count === 1 ? 'comentario' : 'comentarios'}
            </span>
            {error && <span className="text-xs text-destructive ml-auto">{error}</span>}
          </div>

          {/* Comments */}
          <div className="space-y-3">
            {(current.comments || []).map(comment => (
              <CommentThread key={comment.id} comment={comment} onReply={setReplyTo} onDelete={handleDeleteComment} canDelete={(c) => c.author_id === user?.id || user?.role === 'admin'} />
            ))}

            <div className="rounded-xl border p-3">
              {replyTo && (
                <div className="flex items-center justify-between gap-2 mb-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px]">
                  <span className="truncate text-muted-foreground">Respondiendo a <b>{replyTo.author?.full_name || 'usuario'}</b>: {replyTo.content.slice(0, 60)}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">✕</button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
                  placeholder={replyTo ? 'Escribí tu respuesta...' : 'Sumá un comentario o sugerencia...'}
                  className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
                <Button size="sm" onClick={handleSend} disabled={busy || !commentText.trim()} className="shrink-0">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommentThread({ comment, onReply, onDelete, canDelete }: {
  comment: SuggestionComment;
  onReply: (c: SuggestionComment) => void;
  onDelete: (c: SuggestionComment) => void;
  canDelete: (c: SuggestionComment) => boolean;
}) {
  const showDelete = canDelete(comment);
  return (
    <div className="space-y-2">
      <div className={cn('rounded-xl border p-3', comment.parent_id && 'ml-6')}>
        <div className="flex items-center gap-2 mb-1">
          {comment.author?.avatar_url ? (
            <img src={comment.author.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <span className="bg-gradient-tech flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white">
              {(comment.author?.full_name || '?').charAt(0)}
            </span>
          )}
          <span className="text-xs font-semibold">{comment.author?.full_name || 'Usuario'}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(comment.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => onReply(comment)} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
              <Reply className="h-3 w-3" /> Responder
            </button>
            {showDelete && (
              <button type="button" onClick={() => onDelete(comment)} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-foreground/85 whitespace-pre-wrap break-words">
          <MentionedText text={comment.content} />
        </p>
      </div>
      {(comment.replies || []).map(reply => (
        <CommentThread key={reply.id} comment={reply} onReply={onReply} onDelete={onDelete} canDelete={canDelete} />
      ))}
    </div>
  );
}