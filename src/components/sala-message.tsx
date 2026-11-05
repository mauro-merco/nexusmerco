'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageContent } from '@/components/message-content';
import { SALA_REACTIONS } from '@/lib/sala-config';
import type { SalaMessage } from '@/lib/types';
import {
  Eye,
  MessageSquareReply,
  SmilePlus,
  Trash2,
  Megaphone,
} from 'lucide-react';

function initials(name?: string | null) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface SalaMessageCardProps {
  message: SalaMessage;
  meId?: string | null;
  canModerate: boolean;
  canReply: boolean;
  isReply?: boolean;
  isBulletin?: boolean;
  onReply: (message: SalaMessage) => void;
  onReact: (message: SalaMessage, emoji: string) => void;
  onView: (message: SalaMessage) => void;
  onDelete: (message: SalaMessage) => void;
}

export function SalaMessageCard({
  message,
  meId,
  canModerate,
  canReply,
  isReply = false,
  isBulletin = false,
  onReply,
  onReact,
  onView,
  onDelete,
}: SalaMessageCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const author = message.author;
  const isMine = !!meId && message.author_id === meId;
  const canDelete = isMine || canModerate;
  const reactions = message.reactions || [];
  const readers = message.readers || [];
  const readerNames = readers.map(r => r.full_name || 'Usuario').join(', ');

  const card = (
    <div className={cn(
      'group relative flex gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
      isBulletin
        ? 'border border-amber-500/25 bg-amber-500/[0.04] px-3 py-3'
        : 'hover:bg-muted/40',
      isReply && 'ml-1'
    )}>
      {author?.avatar_url ? (
        <img
          src={author.avatar_url}
          alt=""
          className={cn('shrink-0 rounded-full object-cover', isBulletin ? 'h-10 w-10' : 'h-8 w-8')}
        />
      ) : (
        <div className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-gradient-tech text-white',
          isBulletin ? 'h-10 w-10 text-xs' : 'h-8 w-8 text-[10px]'
        )}>
          {initials(author?.full_name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-bold leading-none">{author?.full_name || 'Usuario'}</span>
          {(author?.role === 'admin' || author?.role === 'operador') && (
            <span className="rounded-full bg-gradient-tech-soft px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-primary">Equipo</span>
          )}
          <span className="text-[10px] text-muted-foreground">{formatTime(message.created_at)}</span>
          {message.edited_at && <span className="text-[10px] text-muted-foreground italic">editado</span>}
          {message.pinned && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-amber-600 dark:text-amber-300">Fijado</span>
          )}
          {isBulletin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-amber-600 dark:text-amber-300">
              <Megaphone className="h-2.5 w-2.5" /> Boletín
            </span>
          )}
        </div>

        <MessageContent
          text={message.content}
          className={cn(
            'mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90',
            isBulletin && 'text-[15px] font-medium leading-relaxed'
          )}
        />

        {(reactions.length > 0 || readers.length > 0) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {reactions.map(r => (
              <button
                key={r.emoji}
                type="button"
                title={r.users.map(u => u.full_name || 'Usuario').join(', ')}
                onClick={() => onReact(message, r.emoji)}
                className={cn(
                  'flex h-6 items-center gap-1 rounded-full border px-1.5 text-[11px] transition-all active:scale-95',
                  r.reacted_by_me
                    ? 'border-primary/40 bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5'
                )}
              >
                <span className="text-[12px] leading-none">{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
            {readers.length > 0 && (
              <button
                type="button"
                title={`Visto por: ${readerNames}`}
                onClick={() => onView(message)}
                className={cn(
                  'flex h-6 items-center gap-1 rounded-full border px-1.5 text-[10px] transition-colors',
                  message.read_by_me
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-border bg-muted/40 text-muted-foreground hover:border-emerald-500/30'
                )}
              >
                <Eye className="h-3 w-3" />
                {readers.length}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute -top-3 right-2 z-10 hidden items-center gap-0.5 rounded-lg border bg-popover p-0.5 shadow-md group-hover:flex">
        <div className="relative">
          <button
            type="button"
            title="Reaccionar"
            onClick={() => setPickerOpen(v => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
              <div className="absolute right-0 top-7 z-20 flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-xl">
                {SALA_REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { setPickerOpen(false); onReact(message, emoji); }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-transform hover:scale-125 hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          title="Marcar como visto"
          onClick={() => onView(message)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-muted',
            message.read_by_me ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {canReply && (
          <button
            type="button"
            title="Responder"
            onClick={() => onReply(message)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageSquareReply className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            title="Eliminar"
            onClick={() => onDelete(message)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );

  return card;
}
