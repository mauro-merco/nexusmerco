'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth-store';
import { useSalaFeed } from '@/lib/hooks/use-salas';
import { SALA_KIND_CONFIG, SALA_MEMBER_ROLE_CONFIG } from '@/lib/sala-config';
import { SalaMessageCard } from '@/components/sala-message';
import type { Sala, SalaMessage, User } from '@/lib/types';
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquareReply,
  ImagePlus, UserPlus,
  Pencil,
  Send,
  Trash2,
  Users2,
  X,
} from 'lucide-react';

interface SalaRoomViewProps {
  salaId: string;
  room: Sala | null;
  me: User | null;
  onBack: () => void;
  onEdit: (sala: Sala) => void;
  onJoin: (salaId: string) => Promise<void>;
  onLeave: (salaId: string) => Promise<void>;
  onDelete: (sala: Sala) => Promise<void>;
  onParticipation: (sala: Sala) => void;
  onLoaded?: () => void;
}

export function SalaRoomView({
  salaId,
  room,
  me,
  onBack,
  onEdit,
  onJoin,
  onLeave,
  onDelete,
  onParticipation,
  onLoaded,
}: SalaRoomViewProps) {
  const feed = useSalaFeed(salaId);
  const { token } = useAuthStore();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<SalaMessage | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsers, setInviteUsers] = useState<User[]>([]);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const notifiedRef = useRef<string | null>(null);

  const current: Sala | null = room || feed.sala
    ? ({ ...(room || {}), ...(feed.sala || {}) } as Sala)
    : null;
  const kindCfg = current ? SALA_KIND_CONFIG[current.kind] : SALA_KIND_CONFIG.chat;
  const KindIcon = kindCfg.icon;
  const joined = !!current?.joined;
  const canWrite = feed.canPost || !!replyTo;
  const canModerate = feed.canModerate;
  const canInvite = canModerate && (current?.created_by === me?.id || me?.role === 'admin');
  const members = current?.members || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [feed.messages.length, salaId]);

  useEffect(() => {
    setText('');
    setReplyTo(null);
    setActionError(null);
  }, [salaId]);

  useEffect(() => {
    if (feed.loading || !feed.sala || notifiedRef.current === salaId) return;
    notifiedRef.current = salaId;
    onLoaded?.();
  }, [feed.loading, feed.sala, salaId, onLoaded]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setActionError(null);
    try {
      await feed.sendMessage(content, replyTo?.id || null);
      setText('');
      setReplyTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo enviar');
    }
  };

  const handleReact = async (message: SalaMessage, emoji: string) => {
    setActionError(null);
    try { await feed.toggleReaction(message.id, emoji); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo reaccionar'); }
  };

  const handleView = async (message: SalaMessage) => {
    setActionError(null);
    try { await feed.markViewed(message.id); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo marcar como visto'); }
  };

  const handleDelete = async (message: SalaMessage) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    setActionError(null);
    try { await feed.deleteMessage(message.id); }
    catch (e) { setActionError(e instanceof Error ? e.message : 'No se pudo eliminar'); }
  };

  const handleEdit = async (message: SalaMessage, content: string) => feed.editMessage(message.id, content);

  const openInvite = async () => {
    setInviteOpen(true);
    setInvitedIds([]);
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('No se pudo cargar el equipo');
      const json = await res.json();
      setInviteUsers((json.data || []).filter((member: User) =>
        (member.role === 'admin' || member.role === 'operador') && member.id !== me?.id && !members.some(existing => existing.user_id === member.id)));
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Error al cargar usuarios'); }
  };

  const sendInvites = async () => {
    setInviting(true);
    try {
      const res = await fetch(`/api/salas/${salaId}/invite`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_ids: invitedIds }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo invitar');
      setInviteOpen(false);
      onLoaded?.();
    } catch (error) { setActionError(error instanceof Error ? error.message : 'No se pudo invitar'); }
    finally { setInviting(false); }
  };

  const addImageLink = () => {
    const url = imageUrl.trim();
    if (!/^https:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?$/i.test(url)) {
      setActionError('Pegá un enlace HTTPS directo a una imagen o GIF (.png, .jpg, .webp, .gif).');
      return;
    }
    setText(previous => `${previous.trim()}${previous.trim() ? '\n' : ''}${url}`);
    setImageUrl(''); setImageOpen(false); setActionError(null);
    inputRef.current?.focus();
  };

  const handleJoin = async () => {
    setJoining(true);
    setActionError(null);
    try {
      await onJoin(salaId);
      await feed.refresh(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo unir');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('¿Salir de esta sala? Podés volver a unirte si es pública.')) return;
    setJoining(true);
    setActionError(null);
    try {
      await onLeave(salaId);
      await feed.refresh(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo salir');
    } finally {
      setJoining(false);
    }
  };

  const handleReply = (message: SalaMessage) => {
    setReplyTo(message);
    inputRef.current?.focus();
  };

  if (feed.error && !current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">{feed.error}</p>
        <Button variant="outline" size="sm" onClick={onBack}>Volver a las salas</Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className={cn('flex shrink-0 flex-wrap items-center gap-2.5 border-b px-3 py-2.5 sm:px-4', kindCfg.borderClass, kindCfg.bgColorClass)}>
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground lg:hidden"
          aria-label="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg shadow-sm', kindCfg.gradient)}>
          {current?.emoji || (current?.kind === 'boletin' ? '📣' : '💬')}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="truncate text-[15px] font-bold leading-tight">{current?.name || 'Sala'}</h2>
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase', kindCfg.colorClass, kindCfg.borderClass)}>
              <KindIcon className="h-2.5 w-2.5" /> {kindCfg.shortLabel}
            </span>
            {current?.visibility === 'privada' && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                <Lock className="h-2.5 w-2.5" /> Privada
              </span>
            )}
            {current?.my_role && current.my_role !== 'member' && (
              <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', SALA_MEMBER_ROLE_CONFIG[current.my_role].colorClass)}>
                {SALA_MEMBER_ROLE_CONFIG[current.my_role].label}
              </span>
            )}
          </div>
          {current?.description && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{current.description}</p>}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowMembers(v => !v)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Users2 className="h-3.5 w-3.5" />
            {current?.member_count || members.length || 1}
            <ChevronDown className={cn('h-3 w-3 transition-transform', showMembers && 'rotate-180')} />
          </button>
          {canInvite && <button type="button" onClick={openInvite} title="Invitar integrantes del equipo"
            className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background/50 text-muted-foreground hover:text-primary"><UserPlus className="h-4 w-4" /></button>}
          {joined ? (
            <button
              type="button"
              title="Salir de la sala"
              onClick={handleLeave}
              disabled={joining}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <Button variant="cta" size="sm" className="h-8 gap-1.5 rounded-lg px-2.5 text-[11px]" onClick={handleJoin} disabled={joining}>
              {joining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
              Unirme
            </Button>
          )}
          <button
            type="button"
            title="Mi participación en esta sala"
            onClick={() => current && onParticipation(current)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {canModerate && current && (
            <button
              type="button"
              title="Editar sala"
              onClick={() => onEdit(current)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {canModerate && current && (
            <button
              type="button"
              title="Eliminar sala"
              onClick={() => onDelete(current)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {showMembers && (
        <div className="shrink-0 border-b bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap gap-1.5">
            {members.length === 0 && <p className="text-[11px] text-muted-foreground">Sin integrantes cargados</p>}
            {members.map(m => (
              <span key={m.user_id} className="flex items-center gap-1.5 rounded-full border bg-card px-2 py-1 text-[10px]">
                {m.user?.avatar_url ? (
                  <img src={m.user.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[8px] font-bold">
                    {(m.user?.full_name || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                {m.user?.full_name || 'Usuario'}
                {m.role !== 'member' && <span className="text-muted-foreground">· {SALA_MEMBER_ROLE_CONFIG[m.role].label}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-1.5 py-3 sm:px-3">
        {feed.loading && feed.messages.length === 0 && (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando la sala…
          </div>
        )}
        {!feed.loading && feed.messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60">
              <Megaphone className="h-6 w-6 text-muted-foreground/60" />
            </span>
            <p className="text-sm font-semibold">Todavía no hay mensajes</p>
            <p className="max-w-xs text-[11px] text-muted-foreground">
              {current?.kind === 'boletin'
                ? 'El equipo todavía no publicó ningún boletín en esta sala.'
                : 'Escribí el primero y arrancá la conversación.'}
            </p>
          </div>
        )}

        <div className="space-y-1">
          {feed.messages.map(message => (
            <div key={message.id}>
              <SalaMessageCard
                message={message}
                meId={me?.id}
                canModerate={canModerate}
                canReply={!!me}
                isBulletin={current?.kind === 'boletin'}
                onReply={handleReply}
                onReact={handleReact}
                onView={handleView}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
              {(message.replies || []).length > 0 && (
                <div className="ml-9 space-y-1 border-l-2 border-border/60 pl-2 sm:ml-11">
                  {(message.replies || []).map(reply => (
                    <SalaMessageCard
                      key={reply.id}
                      message={reply}
                      meId={me?.id}
                      canModerate={canModerate}
                      canReply={false}
                      isReply
                      onReply={handleReply}
                      onReact={handleReact}
                      onView={handleView}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t bg-background/95 px-2.5 py-2.5 sm:px-4">
        {actionError && (
          <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
            {actionError}
            <button type="button" onClick={() => setActionError(null)}><X className="h-3 w-3" /></button>
          </div>
        )}

        {replyTo && (
          <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-[11px]">
            <MessageSquareReply className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 truncate">
              Respondiendo a <strong>{replyTo.author?.full_name || 'Usuario'}</strong>: {replyTo.content}
            </span>
            <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!canWrite ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 text-[11px] text-amber-700 dark:text-amber-200">
            <Megaphone className="h-4 w-4 shrink-0" />
            <span>
              <strong>Boletín del equipo.</strong> Solo admin y operadores publican anuncios. Podés reaccionar, marcar como visto o responder en hilo.
            </span>
          </div>
        ) : (
          <div className="flex items-end gap-1.5">
            {me?.avatar_url ? (
              <img src={me.avatar_url} alt="" className="mb-0.5 h-8 w-8 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-tech text-[10px] font-bold text-white">
                {(me?.full_name || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="flex min-w-0 flex-1 items-end rounded-2xl border bg-card px-2 py-1 focus-within:border-primary/40">
              <button type="button" onClick={() => setImageOpen(true)} title="Adjuntar imagen o GIF desde un enlace externo"
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"><ImagePlus className="h-4 w-4" /></button>
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder={replyTo ? 'Escribí una respuesta…' : current?.kind === 'boletin' ? 'Publicá un boletín…' : 'Escribí un mensaje…'}
                className="max-h-32 min-h-[30px] flex-1 resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                style={{ height: 'auto' }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={feed.sending || !text.trim()}
                className={cn(
                  'mb-0.5 ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
                  text.trim() ? 'bg-gradient-tech text-white shadow-sm hover:opacity-90 active:scale-95' : 'bg-muted text-muted-foreground'
                )}
                aria-label="Enviar"
              >
                {feed.sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
        <p className="mt-1 text-center text-[9px] text-muted-foreground">
          Enter para enviar · Shift+Enter para salto de línea · Cada interacción queda en tu perfil
        </p>
      </div>
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Compartir imagen o GIF</DialogTitle>
          <DialogDescription>Pegá el enlace directo a una imagen pública. Se mostrará desde su sitio original; no se sube ningún archivo acá.</DialogDescription>
          <input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="https://sitio.com/imagen.gif"
            onKeyDown={event => { if (event.key === 'Enter') addImageLink(); }} className="h-10 w-full rounded-lg border bg-background px-3 text-sm" />
          <Button onClick={addImageLink}>Agregar al mensaje</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Invitar al equipo</DialogTitle>
          <DialogDescription>Solo se puede invitar a usuarios admin u operador. Recibirán una notificación.</DialogDescription>
          <div className="max-h-60 space-y-1 overflow-y-auto">
            {inviteUsers.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No hay integrantes nuevos para invitar.</p>}
            {inviteUsers.map(member => <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted">
              <input type="checkbox" checked={invitedIds.includes(member.id)} onChange={() => setInvitedIds(previous => previous.includes(member.id) ? previous.filter(id => id !== member.id) : [...previous, member.id])} />
              {member.full_name || member.email}
            </label>)}
          </div>
          <Button disabled={!invitedIds.length || inviting} onClick={sendInvites}>{inviting ? 'Invitando…' : `Invitar (${invitedIds.length})`}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
