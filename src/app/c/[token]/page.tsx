'use client';

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { Calendar, ChevronLeft, ChevronRight, User, Send, MessageCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SocialIdea, IdeaStatus, PostType, SocialComment } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarData {
  client: { id: string; name: string; logo_url: string | null };
  ideas: SocialIdea[];
  attachments_by_idea: Record<string, { url: string; name: string; type: string }[]>;
  comments_by_idea: Record<string, SocialComment[]>;
  is_authenticated: boolean;
}

interface GuestConfig {
  guest_name: string | null;
  guest_color: string;
}

const GUEST_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a3'];

function getStorageKey(token: string) {
  return `calendar_guest_${token}`;
}

function WhoAreYouGate({
  client,
  onEnter,
}: {
  client: { name: string; logo_url: string | null };
  onEnter: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GUEST_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Ingresá tu nombre');
      return;
    }
    setError(null);
    onEnter(name.trim(), color);
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
          <h1 className="text-2xl font-bold">Bienvenido al calendario de redes de {client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresá tu nombre para comentar y participar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">¿Quién sos?</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="h-11 rounded-xl"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GUEST_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-lg border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-gray-300 dark:border-gray-600',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" variant="cta" size="cta" className="w-full gap-2">
            <User className="h-4 w-4" /> Entrar al calendario
          </Button>
        </form>
      </div>
    </div>
  );
}

function CalendarGrid({
  monthStr,
  ideas,
  onIdeaClick,
  onStatusChange,
  onCommentAdded,
  guestConfig,
  token,
}: {
  monthStr: string;
  ideas: SocialIdea[];
  onIdeaClick: (idea: SocialIdea) => void;
  onStatusChange: (idea: SocialIdea, status: IdeaStatus) => void;
  onCommentAdded: (ideaId: string) => void;
  guestConfig: GuestConfig;
  token: string;
}) {
  const [y, m] = monthStr.split('-').map(Number);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === y && today.getMonth() === m;

  const monthStart = startOfMonth(new Date(y, m, 1));
  const monthEnd = endOfMonth(new Date(y, m, 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay = monthStart.getDay();

  const ideasByDate = new Map<string, SocialIdea[]>();
  for (const idea of ideas) {
    const key = idea.publish_date.substring(0, 7); // YYYY-MM
    // We'll filter by current month display
  }

  const monthIdeas = ideas.filter((i) => i.publish_date.substring(0, 7) === monthStr);
  for (const idea of monthIdeas) {
    const dateKey = idea.publish_date;
    if (!ideasByDate.has(dateKey)) ideasByDate.set(dateKey, []);
    ideasByDate.get(dateKey)!.push(idea);
  }

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5">
        {dayNames.map((n) => (
          <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-2">{n}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {days.map((day, idx) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayIdeas = ideasByDate.get(dateStr) || [];
          const isToday = isCurrentMonth && today.getDate() === day.getDate();

          return (
            <CalendarDay
              key={dateStr}
              dateStr={dateStr}
              day={day.getDate()}
              ideas={dayIdeas}
              isToday={isToday}
              onIdeaClick={onIdeaClick}
              onStatusChange={onStatusChange}
              onCommentAdded={onCommentAdded}
              guestConfig={guestConfig}
              token={token}
            />
          );
        })}
      </div>
    </div>
  );
}

function CalendarDay({
  dateStr,
  day,
  ideas,
  isToday,
  onIdeaClick,
  onStatusChange,
  onCommentAdded,
  guestConfig,
  token,
}: {
  dateStr: string;
  day: number;
  ideas: SocialIdea[];
  isToday: boolean;
  onIdeaClick: (idea: SocialIdea) => void;
  onStatusChange: (idea: SocialIdea, status: IdeaStatus) => void;
  onCommentAdded: (ideaId: string) => void;
  guestConfig: GuestConfig;
  token: string;
}) {
  const ptConfig = (idea: SocialIdea) => POST_TYPE_CONFIG[idea.post_type];

  return (
    <div
      className={cn(
        'min-h-[80px] rounded-lg border p-1.5 bg-card/50',
        isToday && 'border-primary/50 bg-primary/5',
      )}
    >
      <span className={cn('text-xs font-medium block mb-1 pl-0.5', isToday ? 'text-primary font-bold' : 'text-muted-foreground/60')}>
        {day}
      </span>
      <div className="space-y-1">
        {ideas.map((idea) => (
          <CalendarIdeaPill
            key={idea.id}
            idea={idea}
            onClick={() => onIdeaClick(idea)}
            onStatusChange={onStatusChange}
            guestConfig={guestConfig}
            token={token}
            onCommentAdded={onCommentAdded}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarIdeaPill({
  idea,
  onClick,
  onStatusChange,
  guestConfig,
  token,
  onCommentAdded,
}: {
  idea: SocialIdea;
  onClick: () => void;
  onStatusChange: (idea: SocialIdea, status: IdeaStatus) => void;
  guestConfig: GuestConfig;
  token: string;
  onCommentAdded: (ideaId: string) => void;
}) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const stConfig = STATUS_CONFIG[idea.status];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.02]',
        isPublished
          ? 'bg-green-500/15 border-green-400/40 text-green-600'
          : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass],
      )}
    >
      <PtIcon className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{idea.eje_contenido || idea.title}</span>
    </div>
  );
}

export default function CalendarLanding({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestConfig, setGuestConfig] = useState<GuestConfig | null>(null);
  const [viewMonth, setViewMonth] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setToken(p.token);
    });
  }, [params]);

  useEffect(() => {
    if (!token) return;

    const stored = localStorage.getItem(getStorageKey(token));
    if (stored) {
      try {
        const guest = JSON.parse(stored) as GuestConfig;
        if (guest.guest_name && guest.guest_name.trim()) {
          setGuestConfig(guest);
          return;
        }
      } catch {}
    }

    // Will be set by WhoAreYouGate
    setGuestConfig(null);
  }, [token]);

  const fetchCalendar = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`/api/calendar-links/${token}?month=${viewMonth}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.client) throw new Error('Calendario no encontrado');
        setData(json);
        if (!viewMonth && json.ideas.length > 0) {
          const firstDate = json.ideas[0].publish_date.substring(0, 7);
          setViewMonth(firstDate);
        } else if (!viewMonth) {
          const now = new Date();
          setViewMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, viewMonth]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleGuestEnter = (name: string, color: string) => {
    const config: GuestConfig = { guest_name: name, guest_color: color };
    setGuestConfig(config);
    localStorage.setItem(getStorageKey(token!), JSON.stringify(config));
  };

  const handlePrevMonth = () => {
    if (!viewMonth) return;
    const [y, m] = viewMonth.split('-').map(Number);
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    setViewMonth(prevMonth);
  };

  const handleNextMonth = () => {
    if (!viewMonth) return;
    const [y, m] = viewMonth.split('-').map(Number);
    const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    setViewMonth(nextMonth);
  };

  const handleStatusChange = async (idea: SocialIdea, status: IdeaStatus) => {
    try {
      await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea_id: idea.id,
          action_type: 'status_change',
          status,
          guest_name: guestConfig?.guest_name,
        }),
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ideas: prev.ideas.map((i) => (i.id === idea.id ? { ...i, status } : i)),
        };
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedIdea || !guestConfig?.guest_name) return;
    setSendingComment(true);
    try {
      await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea_id: selectedIdea.id,
          content: newComment.trim(),
          guest_name: guestConfig.guest_name,
          action_type: 'comment',
        }),
      });
      setNewComment('');
      fetchCalendar();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingComment(false);
    }
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  if (!token || !data && loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center text-destructive p-6 text-center">
          <p>{error}</p>
        </div>
      );
    }
    return null;
  }

  // Show guest gate if not identified
  if (!guestConfig) {
    return <WhoAreYouGate client={data.client} onEnter={handleGuestEnter} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e]">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {data.client.logo_url ? (
              <img src={data.client.logo_url} alt={data.client.name} className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{data.client.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gradient-tech">
                Bienvenido al calendario de redes de {data.client.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Hola, {guestConfig.guest_name} 👋
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {monthNames[parseInt(viewMonth.split('-')[1]) - 1]} {viewMonth.split('-')[0]}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-xl">
          <CardContent className="p-4">
            <CalendarGrid
              monthStr={viewMonth}
              ideas={data.ideas}
              onIdeaClick={setSelectedIdea}
              onStatusChange={handleStatusChange}
              onCommentAdded={() => fetchCalendar()}
              guestConfig={guestConfig}
              token={token}
            />
          </CardContent>
        </Card>

        {/* Idea detail modal */}
        {selectedIdea && (
          <IdeaModal
            idea={selectedIdea}
            attachments={data.attachments_by_idea[selectedIdea.id] || []}
            comments={data.comments_by_idea[selectedIdea.id] || []}
            guestConfig={guestConfig}
            onClose={() => setSelectedIdea(null)}
            onStatusChange={(status) => {
              handleStatusChange(selectedIdea, status);
              setSelectedIdea({ ...selectedIdea, status });
            }}
            onCommentAdded={fetchCalendar}
          />
        )}
      </div>
    </div>
  );
}

function IdeaModal({
  idea,
  attachments,
  comments,
  guestConfig,
  onClose,
  onStatusChange,
  onCommentAdded,
}: {
  idea: SocialIdea;
  attachments: { url: string; name: string; type: string }[];
  comments: SocialComment[];
  guestConfig: GuestConfig;
  onClose: () => void;
  onStatusChange: (status: IdeaStatus) => void;
  onCommentAdded: () => void;
}) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [token] = useState(() => window.location.pathname.split('/').pop() || '');

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea_id: idea.id,
          content: newComment.trim(),
          guest_name: guestConfig.guest_name,
          action_type: 'comment',
        }),
      });
      setNewComment('');
      onCommentAdded();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const stConfig = STATUS_CONFIG[idea.status];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Badge variant="outline" className={cn('text-[10px]', ptConfig.bgColorClass, ptConfig.colorClass)}>
              {ptConfig.label}
            </Badge>
            <Badge variant="outline" className={cn('text-[10px]', stConfig.colorClass)}>
              {stConfig.label}
            </Badge>
          </div>
          <h2 className="text-lg font-bold">{idea.eje_contenido || idea.title}</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {idea.copy_text && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">Copy</h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{idea.copy_text}</p>
            </div>
          )}
          {idea.brief && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">Brief</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.brief}</p>
            </div>
          )}
          {idea.description && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-1">Guión / Descripción</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{idea.description}</p>
            </div>
          )}
          {!idea.copy_text && !idea.brief && !idea.description && (
            <p className="text-sm text-muted-foreground italic">Sin contenido</p>
          )}

          {attachments.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-2">Adjuntos</h3>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1 text-xs text-foreground/80 hover:bg-muted/50 transition-colors"
                  >
                    <span>🔗</span>
                    {att.name || 'Link'}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> Comentarios ({comments.length})
            </h3>
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-xs text-muted-foreground/60">Sé el primero en comentar</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-[10px] font-bold"
                          style={{
                            backgroundColor: guestConfig.guest_color + '20',
                            color: guestConfig.guest_color,
                          }}
                        >
                          {(comment.guest_name || comment.user?.full_name || '?')?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {comment.guest_name || comment.user?.full_name || 'Invitado'}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(comment.created_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed pl-8">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Comment input */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback
                className="text-xs font-bold"
                style={{
                  backgroundColor: guestConfig.guest_color + '20',
                  color: guestConfig.guest_color,
                }}
              >
                {guestConfig.guest_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribí un comentario..."
              className="flex-1 h-9 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={sending || !newComment.trim()}
              className="h-9 w-9 p-0"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

