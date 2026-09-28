'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import {
  Mail, Send, Loader2, Search, X, MessageSquarePlus, ChevronLeft, Inbox, Trash2,
} from 'lucide-react';
import type { User, Message } from '@/lib/types';

interface Conversation {
  user: User | null;
  last_message: Message;
  unread: number;
  messages: Message[];
}

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', operador: 'Operador', client: 'Cliente' };

export default function MessagesPage() {
  const { user, token } = useAuthStore();

  if (!hasModuleAccess(user, 'mensajes')) {
    return <NoAccess message="No tienes permiso para acceder a los mensajes." />;
  }

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toId, setToId] = useState<string>('');
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setConversations(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    if (user) {
      fetch('/api/users')
        .then((r) => r.json())
        .then((json) => setUsers(json.data || []))
        .catch(() => { /* */ });
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const to = params.get('to');
    if (to) { setActiveId(to); setMobileThread(true); }
  }, []);

  const active = conversations.find((c) => c.user?.id === activeId) || null;

  const markRead = useCallback(async (convId: string) => {
    const conv = conversations.find((c) => c.user?.id === convId);
    if (!conv) return;
    const unreadIds = conv.messages.filter((m) => m.recipient_id === user?.id && !m.read).map((m) => m.id);
    if (unreadIds.length === 0) return;
    await Promise.all(
      unreadIds.map((id) =>
        fetch(`/api/messages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ read: true }),
        })
      )
    );
    setConversations((prev) =>
      prev.map((c) =>
        c.user?.id === convId
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m)),
            }
          : c
      )
    );
  }, [conversations, user]);

  const openConversation = (convId: string) => {
    setActiveId(convId);
    setMobileThread(true);
    markRead(convId);
  };

  const sendMessage = async (targetId: string, text: string) => {
    if (!text.trim() || !targetId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipient_id: targetId, content: text.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await fetchConversations();
      const targetUser = users.find((u) => u.id === targetId);
      setMsgText('');
      if (!composeOpen) {
        if (targetUser && conversations.some((c) => c.user?.id === targetId)) {
          setActiveId(targetId);
          setMobileThread(true);
        }
      } else {
        setToId('');
        setComposeOpen(false);
        setActiveId(targetId);
        setMobileThread(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (m: Message) => {
    if (!user) return;
    const res = await fetch(`/api/messages/${m.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) await fetchConversations();
  };

  const filteredUsers = useMemo(() => {
    const meId = user?.id || '';
    return users
      .filter((u) => u.id !== meId)
      .filter((u) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return `${u.full_name} ${u.email}`.toLowerCase().includes(q);
      });
  }, [users, search, user]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || composeOpen) return conversations;
    return conversations.filter((c) => `${c.user?.full_name} ${c.user?.email}`.toLowerCase().includes(q));
  }, [conversations, search, composeOpen]);

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Iniciá sesión para ver tus mensajes.</p>
      </div>
    );
  }

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mensajes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalUnread > 0 ? `${totalUnread} sin leer` : 'Todo al día'}
          </p>
        </div>
        <Button className="gap-2 rounded-xl" onClick={() => setComposeOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" /> Nuevo mensaje
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        {/* Conversation list */}
        <div className={cn('min-h-0 flex-col overflow-hidden rounded-3xl bg-muted/40 dark:bg-white/[0.04] md:flex', mobileThread ? 'hidden' : 'flex')}>
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conversación..."
                className="h-10 rounded-xl border-0 bg-background/60 dark:bg-white/[0.04] pl-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && filteredConversations.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-xs">No hay conversaciones</p>
              </div>
            )}

            {filteredConversations.map((c) => (
              <button
                key={c.user?.id}
                onClick={() => openConversation(c.user?.id || '')}
                className={cn(
                  'relative w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-background/60 dark:hover:bg-white/[0.05]',
                  activeId === c.user?.id && 'bg-background dark:bg-white/[0.08]'
                )}
              >
                <div className="flex items-center gap-3">
                  {c.user?.avatar_url ? (
                    <img src={c.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(c.user?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', c.unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>{c.user?.full_name || 'Desconocido'}</p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {c.last_message?.content}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={cn('min-h-0 flex-col overflow-hidden rounded-3xl bg-muted/40 dark:bg-white/[0.04] md:flex', !mobileThread && 'hidden md:flex', mobileThread && 'flex')}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">Seleccioná una conversación</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setMobileThread(false)} className="md:hidden rounded-lg p-1 hover:bg-background/60">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {active.user?.avatar_url ? (
                  <img src={active.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(active.user?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${active.user?.id}`} className="truncate text-sm font-semibold text-foreground hover:underline block">
                    {active.user?.full_name || 'Desconocido'}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{active.user?.email}</p>
                </div>
                <span className="rounded-full bg-background/70 dark:bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0">
                  {ROLE_LABELS[active.user?.role || ''] || active.user?.role}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {active.messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('group relative max-w-[75%] rounded-2xl px-4 py-2.5', mine ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-white/[0.06] text-foreground')}>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                        <div className={cn('mt-1 flex items-center gap-1.5', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          <span className="text-[10px]">
                            {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {mine && (
                            <button
                              onClick={() => deleteMessage(m)}
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(active.user?.id || '', msgText); }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    placeholder={`Mensaje para ${active.user?.full_name || '...'}`}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    className="min-h-[46px] max-h-32 flex-1 resize-none rounded-xl border-0 bg-background/60 dark:bg-white/[0.04] text-sm py-3"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl"
                    disabled={sending || !msgText.trim()}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compose dialog */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setComposeOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-popover shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <MessageSquarePlus className="h-4 w-4 text-primary" /> Nuevo mensaje
              </h3>
              <button onClick={() => setComposeOpen(false)} className="rounded-lg p-1.5 hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-3 bg-muted/30">
              <p className="mb-2 text-xs text-muted-foreground font-medium">Para:</p>
              <Input
                placeholder="Buscar por nombre o email..."
                value={toId ? users.find((u) => u.id === toId)?.full_name || '' : search}
                onChange={(e) => { setSearch(e.target.value); setToId(''); }}
                className="h-10 rounded-xl border-0 bg-background/70 dark:bg-white/[0.04] text-sm"
              />
              {!toId && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>}
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setToId(u.id); setSearch(''); }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-background/60 dark:hover:bg-white/[0.05]"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {(u.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{u.full_name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 space-y-3">
              <Textarea
                placeholder="Escribí tu mensaje..."
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="min-h-[90px] rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04]"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 rounded-xl"
                  disabled={sending || !toId || !msgText.trim()}
                  onClick={() => sendMessage(toId, msgText)}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setComposeOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
