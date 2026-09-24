'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Inbox className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Iniciá sesión para ver tus mensajes.</p>
        <Button variant="cta" size="cta">Iniciar sesión</Button>
      </div>
    );
  }

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Mensajes</h1>
          <p className="text-xs text-muted-foreground">
            {totalUnread > 0 ? `${totalUnread} sin leer` : 'Sin mensajes sin leer'}
          </p>
        </div>
        <Button variant="cta" size="cta" className="gap-2" onClick={() => setComposeOpen(true)}>
          <MessageSquarePlus className="h-4 w-4" /> Nuevo
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
        {/* Conversation list */}
        <div className={cn('min-h-0 flex-col overflow-hidden rounded-xl border bg-card md:flex', mobileThread ? 'hidden' : 'flex')}>
          <div className="border-b bg-muted/20 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar conversación..."
                className="h-9 rounded-lg pl-8 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (composeOpen && !toId) setToId('');
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && conversations.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Inbox className="h-8 w-8 opacity-40" />
                <p className="text-xs">No hay conversaciones</p>
              </div>
            )}

            {conversations.map((c) => (
              <button
                key={c.user?.id}
                onClick={() => openConversation(c.user?.id || '')}
                className={cn(
                  'relative w-full border-b border-border/40 px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
                  activeId === c.user?.id && 'bg-gradient-tech-soft'
                )}
              >
                <div className="flex items-center gap-2.5">
                  {c.user?.avatar_url ? (
                    <img src={c.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(c.user?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{c.user?.full_name || 'Desconocido'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {c.last_message?.content}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-gradient-tech flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[9px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread */}
        <div className={cn('min-h-0 flex-col overflow-hidden rounded-xl border bg-card md:flex', !mobileThread && 'hidden md:flex', mobileThread && 'flex')}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Mail className="h-10 w-10 opacity-30" />
              <p className="text-sm">Seleccioná una conversación</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b bg-muted/20 px-3 py-2">
                <button onClick={() => setMobileThread(false)} className="md:hidden rounded-lg p-1 hover:bg-muted/60">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {active.user?.avatar_url ? (
                  <img src={active.user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover border border-border" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(active.user?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${active.user?.id}`} className="truncate text-sm font-semibold hover:underline">
                    {active.user?.full_name || 'Desconocido'}
                  </Link>
                  <p className="truncate text-[10px] text-muted-foreground">{active.user?.email}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] capitalize">{active.user?.role}</Badge>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {active.messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('group relative max-w-[78%] rounded-2xl px-3 py-2 shadow-sm', mine ? 'bg-gradient-tech text-white rounded-br-md' : 'bg-muted/60 rounded-bl-md')}>
                        <p className="text-xs whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                        <div className={cn('mt-0.5 flex items-center gap-1', mine ? 'text-white/60' : 'text-muted-foreground')}>
                          <span className="text-[9px]">
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

              <div className="border-t p-2">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(active.user?.id || '', msgText); }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    placeholder={`Mensaje para ${active.user?.full_name || '...'}`}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl text-sm py-2.5"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    variant="cta"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setComposeOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-popover shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-primary" /> Nuevo mensaje
              </h3>
              <button onClick={() => setComposeOpen(false)} className="rounded-lg p-1 hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b px-4 py-2">
              <p className="mb-1.5 text-[10px] text-muted-foreground font-medium">Para:</p>
              <Input
                placeholder="Buscar por nombre o email..."
                value={toId ? users.find((u) => u.id === toId)?.full_name || '' : search}
                onChange={(e) => { setSearch(e.target.value); setToId(''); }}
                className="h-9 text-sm"
              />
              {!toId && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>}
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => { setToId(u.id); setSearch(''); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                          {(u.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{u.full_name}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              <Textarea
                placeholder="Escribí tu mensaje..."
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="min-h-[90px]"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  variant="cta"
                  size="cta"
                  className="flex-1 gap-2"
                  disabled={sending || !toId || !msgText.trim()}
                  onClick={() => sendMessage(toId, msgText)}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </Button>
                <Button variant="outline" size="cta" onClick={() => setComposeOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}