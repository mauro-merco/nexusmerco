'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, MessageCircle, Loader2, ShoppingBag, LogIn, User, Eye, EyeOff, LogOut, Plus, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SocialIdea, IdeaStatus, EcommerceDate, SocialComment } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface CalendarData {
  client: { id: string; name: string; logo_url: string | null };
  ideas: SocialIdea[];
  attachments_by_idea: Record<string, { url: string; name: string; type: string }[]>;
  comments_by_idea: Record<string, SocialComment[]>;
  ecommerce_dates: EcommerceDate[];
  calendar_type: 'social' | 'ads';
  month?: string | null;
}

type AuthMode = 'loading' | 'authenticated' | 'gate';

interface Viewer {
  type: 'user' | 'guest';
  name: string;
  color: string;
  email?: string;
  authToken?: string; // JWT for authenticated users
}

const GUEST_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a3'];

function getStorageKey(token: string, type: string) {
  return `calendar_viewer_${token}_${type}`;
}

// ─── Auth Gate ────────────────────────────────────────────────────────────────

function AuthGate({ token, client, calendarType, onEnter }: {
  token: string;
  client: { name: string; logo_url: string | null };
  calendarType: 'social' | 'ads';
  onEnter: (viewer: Viewer) => void;
}) {
  const [tab, setTab] = useState<'login' | 'guest'>('login');
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  // Guest state
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);

  const calLabel = calendarType === 'ads' ? 'Piezas para ADS' : 'Calendario de Redes';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setLoginError('Completá email y contraseña'); return; }
    setLoginLoading(true);
    setLoginError('');
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) { setLoginError(error?.message || 'Credenciales incorrectas'); return; }
      const session = data.session;
      const userId = session.user.id;
      // Fetch full name from users table
      const { data: userData } = await supabase.from('users').select('full_name').eq('id', userId).single();
      const name = userData?.full_name || data.session.user.email || 'Usuario';
      onEnter({ type: 'user', name, color: GUEST_COLORS[0], authToken: session.access_token });
    } catch {
      setLoginError('Error al iniciar sesión');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestEmail.trim() || !guestPassword.trim()) { setGuestError('Completá email y contraseña'); return; }
    setGuestError('');
    setGuestLoading(true);
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword({ email: guestEmail.trim(), password: guestPassword });
      if (error || !data.session) { setGuestError(error?.message || 'Credenciales incorrectas'); return; }

      const res = await fetch(`/api/calendar-links/${token}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setGuestError(json.error || 'Email no autorizado'); return; }
      onEnter({ type: 'guest', name: json.name || data.session.user.email || guestEmail.trim(), email: json.email || guestEmail.trim(), color: GUEST_COLORS[0], authToken: data.session.access_token });
    } catch {
      setGuestError('Error al validar el acceso');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {client.logo_url ? (
          <img src={client.logo_url} alt={client.name} className="h-12 mx-auto object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto">
            <span className="text-xl font-bold text-primary">{client.name.charAt(0)}</span>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{calLabel} · {client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Accedé para ver y comentar el calendario</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl border bg-muted/30 p-1">
          <button type="button" onClick={() => setTab('login')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'login' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <LogIn className="h-4 w-4" /> Como Merco
          </button>
          <button type="button" onClick={() => setTab('guest')}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'guest' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <User className="h-4 w-4" /> Como invitado
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email" className="h-11 rounded-xl" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Contraseña</label>
              <div className="relative">
                <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'} className="h-11 rounded-xl pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-xs text-destructive">{loginError}</p>}
            <Button type="submit" variant="cta" size="cta" className="w-full gap-2" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Ingresar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleGuest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Email</label>
              <Input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="tu@email.com" type="email" className="h-11 rounded-xl" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Contraseña</label>
              <div className="relative">
                <Input value={guestPassword} onChange={e => setGuestPassword(e.target.value)} placeholder="••••••••"
                  type={showGuestPassword ? 'text' : 'password'} className="h-11 rounded-xl pr-10" />
                <button type="button" onClick={() => setShowGuestPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showGuestPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {guestError && <p className="text-xs text-destructive">{guestError}</p>}
            </div>
            <Button type="submit" variant="cta" size="cta" className="w-full gap-2" disabled={guestLoading}>
              {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />} Entrar al calendario
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Ecommerce bands ──────────────────────────────────────────────────────────

function EcommerceBands({ date, ecommerceDates }: { date: string; ecommerceDates: EcommerceDate[] }) {
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-col gap-px mb-1">
      {active.map(ed => (
        <div key={ed.id} style={{ backgroundColor: ed.color + '22', borderLeft: `2px solid ${ed.color}`, color: ed.color }}
          className="text-[8px] font-bold px-1 py-px rounded-r-sm truncate leading-tight">
          {ed.start_date === date ? ed.name : ' '}
        </div>
      ))}
    </div>
  );
}

// ─── Calendar day ─────────────────────────────────────────────────────────────

function PublicIdeaPill({ idea, onClick }: { idea: SocialIdea; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id, data: { idea } });
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn('flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.02]',
        isPublished ? 'bg-green-500/15 border-green-400/40 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass],
        isDragging && 'opacity-50')}
    >
      <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing"><PtIcon className="h-2.5 w-2.5 shrink-0" /></span>
      <span className="truncate">{idea.eje_contenido || idea.title}</span>
    </div>
  );
}

function CalendarDay({ dateStr, day, ideas, isToday, ecommerceDates, onIdeaClick, onAddClick }: {
  dateStr: string; day: number; ideas: SocialIdea[]; isToday: boolean;
  ecommerceDates: EcommerceDate[]; onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  return (
    <div ref={setNodeRef} className={cn('relative min-h-[15vh] rounded-lg border p-2 bg-card/50 transition-colors', isToday && 'border-primary/50 bg-primary/5', isOver && 'border-primary bg-primary/10')}>
      <EcommerceBands date={dateStr} ecommerceDates={ecommerceDates} />
      <span className={cn('text-xs font-medium block mb-1 pl-0.5', isToday ? 'text-primary font-bold' : 'text-muted-foreground/60')}>{day}</span>
      <div className="space-y-1">
        {ideas.map(idea => <PublicIdeaPill key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} />)}
      </div>
      <button type="button" onClick={() => onAddClick(dateStr)} className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

function CalendarGrid({ monthStr, ideas, ecommerceDates, onIdeaClick, onAddClick }: {
  monthStr: string; ideas: SocialIdea[]; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const [y, m] = monthStr.split('-').map(Number);
  const today = new Date();
  const monthStart = startOfMonth(new Date(y, m - 1, 1));
  const monthEnd = endOfMonth(new Date(y, m - 1, 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay = monthStart.getDay();
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const ideasByDate = new Map<string, SocialIdea[]>();
  for (const idea of ideas.filter(i => i.publish_date.substring(0, 7) === monthStr)) {
    const key = idea.publish_date;
    if (!ideasByDate.has(key)) ideasByDate.set(key, []);
    ideasByDate.get(key)!.push(idea);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5">
        {dayNames.map(n => <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-2">{n}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isToday = today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === day.getDate();
          return (
            <CalendarDay key={dateStr} dateStr={dateStr} day={day.getDate()}
              ideas={ideasByDate.get(dateStr) || []} isToday={isToday}
              ecommerceDates={ecommerceDates} onIdeaClick={onIdeaClick} onAddClick={onAddClick} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Idea modal ───────────────────────────────────────────────────────────────

function IdeaModal({ idea, attachments, comments, viewer, calendarType, token, onClose, onCommentAdded }: {
  idea: SocialIdea;
  attachments: { url: string; name: string; type: string }[];
  comments: SocialComment[];
  viewer: Viewer;
  calendarType: 'social' | 'ads';
  token: string;
  onClose: () => void;
  onCommentAdded: () => void;
}) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const stConfig = STATUS_CONFIG[idea.status];

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) return;
    setSending(true);
    setSendError('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (viewer.authToken) {
        headers['Authorization'] = `Bearer ${viewer.authToken}`;
      }
      const res = await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idea_id: idea.id,
          content,
          guest_name: viewer.type === 'guest' ? viewer.name : null,
          action_type: 'comment',
          calendar_type: calendarType,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setSendError(j.error || 'Error al comentar');
        return;
      }
      setNewComment('');
      onCommentAdded();
    } catch {
      setSendError('Error al enviar comentario');
    } finally {
      setSending(false);
    }
  };

  const copyIdeaLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('idea', idea.id);
    await navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
              <Badge variant="outline" className={cn('text-[10px]', ptConfig.bgColorClass, ptConfig.colorClass)}>{ptConfig.label}</Badge>
              <Badge variant="outline" className={cn('text-[10px]', stConfig.colorClass)}>{stConfig.label}</Badge>
              {idea.publish_date && <span className="text-muted-foreground/60">{idea.publish_date}</span>}
            </div>
            <h2 className="text-lg font-bold">{idea.eje_contenido || idea.title}</h2>
          </div>
          <button onClick={copyIdeaLink} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mt-0.5 shrink-0">
            <Copy className="h-3.5 w-3.5" /> {copiedLink ? 'Copiado' : 'Link'}
          </button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0">
            <span className="sr-only">Cerrar</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-4 md:col-span-3">
          {(idea.assignees || []).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Equipo asignado</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TASK_ROLES.map(role => {
                  const cfg = TASK_ROLE_CONFIG[role];
                  const names = idea.assignees.filter(assignee => assignee.work_role === role).map(assignee => assignee.full_name);
                  return (
                    <div key={role} className={cn('rounded-lg border p-2', cfg.borderClass)}>
                      <p className={cn('text-[10px] font-semibold', cfg.colorClass)}>{cfg.question}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{names.join(', ') || 'Sin asignar'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {idea.copy_text && (
            <div><h3 className="text-xs font-semibold text-muted-foreground mb-1">Copy</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{idea.copy_text}</p></div>
          )}
          {idea.brief && (
            <div><h3 className="text-xs font-semibold text-muted-foreground mb-1">Brief</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.brief}</p></div>
          )}
          {idea.description && (
            <div><h3 className="text-xs font-semibold text-muted-foreground mb-1">Guión / Descripción</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.description}</p></div>
          )}
          {!idea.copy_text && !idea.brief && !idea.description && (
            <p className="text-sm text-muted-foreground italic">Sin contenido</p>
          )}

          {attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Adjuntos</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1 text-xs hover:bg-muted/50 transition-colors">
                    🔗 {att.name || 'Link'}
                  </a>
                ))}
              </div>
            </div>
          )}

            </div>

          <div className="md:col-span-2 rounded-xl border bg-muted/20 p-3">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Comentarios ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">Sé el primero en comentar</p>
              ) : (
                comments.map(comment => {
                  const authorName = comment.guest_name || (comment.user as { full_name?: string })?.full_name || 'Usuario';
                  return (
                    <div key={comment.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px] font-bold"
                            style={{ backgroundColor: viewer.color + '30', color: viewer.color }}>
                            {authorName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{authorName}</span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {new Date(comment.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80 leading-relaxed pl-8">{comment.content}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs font-bold"
                style={{ backgroundColor: viewer.color + '30', color: viewer.color }}>
                {viewer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={`Comentar como ${viewer.name}...`}
              className="flex-1 h-9 text-sm"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <Button size="sm" onClick={handleAddComment} disabled={sending || !newComment.trim()} className="h-9 w-9 p-0 shrink-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {sendError && <p className="text-xs text-destructive pl-9">{sendError}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarLanding({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [calendarType, setCalendarType] = useState<'social' | 'ads'>('social');
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [data, setData] = useState<CalendarData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [initialIdeaId, setInitialIdeaId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaType, setIdeaType] = useState('sugerencia');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [ideaLinks, setIdeaLinks] = useState('');
  const [ideaSending, setIdeaSending] = useState(false);
  const [ideaError, setIdeaError] = useState('');
  const [newIdeaDate, setNewIdeaDate] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Resolve params
  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  // Determine calendar type from URL + check existing session
  useEffect(() => {
    if (!token) return;
    const resolvedToken = token; // capture as non-null for async closures
    const type = new URLSearchParams(window.location.search).get('type') === 'ads' ? 'ads' : 'social';
    setInitialIdeaId(new URLSearchParams(window.location.search).get('idea'));
    setCalendarType(type);

    async function checkSession() {
      // 1) Try Supabase session (set when user logged in via the app or the calendar gate)
      try {
        const { getSupabase } = await import('@/lib/supabase');
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.access_token) {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', session.user.id)
            .single();
          const name = userData?.full_name || session.user.email || 'Usuario';
          setViewer({ type: 'user', name, color: GUEST_COLORS[0], authToken: session.access_token });
          setAuthMode('authenticated');
          return;
        }
      } catch { /* ignore */ }

      // 2) Try Zustand nexus-auth persisted token (app users land here if Supabase session not detected)
      try {
        const nexusRaw = localStorage.getItem('nexus-auth');
        if (nexusRaw) {
          const nexus = JSON.parse(nexusRaw);
          const zustandToken: string = nexus?.state?.token || '';
          const zustandUser = nexus?.state?.user;
          if (zustandToken && zustandUser?.full_name) {
            setViewer({ type: 'user', name: zustandUser.full_name, color: GUEST_COLORS[0], authToken: zustandToken });
            setAuthMode('authenticated');
            return;
          }
        }
      } catch { /* ignore */ }

      // 3) Saved guest (only guests are saved in this key)
      try {
        const stored = localStorage.getItem(getStorageKey(resolvedToken, type));
        if (stored) {
          const saved = JSON.parse(stored) as Viewer;
          if (saved.name?.trim() && saved.email?.trim()) {
            setViewer(saved);
            setAuthMode('authenticated');
            return;
          }
        }
      } catch { /* ignore */ }

      setAuthMode('gate');
    }

    checkSession();
  }, [token]);

  const fetchCalendar = useCallback(() => {
    if (!token) return;
    if (!viewer?.authToken && viewer?.type === 'guest' && !viewer.email) return;
    setFetchLoading(true);
    setError(null);
    const params = new URLSearchParams({ type: calendarType });
    if (viewMonth) params.set('month', viewMonth);
    if (viewer?.type === 'guest' && viewer.email) params.set('guest_email', viewer.email);
    fetch(`/api/calendar-links/${token}?${params.toString()}`, {
      headers: viewer?.authToken ? { Authorization: `Bearer ${viewer.authToken}` } : {},
    })
      .then(r => r.json())
      .then(json => {
        if (!json.client) throw new Error(json.error || 'Calendario no encontrado');
        setData(json);
        if (!viewMonth) {
          if (json.month) {
            setViewMonth(json.month);
          } else if (json.ideas.length > 0) {
            setViewMonth(json.ideas[0].publish_date.substring(0, 7));
          } else {
            const now = new Date();
            setViewMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
          }
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setFetchLoading(false));
  }, [token, viewMonth, calendarType, viewer]);

  useEffect(() => {
    if (authMode === 'authenticated' && viewer) fetchCalendar();
  }, [authMode, viewer, fetchCalendar]);

  useEffect(() => {
    if (!initialIdeaId || !data?.ideas.length || selectedIdea?.id === initialIdeaId) return;
    const idea = data.ideas.find(item => item.id === initialIdeaId);
    if (idea) setSelectedIdea(idea);
  }, [initialIdeaId, data?.ideas, selectedIdea?.id]);

  const handleViewerEnter = (v: Viewer) => {
    setViewer(v);
    // Only persist guest sessions; authenticated users re-detect via session on next load
    if (v.type === 'guest') {
      localStorage.setItem(getStorageKey(token!, calendarType), JSON.stringify({ type: 'guest', name: v.name, email: v.email, color: v.color }));
    }
    setAuthMode('authenticated');
  };

  const handleLogout = async () => {
    try {
      const { getSupabase } = await import('@/lib/supabase');
      await getSupabase().auth.signOut();
    } catch { /* ignore */ }
    localStorage.removeItem(getStorageKey(token!, calendarType));
    setViewer(null);
    setData(null);
    setError(null);
    setViewMonth('');
    setAuthMode('gate');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const idea = (event.active.data.current as { idea?: SocialIdea })?.idea;
    if (idea) setActiveIdea(idea);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveIdea(null);
    const idea = (event.active.data.current as { idea?: SocialIdea })?.idea;
    const newDate = event.over?.id as string | undefined;
    if (!idea || !newDate || idea.publish_date === newDate || !viewer || !token) return;
    await fetch(`/api/calendar-links/${token}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(viewer.authToken ? { Authorization: `Bearer ${viewer.authToken}` } : {}) },
      body: JSON.stringify({ idea_id: idea.id, action_type: 'date_move', publish_date: newDate, calendar_type: calendarType, guest_name: viewer.name, content: `${viewer.name} movió el contenido al ${newDate}` }),
    });
    fetchCalendar();
  };

  const handleCreateContentIdea = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!viewer || !token) return;
    if (!ideaTitle.trim()) { setIdeaError('Ingresá un título'); return; }
    setIdeaSending(true);
    setIdeaError('');
    try {
      const res = await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(viewer.authToken ? { Authorization: `Bearer ${viewer.authToken}` } : {}),
        },
        body: JSON.stringify({
          action_type: 'create_idea',
          calendar_type: calendarType,
          title: ideaTitle,
          post_type: ideaType,
          description: ideaDescription,
          links: ideaLinks.split(/[\n,;]/).map(link => link.trim()).filter(Boolean),
          publish_date: newIdeaDate || (viewMonth ? `${viewMonth}-01` : undefined),
          guest_name: viewer.name,
          content: `Idea sugerida por ${viewer.name}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setIdeaError(json.error || 'No se pudo crear la idea'); return; }
      setIdeaTitle('');
      setIdeaType('sugerencia');
      setIdeaDescription('');
      setIdeaLinks('');
      setNewIdeaDate(null);
      fetchCalendar();
    } catch {
      setIdeaError('No se pudo crear la idea');
    } finally {
      setIdeaSending(false);
    }
  };

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Loading initial auth check
  if (authMode === 'loading' || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show gate (need to fetch client name for the gate)
  if (authMode === 'gate') {
    // We need the client name for the gate header. Fetch it lazily.
    return <GateWithClientFetch token={token} calendarType={calendarType} onEnter={handleViewerEnter} />;
  }

  if (!data && fetchLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-6 text-center">
        <p>{error || 'Calendario no encontrado'}</p>
      </div>
    );
  }

  const monthLabel = viewMonth ? `${monthNames[parseInt(viewMonth.split('-')[1]) - 1]} ${viewMonth.split('-')[0]}` : '';
  const isAds = calendarType === 'ads';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e]">
      <div className="w-full p-3 md:p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {data.client.logo_url ? (
              <img src={data.client.logo_url} alt={data.client.name} className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{data.client.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {isAds && <ShoppingBag className="h-4 w-4 text-violet-500" />}
                <h1 className="text-xl md:text-2xl font-bold text-gradient-tech">
                  {isAds ? 'Piezas para ADS' : 'Calendario de Redes'} · {data.client.name}
                </h1>
              </div>
              {viewer && (
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] font-bold" style={{ backgroundColor: viewer.color + '30', color: viewer.color }}>
                      {viewer.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-muted-foreground">
                    {viewer.type === 'user' ? `Conectado como ${viewer.name}` : `Hola, ${viewer.name} 👋`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-xl border bg-background/60 px-3 py-2 text-sm font-semibold">{monthLabel}</span>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-muted-foreground h-8" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Salir
            </Button>
          </div>
        </div>

        {/* Ecommerce legend */}
        {isAds && data.ecommerce_dates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.ecommerce_dates.map(ed => (
              <div key={ed.id}
                style={{ backgroundColor: ed.color + '18', borderColor: ed.color + '60', color: ed.color }}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold">
                <ShoppingBag className="h-3 w-3" />
                <span>{ed.name}</span>
                <span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span>
              </div>
            ))}
          </div>
        )}

        {/* Post type legend */}
        <div className="flex items-center gap-4 text-xs mb-4 flex-wrap">
          {Object.entries(POST_TYPE_CONFIG).map(([, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={cfg.label} className={cn('flex items-center gap-1.5 font-medium', cfg.colorClass)}>
                <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />
                <Icon className="h-3.5 w-3.5" /> {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Calendar */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="p-2 md:p-4">
            {viewMonth && (
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <CalendarGrid monthStr={viewMonth} ideas={data.ideas} ecommerceDates={data.ecommerce_dates} onIdeaClick={setSelectedIdea} onAddClick={setNewIdeaDate} />
                <DragOverlay>{activeIdea ? <PublicIdeaPill idea={activeIdea} onClick={() => {}} /> : null}</DragOverlay>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Status legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-[11px]">
          {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
            <span key={cfg.label} className="flex items-center gap-1.5 text-muted-foreground">
              <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />{cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* Idea modal */}
      {selectedIdea && viewer && (
        <IdeaModal
          idea={selectedIdea}
          attachments={data.attachments_by_idea[selectedIdea.id] || []}
          comments={data.comments_by_idea[selectedIdea.id] || []}
          viewer={viewer}
          calendarType={calendarType}
          token={token}
          onClose={() => setSelectedIdea(null)}
          onCommentAdded={fetchCalendar}
        />
      )}

      {newIdeaDate && viewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setNewIdeaDate(null)}>
          <div className="w-full max-w-lg rounded-xl bg-background p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Nueva idea</h2>
                <p className="text-xs text-muted-foreground">Fecha: {newIdeaDate}</p>
              </div>
              <button onClick={() => setNewIdeaDate(null)} className="text-muted-foreground hover:text-foreground">×</button>
            </div>
            <form onSubmit={handleCreateContentIdea} className="space-y-3">
              <Input value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} placeholder="Título de sugerencia" className="h-10 rounded-xl" autoFocus />
              <select value={ideaType} onChange={e => setIdeaType(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm">
                <option value="sugerencia">Sugerencia</option>
                <option value="carrusel">Carrusel</option>
                <option value="reel">Reel</option>
                <option value="historia">Historia</option>
              </select>
              <textarea value={ideaDescription} onChange={e => setIdeaDescription(e.target.value)} placeholder="Descripción de la idea" className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <textarea value={ideaLinks} onChange={e => setIdeaLinks(e.target.value)} placeholder="Links de referencia, uno por línea" className="min-h-16 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              {ideaError && <p className="text-xs text-destructive">{ideaError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setNewIdeaDate(null)}>Cancelar</Button>
                <Button type="submit" variant="cta" disabled={ideaSending}>
                  {ideaSending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />} Crear idea
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Fetches client data before showing the gate (needed for the gate header)
function GateWithClientFetch({ token, calendarType, onEnter }: {
  token: string;
  calendarType: 'social' | 'ads';
  onEnter: (v: Viewer) => void;
}) {
  const [client, setClient] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    fetch(`/api/calendar-links/${token}?type=${calendarType}&meta=1`)
      .then(r => r.json())
      .then(json => {
        if (json.client) setClient(json.client);
        else setFetchError(json.error || 'Calendario no encontrado');
      })
      .catch(() => setFetchError('Error al cargar'));
  }, [token, calendarType]);

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-6 text-center">
        <p>{fetchError}</p>
      </div>
    );
  }
  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <AuthGate token={token} client={client} calendarType={calendarType} onEnter={onEnter} />;
}
