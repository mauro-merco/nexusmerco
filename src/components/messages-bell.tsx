'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useUnreadMessages } from '@/lib/hooks/use-unread-messages';
import { Mail, Loader2, Inbox, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User, Message } from '@/lib/types';

interface Conversation {
  user: User | null;
  last_message: Message;
  unread: number;
}

export function MessagesBell() {
  const { user, token } = useAuthStore();
  const router = useRouter();
  const { unreadCount, refetch } = useUnreadMessages(user?.id || null, token);
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((json) => setConversations((json.data || []).slice(0, 6)))
      .finally(() => setLoading(false));
  }, [open, token]);

  const openConversation = (id: string | undefined) => {
    setOpen(false);
    refetch();
    router.push(id ? `/messages?to=${id}` : '/messages');
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn('relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-colors', open && 'bg-muted/60')}
        onClick={() => setOpen(!open)}
        aria-label="Mensajes"
      >
        <Mail className={cn('h-4.5 w-4.5', unreadCount > 0 ? 'text-primary' : 'text-muted-foreground')} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-14 z-50 mx-auto flex max-h-[440px] w-auto max-w-md flex-col overflow-hidden rounded-2xl bg-popover shadow-xl md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-80">
            <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-primary" /> Mensajes
              </span>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && conversations.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                  <Inbox className="h-7 w-7 opacity-40" />
                  <p className="text-xs">Sin conversaciones</p>
                </div>
              )}
              {conversations.map((c) => (
                <button
                  key={c.user?.id}
                  onClick={() => openConversation(c.user?.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors flex items-center gap-2.5"
                >
                  {c.user?.avatar_url ? (
                    <img src={c.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(c.user?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn('truncate text-xs', c.unread > 0 ? 'font-semibold' : 'font-medium text-muted-foreground')}>{c.user?.full_name || 'Desconocido'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{c.last_message?.content}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="h-5 min-w-[20px] rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center px-1.5 shrink-0">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => openConversation(undefined)}
              className="flex w-full items-center justify-center gap-1.5 bg-muted/30 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
            >
              Ver todos los mensajes
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
