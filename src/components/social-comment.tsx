'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SocialComment as SocialCommentType } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, Loader2, Pencil, Check, X, Reply } from 'lucide-react';

interface SocialCommentProps {
  ideaId: string;
  comments: SocialCommentType[];
  onAddComment: (userId: string, content: string, parentId?: string) => Promise<SocialCommentType | undefined>;
  onDeleteComment: (id: string) => Promise<void>;
  onUpdateComment: (id: string, content: string) => Promise<SocialCommentType | undefined>;
  currentUserId?: string;
}

function CommentItem({
  comment,
  currentUserId,
  isReply,
  onReply,
  onDelete,
  onEdit,
  editingId,
  editContent,
  setEditContent,
  saveEdit,
  cancelEdit,
  savingEdit,
}: {
  comment: SocialCommentType;
  currentUserId?: string;
  isReply?: boolean;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (comment: SocialCommentType) => void;
  editingId: string | null;
  editContent: string;
  setEditContent: (v: string) => void;
  saveEdit: (id: string) => void;
  cancelEdit: () => void;
  savingEdit: boolean;
}) {
  const isOwn = currentUserId === comment.user_id;
  const isEditing = editingId === comment.id;
  const timeAgo = getTimeAgo(comment.created_at);

  return (
    <div className="group">
      <div className="flex items-start gap-3">
        <Avatar className={cn('shrink-0 mt-0.5', isReply ? 'h-7 w-7' : 'h-9 w-9')}>
          <AvatarImage src={comment.user?.avatar_url} />
          <AvatarFallback className={cn('font-semibold', isReply ? 'text-[10px]' : 'text-xs')}>
            {comment.user?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', isReply ? 'text-xs' : 'text-sm')}>{comment.user?.full_name || 'Usuario'}</span>
            <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
          </div>
          {isEditing ? (
            <div className="mt-1.5 space-y-1.5">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(comment.id); } if (e.key === 'Escape') cancelEdit(); }}
                className="h-9 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={() => saveEdit(comment.id)} disabled={savingEdit || !editContent.trim()}>
                  {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={cancelEdit}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <p className={cn('text-foreground/80 mt-1 whitespace-pre-wrap leading-relaxed', isReply ? 'text-sm' : 'text-sm')}>{comment.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => onReply(comment.id)}>
                  <Reply className="h-3 w-3" /> Responder
                </Button>
              )}
              {isOwn && (
                <>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => onEdit(comment)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-red-400 hover:text-red-600 gap-1"
                    onClick={() => onDelete(comment.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-2 space-y-3 border-l-2 border-border/30 pl-4">
          {comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReply
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              saveEdit={saveEdit}
              cancelEdit={cancelEdit}
              savingEdit={savingEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialComment({ comments, onAddComment, onDeleteComment, onUpdateComment, currentUserId }: SocialCommentProps) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const handleSend = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setSending(true);
    try {
      await onAddComment(currentUserId, newComment.trim(), replyTo || undefined);
      setNewComment('');
      setReplyTo(null);
    } catch { /* */ } finally {
      setSending(false);
    }
  };

  const startEdit = (comment: SocialCommentType) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    try {
      await onUpdateComment(id, editContent.trim());
      setEditingId(null);
      setEditContent('');
    } catch { /* */ } finally {
      setSavingEdit(false);
    }
  };

  const replyComment = replyTo ? comments.find(c => c.id === replyTo) : null;

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No hay comentarios todavía</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={setReplyTo}
              onDelete={onDeleteComment}
              onEdit={startEdit}
              editingId={editingId}
              editContent={editContent}
              setEditContent={setEditContent}
              saveEdit={saveEdit}
              cancelEdit={cancelEdit}
              savingEdit={savingEdit}
            />
          ))}
        </div>
      )}

      {currentUserId && (
        <div className="pt-3 border-t border-border/30 space-y-2">
          {replyComment && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
              <Reply className="h-3 w-3" />
              <span>Respondiendo a <strong>{replyComment.user?.full_name || 'Usuario'}</strong></span>
              <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              placeholder={replyTo ? 'Escribí tu respuesta...' : 'Escribí un comentario...'}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 h-9 text-sm"
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!newComment.trim() || sending}
              className="h-9 w-9 p-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}
