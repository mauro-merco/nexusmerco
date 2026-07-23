'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SocialComment as SocialCommentType } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';

interface SocialCommentProps {
  ideaId: string;
  comments: SocialCommentType[];
  onAddComment: (userId: string, content: string) => Promise<SocialCommentType | undefined>;
  onDeleteComment: (id: string) => Promise<void>;
  onUpdateComment: (id: string, content: string) => Promise<SocialCommentType | undefined>;
  currentUserId?: string;
}

export function SocialComment({ comments, onAddComment, onDeleteComment, onUpdateComment, currentUserId }: SocialCommentProps) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSend = async () => {
    if (!newComment.trim() || !currentUserId) return;
    setSending(true);
    try {
      await onAddComment(currentUserId, newComment.trim());
      setNewComment('');
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

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>No hay comentarios todavía</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => {
            const timeAgo = getTimeAgo(comment.created_at);
            const isOwn = currentUserId === comment.user_id;
            const isEditing = editingId === comment.id;
            return (
              <div key={comment.id} className="flex items-start gap-3 group">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarImage src={comment.user?.avatar_url} />
                  <AvatarFallback className="text-[10px]">
                    {comment.user?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{comment.user?.full_name || 'Usuario'}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                  </div>
                  {isEditing ? (
                    <div className="mt-1 space-y-1">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(comment.id); } if (e.key === 'Escape') cancelEdit(); }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => saveEdit(comment.id)} disabled={savingEdit || !editContent.trim()}>
                          {savingEdit ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={cancelEdit}>
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                  )}
                </div>
                {isOwn && !isEditing && (
                  <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(comment)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-600"
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {currentUserId && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/20">
          <Input
            placeholder="Escribí un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            className="flex-1"
            disabled={sending}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!newComment.trim() || sending}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
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
