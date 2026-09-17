'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, User, Send, MessageCircle, Loader2, ShoppingBag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SocialIdea, IdeaStatus, EcommerceDate, SocialComment } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

interface CalendarData {
  client: { id: string; name: string; logo_url: string | null };
  ideas: SocialIdea[];
  attachments_by_idea: Record<string, { url: string; name: string; type: string }[]>;
  comments_by_idea: Record<string, SocialComment[]>;
  ecommerce_dates: EcommerceDate[];
  calendar_type: 'social' | 'ads';
}

interface GuestConfig {
  guest_name: string;
  guest_color: string;
}

const GUEST_COLORS = ['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a3'];

function getStorageKey(token: string, type: string) {
  return `calendar_guest_${token}_${type}`;
}

// ─── Who Are You Gate ─────────────────────────────────────────────────────────

function WhoAreYouGate({ client, calendarType, onEnter }: {
  client: { name: string; logo_url: string | null };
  calendarType: 'social' | 'ads';
  onEnter: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(GUEST_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Ingresá tu nombre'); return; }
    setError(null);
    onEnter(name.trim(), color);
  };

  const calLabel = calendarType === 'ads' ? 'Piezas para ADS' : 'Calendario de Redes';

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
          <p className="text-sm text-muted-foreground mt-1">Ingresá tu nombre para comentar y participar</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">¿Quién sos?</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="h-11 rounded-xl" autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GUEST_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('h-8 w-8 rounded-lg border-2 transition-all', color === c ? 'border-foreground scale-110' : 'border-gray-300 dark:border-gray-600')}
                  style={{ backgroundColor: c }} />
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

// ─── Ecommerce bands ─────────────────────────────────────────────────────────

function EcommerceBands({ date, ecommerceDates }: { date: string; ecommerceDates: EcommerceDate[] }) {
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-col gap-px mb-1">
      {active.map(ed => (
        <div key={ed.id} style={{ backgroundColor: ed.color + '22', borderLeft: `2px solid ${ed.color}`, color: ed.color }}
          className="text-[8px] font-bold px-1 py-px rounded-r-sm truncate leading-tight">
          {ed.start_date === date ? ed.name : ' '}
        </div>
      ))}
    </div>
  );
}

// ─── Calendar day ─────────────────────────────────────────────────────────────

function CalendarDay({ dateStr, day, ideas, isToday, ecommerceDates, onIdeaClick }: {
  dateStr: string; day: number; ideas: SocialIdea[]; isToday: boolean;
  ecommerceDates: EcommerceDate[]; onIdeaClick: (idea: SocialIdea) => void;
}) {
  return (
    <div className={cn('min-h-[80px] rounded-lg border p-1.5 bg-card/50', isToday && 'border-primary/50 bg-primary/5')}>
      <EcommerceBands date={dateStr} ecommerceDates={ecommerceDates} />
      <span className={cn('text-xs font-medium block mb-1 pl-0.5', isToday ? 'text-primary font-bold' : 'text-muted-foreground/60')}>{day}</span>
      <div className="space-y-1">
        {ideas.map((idea) => {
          const ptConfig = POST_TYPE_CONFIG[idea.post_type];
          const PtIcon = ptConfig.icon;
          const isPublished = idea.status === 'posteado';
          return (
            <div key={idea.id} onClick={() => onIdeaClick(idea)}
              className={cn('flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-medium cursor-pointer transition-all hover:scale-[1.02]',
                isPublished ? 'bg-green-500/15 border-green-400/40 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass])}>
              <PtIcon className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{idea.eje_contenido || idea.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar grid ────────────────────────────────────────────────────────────

function CalendarGrid({ monthStr, ideas, ecommerceDates, onIdeaClick }: {
  monthStr: string; ideas: SocialIdea[]; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void;
}) {
  const [y, m] = monthStr.split('-').map(Number);
  const today = new Date();
  const monthStart = startOfMonth(new Date(y, m - 1, 1));
  const monthEnd = endOfMonth(new Date(y, m - 1, 1));
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDay = monthStart.getDay();

  const ideasByDate = new Map<string, SocialIdea[]>();
  const monthIdeas = ideas.filter((i) => i.publish_date.substring(0, 7) === monthStr);
  for (const idea of monthIdeas) {
    const key = idea.publish_date;
    if (!ideasByDate.has(key)) ideasByDate.set(key, []);
    ideasByDate.get(key)!.push(idea);
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5">
        {dayNames.map((n) => (
          <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-2">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayIdeas = ideasByDate.get(dateStr) || [];
          const isToday = today.getFullYear() === y && today.getMonth() === m - 1 && today.getDate() === day.getDate();
          return (
            <CalendarDay key={dateStr} dateStr={dateStr} day={day.getDate()} ideas={dayIdeas}
              isToday={isToday} ecommerceDates={ecommerceDates} onIdeaClick={onIdeaClick} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Idea modal ───────────────────────────────────────────────────────────────

function IdeaModal({ idea, attachments, comments, guestConfig, calendarType, token, onClose, onStatusChange, onCommentAdded }: {
  idea: SocialIdea;
  attachments: { url: string; name: string; type: string }[];
  comments: SocialComment[];
  guestConfig: GuestConfig;
  calendarType: 'social' | 'ads';
  token: string;
  onClose: () => void;
  onStatusChange: (status: IdeaStatus) => void;
  onCommentAdded: () => void;
}) {
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const stConfig = STATUS_CONFIG[idea.status];

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
          calendar_type: calendarType,
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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Badge variant="outline" className={cn('text-[10px]', ptConfig.bgColorClass, ptConfig.colorClass)}>{ptConfig.label}</Badge>
            <Badge variant="outline" className={cn('text-[10px]', stConfig.colorClass)}>{stConfig.label}</Badge>
          </div>
          <h2 className="text-lg font-bold">{idea.eje_contenido || idea.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {idea.copy_text && (
            <div><h3 className="text-xs font-semibold text-muted-foreground mb-1">Copy</h3>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{idea.copy_text}</p></div>
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
                    className="inline-flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1 text-xs text-foreground/80 hover:bg-muted/50 transition-colors">
                    <span>🔗</span>{att.name || 'Link'}
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
                        <AvatarFallback className="text-[10px] font-bold"
                          style={{ backgroundColor: guestConfig.guest_color + '20', color: guestConfig.guest_color }}>
                          {(comment.guest_name || comment.user?.full_name || '?')?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{comment.guest_name || comment.user?.full_name || 'Invitado'}</span>
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(comment.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed pl-8">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs font-bold"
                style={{ backgroundColor: guestConfig.guest_color + '20', color: guestConfig.guest_color }}>
                {guestConfig.guest_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <Input value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribí un comentario..." className="flex-1 h-9 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }} />
            <Button size="sm" onClick={handleAddComment} disabled={sending || !newComment.trim()} className="h-9 w-9 p-0">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarLanding({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [calendarType, setCalendarType] = useState<'social' | 'ads'>('social');
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestConfig, setGuestConfig] = useState<GuestConfig | null>(null);
  const [viewMonth, setViewMonth] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const type = new URLSearchParams(window.location.search).get('type') === 'ads' ? 'ads' : 'social';
    setCalendarType(type);
    const stored = localStorage.getItem(getStorageKey(token, type));
    if (stored) {
      try {
        const guest = JSON.parse(stored) as GuestConfig;
        if (guest.guest_name?.trim()) { setGuestConfig(guest); }
      } catch { /* */ }
    }
  }, [token]);

  const fetchCalendar = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`/api/calendar-links/${token}?month=${viewMonth}&type=${calendarType}`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.client) throw new Error(json.error || 'Calendario no encontrado');
        setData(json);
        if (!viewMonth) {
          if (json.ideas.length > 0) {
            setViewMonth(json.ideas[0].publish_date.substring(0, 7));
          } else {
            const now = new Date();
            setViewMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, viewMonth, calendarType]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const handleGuestEnter = (name: string, color: string) => {
    const config: GuestConfig = { guest_name: name, guest_color: color };
    setGuestConfig(config);
    localStorage.setItem(getStorageKey(token!, calendarType), JSON.stringify(config));
  };

  const handlePrevMonth = () => {
    if (!viewMonth) return;
    const [y, m] = viewMonth.split('-').map(Number);
    setViewMonth(m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (!viewMonth) return;
    const [y, m] = viewMonth.split('-').map(Number);
    setViewMonth(m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`);
  };

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if (!token || (!data && loading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-destructive p-6 text-center">
        <p>{error || 'Calendario no encontrado'}</p>
      </div>
    );
  }

  if (!guestConfig) {
    return <WhoAreYouGate client={data.client} calendarType={calendarType} onEnter={handleGuestEnter} />;
  }

  const monthLabel = viewMonth ? `${monthNames[parseInt(viewMonth.split('-')[1]) - 1]} ${viewMonth.split('-')[0]}` : '';
  const isAds = calendarType === 'ads';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ff] via-[#e0f2fe] to-[#f5f0ff] dark:from-[#0a0a1a] dark:via-[#0f0a2e] dark:to-[#1a0a2e]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
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
              <p className="text-sm text-muted-foreground">Hola, {guestConfig.guest_name} 👋</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Ecommerce dates legend (ADS only) */}
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
          <CardContent className="p-4">
            {viewMonth && (
              <CalendarGrid
                monthStr={viewMonth}
                ideas={data.ideas}
                ecommerceDates={data.ecommerce_dates}
                onIdeaClick={setSelectedIdea}
              />
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
      {selectedIdea && (
        <IdeaModal
          idea={selectedIdea}
          attachments={data.attachments_by_idea[selectedIdea.id] || []}
          comments={data.comments_by_idea[selectedIdea.id] || []}
          guestConfig={guestConfig}
          calendarType={calendarType}
          token={token}
          onClose={() => setSelectedIdea(null)}
          onStatusChange={(status) => setSelectedIdea({ ...selectedIdea, status })}
          onCommentAdded={fetchCalendar}
        />
      )}
    </div>
  );
}
