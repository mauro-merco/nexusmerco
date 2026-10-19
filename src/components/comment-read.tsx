'use client';

import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommentReader } from '@/lib/hooks/use-comment-reads';

/**
 * "Visto" toggle for a single comment or reply.
 * Filled + emerald when the current user already saw it; shows who else did.
 */
export function CommentReadEye({
  readers,
  currentUserId,
  onToggle,
  pending,
}: {
  readers: CommentReader[] | undefined;
  currentUserId?: string;
  onToggle: () => void;
  pending?: boolean;
}) {
  const list = readers || [];
  const seen = !!currentUserId && list.some(r => r.id === currentUserId);
  const count = list.length;
  const names = list.map(r => (r.id === currentUserId ? 'Vos' : r.full_name || 'Otro usuario'));

  const title = count === 0
    ? 'Marcar como visto'
    : `Visto por: ${names.join(', ')}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => { e.stopPropagation(); if (!pending) onToggle(); }}
      className={cn(
        'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors',
        seen ? 'text-emerald-500 hover:text-emerald-600' : 'text-muted-foreground/70 hover:text-foreground',
        pending && 'opacity-60',
      )}
    >
      <Eye className={cn('h-3.5 w-3.5', seen && 'fill-current')} />
      <span>{count > 0 ? `${count} ${count === 1 ? 'visto' : 'vistos'}` : 'Visto'}</span>
    </button>
  );
}
