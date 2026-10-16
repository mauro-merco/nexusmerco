'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess } from '@/lib/permissions';
import { MessageContent } from '@/components/message-content';
import { cn } from '@/lib/utils';
import {
  Mail, Send, Loader2, Search, X, MessageSquarePlus, ChevronLeft, Inbox, Trash2, Users, Plus, Check,
} from 'lucide-react';
import type { User, Message, MessageGroup } from '@/lib/types';

interface DmConversation {
  kind: 'dm';
  key: string;
  user: User | null;
  last_message: Message;
  unread: number;
  messages: Message[];
}

interface GroupConversation {
  kind: 'group';
  key: string;
  group: MessageGroup;
  last_message: Message;
  unread: number;
  messages: Message[];
}

type Conversation = DmConversation | GroupConversation;

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', operador: 'Operador', client: 'Cliente' };

function convName(c: Conversation) {
  return c.kind === 'group' ? c.group.name : (c.user?.full_name || 'Desconocido');
}
function convSubtitle(c: Conversation) {
  if (c.kind === 'group') return `${c.group.members.length} integrantes`;
  return c.user?.email || '';
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export default function MessagesPage() {
  const { user, token } = useAuthStore();

  if (!hasModuleAccess(user, 'mensajes')) {
    return <NoAccess message="No tienes permiso para acceder a los mensajes." />;
  }

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [toId, setToId] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
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
  }, [user, token]);

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
    const group = params.get('group');
    if (group) { setActiveKey(`group:${group}`); setMobileThread(true); }
    else if (to) { setActiveKey(`dm:${to}`); setMobileThread(true); }

    const authToken = useAuthStore.getState().token;
    if (authToken) {
      fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({}),
      }).then(() => window.dispatchEvent(new Event('notifications:refresh')));
    }
  }, []);

  const active = conversations.find((c) => c.key === activeKey) || null;

  const markRead = useCallback(async (conv: Conversation) => {
    if (conv.kind === 'group') {
      await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ group: conv.group.id }),
      });
      window.dispatchEvent(new Event('notifications:refresh'));
      setConversations((prev) => prev.map((c) => (c.key === conv.key ? { ...c, unread: 0 } : c)));
      return;
    }

    const convId = conv.user?.id;
    if (!convId) return;
    await fetch('/api/messages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ from: convId }),
    });
    window.dispatchEvent(new Event('notifications:refresh'));

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
        c.key === conv.key
          ? {
              ...c,
              unread: 0,
              messages: c.messages.map((m) => (unreadIds.includes(m.id) ? { ...m, read: true } : m)),
            }
          : c
      )
    );
  }, [user, token]);

  const openConversation = (conv: Conversation) => {
    setActiveKey(conv.key);
    setMobileThread(true);
    markRead(conv);
  };

  const sendMessage = async (targetKey: string, text: string) => {
    if (!text.trim() || !targetKey) return;
    setSending(true);
    setError(null);
    try {
      const isGroup = targetKey.startsWith('group:');
      const body = isGroup
        ? { group_id: targetKey.slice('group:'.length), content: text.trim() }
        : { recipient_id: targetKey.slice('dm:'.length), content: text.trim() };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      await fetchConversations();
      setMsgText('');
      setActiveKey(targetKey);
      setMobileThread(true);
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

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/message-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: groupName.trim(), member_ids: groupMembers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setGroupOpen(false);
      setGroupName('');
      setGroupMembers([]);
      setSearch('');
      await fetchConversations();
      if (json.data?.id) { setActiveKey(`group:${json.data.id}`); setMobileThread(true); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(activeKey || '', msgText);
    }
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
    if (!q || composeOpen || groupOpen) return conversations;
    return conversations.filter((c) => `${convName(c)} ${convSubtitle(c)}`.toLowerCase().includes(q));
  }, [conversations, search, composeOpen, groupOpen]);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => { setGroupOpen(true); setError(null); }}>
            <Users className="h-4 w-4" /> Nuevo grupo
          </Button>
          <Button className="gap-2 rounded-xl" onClick={() => { setComposeOpen(true); setError(null); }}>
            <MessageSquarePlus className="h-4 w-4" /> Nuevo mensaje
          </Button>
        </div>
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
                key={c.key}
                onClick={() => openConversation(c)}
                className={cn(
                  'relative w-full rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-background/60 dark:hover:bg-white/[0.05]',
                  activeKey === c.key && 'bg-background dark:bg-white/[0.08]'
                )}
              >
                <div className="flex items-center gap-3">
                  {c.kind === 'group' ? (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                  ) : c.user?.avatar_url ? (
                    <img src={c.user.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {(c.user?.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={cn('truncate text-sm', c.unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>{convName(c)}</p>
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
                {active.kind === 'group' ? (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                ) : active.user?.avatar_url ? (
                  <img src={active.user.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(active.user?.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {active.kind === 'group' ? (
                    <p className="truncate text-sm font-semibold text-foreground">{active.group.name}</p>
                  ) : (
                    <Link href={`/u/${active.user?.id}`} className="truncate text-sm font-semibold text-foreground hover:underline block">
                      {active.user?.full_name || 'Desconocido'}
                    </Link>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{convSubtitle(active)}</p>
                </div>
                <span className="rounded-full bg-background/70 dark:bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted-foreground shrink-0">
                  {active.kind === 'group' ? 'Grupo' : (ROLE_LABELS[active.user?.role || ''] || active.user?.role)}
                </span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {active.messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  const showSender = active.kind === 'group' && !mine;
                  return (
                    <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div className="max-w-[75%]">
                        {showSender && (
                          <p className="mb-0.5 px-1 text-[11px] font-semibold text-muted-foreground">
                            {m.sender?.full_name || m.sender?.email || 'Usuario'}
                          </p>
                        )}
                        <div className={cn('group relative rounded-2xl px-4 py-2.5', mine ? 'bg-primary text-primary-foreground' : 'bg-background dark:bg-white/[0.06] text-foreground')}>
                          <MessageContent text={m.content} className="text-sm whitespace-pre-wrap break-words leading-relaxed" />
                          <div className={cn('mt-1 flex items-center gap-1.5', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            <span className="text-[10px]">
                              {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {(mine || active.kind === 'group') && (
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
                    </div>
                  );
                })}
              </div>

              <div className="p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(active.key, msgText); }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    placeholder={`Mensaje para ${convName(active)}... (Ctrl+Enter para enviar)`}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
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

      {/* New DM dialog */}
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
                onKeyDown={handleComposerKeyDown}
                className="min-h-[90px] rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04]"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 rounded-xl"
                  disabled={sending || !toId || !msgText.trim()}
                  onClick={() => sendMessage(`dm:${toId}`, msgText)}
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

      {/* New group dialog */}
      {groupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGroupOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-popover shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-base font-bold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-primary" /> Nuevo grupo
              </h3>
              <button onClick={() => setGroupOpen(false)} className="rounded-lg p-1.5 hover:bg-muted/60">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-3 space-y-3">
              <Input
                placeholder="Nombre del grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="h-10 rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04] text-sm"
              />
              {groupMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {groupMembers.map((id) => {
                    const u = users.find((x) => x.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                        {u?.full_name || u?.email || id}
                        <button onClick={() => setGroupMembers((prev) => prev.filter((x) => x !== id))}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar personas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-xl border-0 bg-muted/40 dark:bg-white/[0.04] pl-9 text-sm"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredUsers.length === 0 && <p className="py-2 text-center text-xs text-muted-foreground">Sin resultados</p>}
                {filteredUsers.map((u) => {
                  const on = groupMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      onClick={() => setGroupMembers((prev) => on ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                      className={cn('flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors', on ? 'bg-primary/10' : 'hover:bg-background/60 dark:hover:bg-white/[0.05]')}
                    >
                      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials(u.full_name || u.email || '?')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">{u.full_name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 pt-0 space-y-3">
              {error && <p className="text-xs text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 rounded-xl"
                  disabled={sending || !groupName.trim() || groupMembers.length === 0}
                  onClick={createGroup}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear grupo
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setGroupOpen(false)}>Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
