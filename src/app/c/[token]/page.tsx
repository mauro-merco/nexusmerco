'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, MessageCircle, Loader2, RefreshCw, ShoppingBag, LogIn, User, Eye, EyeOff, LogOut, Plus, Copy, Sun, Moon, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { CalendarComments } from '@/components/calendar-comments';
import { CalendarIdeaComments } from '@/components/calendar-idea-comments';
import { CalendarRecentComments } from '@/components/calendar-recent-comments';
import { CalendarFolders, DayOverflow } from '@/components/calendar-parts';
import { CalendarAgenda, useIsMobile } from '@/components/calendar-agenda';
import { CalendarSearch } from '@/components/calendar-search';
import { CalendarMonthFolder } from '@/components/calendar-month-folder';
import { CalendarGeneralFolders } from '@/components/calendar-general-folders';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { MarkdownBody } from '@/lib/markdown';
import type { SocialIdea, IdeaStatus, EcommerceDate, SocialComment, User as NexusUser } from '@/lib/types';
import { CalendarPillBody, calendarPillTitle } from '@/components/calendar-pill-body';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { TASK_ROLE_CONFIG, TASK_ROLES } from '@/lib/task-config';
import { format } from 'date-fns';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MinimizedDock } from '@/components/minimized-dock';

interface CalendarData {
  client: { id: string; name: string; logo_url: string | null };
  ideas: SocialIdea[];
  attachments_by_idea: Record<string, { url: string; name: string; type: string }[]>;
  comments_by_idea: Record<string, SocialComment[]>;
  ecommerce_dates: EcommerceDate[];
  calendar_type: 'social' | 'ads';
  month?: string | null;
  users: NexusUser[];
}

type AuthMode = 'loading' | 'authenticated' | 'gate';

interface Viewer {
  type: 'user' | 'guest';
  name: string;
  color: string;
  email?: string;
  authToken?: string;
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [guestError, setGuestError] = useState('');
  const [guestLoading, setGuestLoading] = useState(false);
  const { theme, setTheme } = useTheme();

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 h-9 w-9 rounded-xl hover:bg-accent"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <div className="w-full max-w-md space-y-6">
        {client.logo_url ? (
          <img src={client.logo_url} alt={client.name} className="h-12 mx-auto object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-2xl bg-accent flex items-center justify-center mx-auto">
            <span className="text-xl font-bold text-primary">{client.name.charAt(0)}</span>
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold">{calLabel} · {client.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Accedé para ver y comentar el calendario</p>
        </div>

        <div className="flex rounded-xl bg-muted/40 p-1">
          <button type="button" onClick={() => { setTab('login'); setLoginError(''); setGuestError(''); }}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'login' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <LogIn className="h-4 w-4" /> Como Merco
          </button>
          <button type="button" onClick={() => { setTab('guest'); setLoginError(''); setGuestError(''); }}
            className={cn('flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'guest' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <User className="h-4 w-4" /> Como invitado
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" type="email" className="h-11 rounded-xl bg-muted/35 border-0" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Contraseña</label>
              <div className="relative">
                <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  type={showPassword ? 'text' : 'password'} className="h-11 rounded-xl bg-muted/35 border-0 pr-10" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {loginError && <p className="text-xs text-destructive">{loginError}</p>}
            <Button type="submit" variant="default" className="w-full gap-2 h-11 rounded-xl" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Ingresar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleGuest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium">Email</label>
              <Input value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="tu@email.com" type="email" className="h-11 rounded-xl bg-muted/35 border-0" autoFocus />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Contraseña</label>
              <div className="relative">
                <Input value={guestPassword} onChange={e => setGuestPassword(e.target.value)} placeholder="••••••••"
                  type={showGuestPassword ? 'text' : 'password'} className="h-11 rounded-xl bg-muted/35 border-0 pr-10" />
                <button type="button" onClick={() => setShowGuestPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showGuestPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {guestError && <p className="text-xs text-destructive">{guestError}</p>}
            </div>
            <Button type="submit" variant="default" className="w-full gap-2 h-11 rounded-xl" disabled={guestLoading}>
              {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />} Entrar al calendario
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Calendar day cell (flat, dot pills) ──────────────────────────────────────

function PublicIdeaDot({ idea, onClick, isExtended }: { idea: SocialIdea; onClick: () => void; isExtended?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id, data: { idea } });
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const isPublished = idea.status === 'posteado';
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={calendarPillTitle(idea, idea.eje_contenido || idea.title)}
      className={cn(
        'tm-lift tm-press flex w-full flex-col items-stretch rounded-lg px-2 py-1.5 text-[11px] font-medium transition-opacity text-left',
        idea.status === 'espera_cliente' ? 'border border-red-500/60 bg-red-500/20 text-red-700 dark:text-red-200 shadow-sm shadow-red-500/20' : isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass],
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <CalendarPillBody idea={idea} label={idea.eje_contenido || idea.title} />
    </button>
  );
}

function CalendarDay({ dateStr, day, ideas, isToday, isCurrentMonth, ecommerceDates, onIdeaClick, onAddClick }: {
  dateStr: string; day: number; ideas: SocialIdea[]; isToday: boolean; isCurrentMonth: boolean;
  ecommerceDates: EcommerceDate[]; onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr });
  const [y, m] = dateStr.split('-').map(Number);
  const active = ecommerceDates.filter(ed => dateStr >= ed.start_date && dateStr <= ed.end_date);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' });

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddClick(dateStr)}
      style={{ minHeight: Math.max(132, 90 + ideas.length * 22), ...(active.length > 0 ? { backgroundColor: `${active[0].color}1f` } : isCurrentMonth ? {} : { backgroundColor: 'rgba(148,163,184,0.10)' }) }}
      className={cn(
        'tm-fade min-h-[132px] rounded-2xl p-2 transition-colors cursor-pointer flex flex-col group',
        !isCurrentMonth && 'grayscale opacity-70',
        isOver ? 'bg-primary/15' : isToday ? 'bg-primary/8' : isCurrentMonth ? 'bg-muted/25 hover:bg-muted/45' : 'bg-muted/12 hover:bg-muted/25',
      )}
    >
      {active.length > 0 && (
        <div className="flex flex-col gap-1 mb-1.5">
          {active.map(ed => (
            <div
              key={ed.id}
              style={{ backgroundColor: `${ed.color}38`, color: ed.color, boxShadow: `inset 0 0 0 1.5px ${ed.color}` }}
              className="truncate rounded-lg px-1.5 py-1 text-center text-[11px] font-black uppercase leading-tight tracking-wide"
            >
              {ed.name}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-muted-foreground/70' : 'text-muted-foreground/60')}>
            {day}
          </span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', isCurrentMonth ? 'bg-muted/60 text-muted-foreground' : 'bg-muted/40 text-muted-foreground/70')}>de {monthLabel}</span>
        </div>
        <span role="button" onClick={(e) => { e.stopPropagation(); onAddClick(dateStr); }} className="h-5 w-5 rounded-md flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/15 transition-opacity">
          <Plus className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="space-y-1 flex-1">
        {ideas.map(idea => <PublicIdeaDot key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} isExtended={!isCurrentMonth} />)}
      </div>
    </div>
  );
}

function CalendarGrid({ monthStr, ideas, ecommerceDates, onIdeaClick, onAddClick }: {
  monthStr: string; ideas: SocialIdea[]; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const [y, m] = monthStr.split('-').map(Number);
  const today = new Date();
  const viewDate = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDay = (viewDate.getDay() + 6) % 7; // lunes=0
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const cells: { dateStr: string; inMonth: boolean }[] = [];
  let leading = firstDay;
  while (leading < 10) leading += 7;
  for (let i = 0; i < leading; i++) {
    const d = new Date(y, m - 1, -leading + i + 1);
    cells.push({ dateStr: format(d, 'yyyy-MM-dd'), inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ dateStr: `${monthStr}-${String(day).padStart(2, '0')}`, inMonth: true });
  }
  let trailing = 0;
  while (true) {
    const remainder = cells.length % 7;
    if (remainder === 0 && trailing >= 10) break;
    const last = new Date(cells[cells.length - 1].dateStr + 'T12:00:00');
    last.setDate(last.getDate() + 1);
    cells.push({ dateStr: format(last, 'yyyy-MM-dd'), inMonth: false });
    trailing += 1;
    if (trailing > 42) break;
  }

  const ideasByDate = new Map<string, SocialIdea[]>();
  for (const idea of ideas) {
    const key = idea.publish_date;
    if (!ideasByDate.has(key)) ideasByDate.set(key, []);
    ideasByDate.get(key)!.push(idea);
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-1.5">
        {dayNames.map(n => <div key={n} className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide py-1">{n}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map(cell => {
          const isToday = today.getFullYear() === Number(cell.dateStr.split('-')[0]) && today.getMonth() === Number(cell.dateStr.split('-')[1]) - 1 && today.getDate() === Number(cell.dateStr.split('-')[2]);
          return (
            <CalendarDay key={cell.dateStr} dateStr={cell.dateStr} day={Number(cell.dateStr.split('-')[2])}
              ideas={ideasByDate.get(cell.dateStr) || []} isToday={isToday} isCurrentMonth={cell.inMonth}
              ecommerceDates={ecommerceDates} onIdeaClick={onIdeaClick} onAddClick={onAddClick} />
          );
        })}
      </div>
    </div>
  );
}

// ─── Idea modal ───────────────────────────────────────────────────────────────

// ─── Agenda / list view ───────────────────────────────────────────────────────

function AgendaList({ ideas, onIdeaClick }: { ideas: SocialIdea[]; onIdeaClick: (idea: SocialIdea) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, SocialIdea[]>();
    const sorted = [...ideas].sort((a, b) => a.publish_date.localeCompare(b.publish_date));
    for (const idea of sorted) {
      const list = map.get(idea.publish_date) || [];
      list.push(idea);
      map.set(idea.publish_date, list);
    }
    return [...map.entries()];
  }, [ideas]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <ListIcon className="h-8 w-8 opacity-40" />
        <p className="text-sm">No hay contenido planificado este mes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(([date, items]) => (
        <section key={date}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {format(new Date(`${date}T00:00:00`), 'EEEE d MMMM')}
          </h3>
          <ul className="mt-1.5 space-y-1.5">
            {items.map(idea => {
              const cfg = POST_TYPE_CONFIG[idea.post_type];
              const Icon = cfg?.icon;
              const statusCfg = STATUS_CONFIG[idea.status as keyof typeof STATUS_CONFIG];
              return (
                <li key={idea.id}>
                  <button
                    type="button"
                    onClick={() => onIdeaClick(idea)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-accent/40',
                      idea.status === 'posteado' && 'opacity-70',
                    )}
                  >
                    <span className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold shrink-0', cfg?.bgColorClass, cfg?.colorClass)}>
                      {Icon && <Icon className="h-3 w-3" />}
                      {cfg?.label || idea.post_type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{idea.title}</span>
                      {idea.description && (
                        <MarkdownBody text={idea.description} className="block line-clamp-2 text-xs text-muted-foreground" />
                      )}
                    </span>
                    {statusCfg && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dotColor)} />
                        {statusCfg.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
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
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const isMobile = useIsMobile();
  const effectiveView: 'month' | 'list' = isMobile ? 'list' : viewMode;
  const [search, setSearch] = useState('');
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [initialIdeaId, setInitialIdeaId] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { theme, setTheme } = useTheme();

  useEffect(() => { params.then(p => setToken(p.token)); }, [params]);

  useEffect(() => {
    if (!token) return;
    const resolvedToken = token;
    const type = new URLSearchParams(window.location.search).get('type') === 'ads' ? 'ads' : 'social';
    setInitialIdeaId(new URLSearchParams(window.location.search).get('idea'));
    setCalendarType(type);

    async function checkSession() {
      try {
        const { getSupabase } = await import('@/lib/supabase');
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data: userData } = await supabase.from('users').select('full_name').eq('id', session.user.id).single();
          const name = userData?.full_name || session.user.email || 'Usuario';
          setViewer({ type: 'user', name, color: GUEST_COLORS[0], authToken: session.access_token });
          setAuthMode('authenticated');
          return;
        }
      } catch { /* ignore */ }

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
    if (!viewMonth) {
      fetch(`/api/calendar-links/${token}?type=${calendarType}&meta=1`)
        .then(r => r.json())
        .then(json => {
          if (!json.client) throw new Error(json.error || 'Calendario no encontrado');
          setViewMonth(json.month || format(new Date(), 'yyyy-MM'));
        })
        .catch(e => setError(e.message))
        .finally(() => setFetchLoading(false));
      return;
    }
    const [y, m] = viewMonth.split('-').map(Number);
    const prev = `${y}-${String(m - 1 <= 0 ? 12 : m - 1).padStart(2,'0')}`.replace(/-(\d{2})$/, (s,p)=> m-1===0 ? `${y-1}-${p}` : `${y}-${p}`);
    const curMonth = viewMonth;
    const next = `${y}-${String(m + 1 >= 13 ? 1 : m + 1).padStart(2,'0')}`.replace(/-(\d{2})$/, (s,p)=> m+1===13 ? `${y+1}-${p}` : `${y}-${p}`);
    const months = [prev.replace(/(\d{4})-(\d{2})$/, (_,yy,mm)=> m===1?`${y-1}-${mm}`: m===12?`${y+1}-${mm}`:`${y}-${mm}`), curMonth, (m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`)];
    if (m===1) months[0]=`${y-1}-12`;
    if (m===12) months[0]=`${y}-11`; else if(m>1) months[0]=`${y}-${String(m-1).padStart(2,'0')}`;
    if (m===12) months[2]=`${y+1}-01`; else months[2]=`${y}-${String(m+1).padStart(2,'0')}`;
    Promise.all(months.map(mm => {
      const params = new URLSearchParams({ type: calendarType, month: mm });
      if (viewer?.type === 'guest' && viewer.email) params.set('guest_email', viewer.email);
      return fetch(`/api/calendar-links/${token}?${params.toString()}`, {
        headers: viewer?.authToken ? { Authorization: `Bearer ${viewer.authToken}` } : {},
      }).then(r=>r.json());
    }))
      .then(results => {
        const first = results.find(r=>r.client) || results[0];
        if (!first?.client) throw new Error(first?.error || 'Calendario no encontrado');
        const allIdeas: SocialIdea[] = [];
        const allDates: EcommerceDate[] = [];
        const seenI = new Set<string>();
        const seenD = new Set<string>();
        for (const r of results) {
          for (const idea of r.ideas||[]) { if(!seenI.has(idea.id)){ seenI.add(idea.id); allIdeas.push(idea);} }
          for (const ed of r.ecommerce_dates||[]) { if(!seenD.has(ed.id)){ seenD.add(ed.id); allDates.push(ed);} }
        }
        setData({ ...first, ideas: allIdeas, ecommerce_dates: allDates });
      })
      .catch(e => setError(e.message))
      .finally(() => setFetchLoading(false));
  }, [token, viewMonth, calendarType, viewer]);

  useEffect(() => { if (authMode === 'authenticated' && viewer) fetchCalendar(); }, [authMode, viewer, fetchCalendar]);

  useEffect(() => {
    if (!initialIdeaId || !data?.ideas.length || selectedIdea?.id === initialIdeaId) return;
    const idea = data.ideas.find(item => item.id === initialIdeaId);
    if (idea) setSelectedIdea(idea);
  }, [initialIdeaId, data?.ideas, selectedIdea?.id]);

  useEffect(() => {
    if (!selectedIdea || initialIdeaId === selectedIdea.id) return;
    const stillVisible = data?.ideas.some(idea => idea.id === selectedIdea.id);
    if (!stillVisible) setSelectedIdea(null);
  }, [data?.ideas, initialIdeaId, selectedIdea]);

  const handleViewerEnter = (v: Viewer) => {
    setViewer(v);
    if (v.type === 'guest') {
      localStorage.setItem(getStorageKey(token!, calendarType), JSON.stringify({ type: 'guest', name: v.name, email: v.email, color: v.color }));
    }
    setAuthMode('authenticated');
  };

  const handleLogout = async () => {
    try { const { getSupabase } = await import('@/lib/supabase'); await getSupabase().auth.signOut({ scope: 'local' }); } catch { /* ignore */ }
    localStorage.removeItem(getStorageKey(token!, calendarType));
    setViewer(null);
    setData(null);
    setError(null);
    setViewMonth('');
    setSelectedIdea(null);
    setInitialIdeaId(null);
    setAuthMode('gate');
  };

  const closeSelectedIdea = () => {
    setSelectedIdea(null);
    setInitialIdeaId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('idea')) { url.searchParams.delete('idea'); window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`); }
    }
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

  const handleAddNewIdea = useCallback(async (date: string) => {
    if (!viewer || !token || !data) return;
    // Create a minimal idea on the server first
    try {
      const res = await fetch(`/api/calendar-links/${token}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(viewer.authToken ? { Authorization: `Bearer ${viewer.authToken}` } : {}) },
        body: JSON.stringify({
          action_type: 'create_idea',
          calendar_type: calendarType,
          title: 'Nueva idea',
          post_type: 'sugerencia',
          description: '',
          links: [],
          publish_date: date,
          guest_name: viewer.name,
          content: `Idea creada por ${viewer.name}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'No se pudo crear la idea');
        return;
      }
      // Refresh calendar to get the new idea
      await fetchCalendar();
      // Find and open the newly created idea
      const newIdea = json.data?.idea;
      if (newIdea) {
        setSelectedIdea(newIdea);
      }
    } catch {
      alert('No se pudo crear la idea');
    }
  }, [viewer, token, data, calendarType, fetchCalendar]);

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  if (authMode === 'loading' || !token) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (authMode === 'gate') {
    return <GateWithClientFetch token={token} calendarType={calendarType} onEnter={handleViewerEnter} />;
  }

  if (!data && fetchLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-semibold">No pudimos abrir el calendario</h1>
          <p className="text-sm text-muted-foreground" role="alert">{error || 'Calendario no encontrado'}</p>
          <p className="text-sm text-muted-foreground">Podés volver a ingresar con una cuenta autorizada para este calendario.</p>
          <Button onClick={handleLogout} className="gap-2 rounded-xl">
            <LogIn className="h-4 w-4" /> Volver al login
          </Button>
        </div>
      </div>
    );
  }

  const monthLabel = viewMonth ? `${monthNames[parseInt(viewMonth.split('-')[1]) - 1]} ${viewMonth.split('-')[0]}` : '';
  const isAds = calendarType === 'ads';

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-[1800px] mx-auto px-2.5 py-4 sm:px-4 md:px-5">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {data.client.logo_url ? (
              <img src={data.client.logo_url} alt={data.client.name} className="h-10 object-contain" />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-accent flex items-center justify-center">
                <span className="text-xl font-bold text-primary">{data.client.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {isAds && <ShoppingBag className="h-4 w-4 text-violet-500" />}
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
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
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-8 rounded-lg" onClick={fetchCalendar} disabled={fetchLoading} aria-label={fetchLoading ? 'Actualizando calendario' : 'Actualizar calendario'} aria-busy={fetchLoading}>
              <RefreshCw aria-hidden="true" className={cn('h-3.5 w-3.5', fetchLoading && 'animate-spin')} /> Actualizar
            </Button>
            <div className="hidden md:flex items-center gap-1 bg-muted/40 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors', viewMode === 'month' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Mes
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors', viewMode === 'list' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <ListIcon className="h-3.5 w-3.5" /> Lista
              </button>
            </div>
            <span className="rounded-xl bg-muted/40 px-3 py-2 text-sm font-semibold">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-accent"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs h-8 rounded-lg" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" /> Salir
            </Button>
          </div>
        </div>

        {isAds && data.ecommerce_dates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {data.ecommerce_dates.map(ed => (
              <div key={ed.id} style={{ backgroundColor: ed.color + '18', color: ed.color }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                <ShoppingBag className="h-3 w-3" />
                <span>{ed.name}</span>
                <span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span>
              </div>
            ))}
          </div>
        )}

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

        <CalendarSearch
          className="mb-4"
          value={search}
          onChange={setSearch}
          ideas={data.ideas}
          onSelect={setSelectedIdea}
        />

        {viewMonth && <CalendarFolders><CalendarMonthFolder clientId={data.client.id} calendarType={data.calendar_type} month={viewMonth} /><CalendarGeneralFolders clientId={data.client.id} /></CalendarFolders>}


        {search.trim().length >= 2 ? null : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <Card className="border-0 ring-0 shadow-none rounded-3xl bg-card">
              <CardContent className="p-3 md:p-4">
                {viewMonth && effectiveView === 'month' && (
                  <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <CalendarGrid monthStr={viewMonth} ideas={data.ideas} ecommerceDates={data.ecommerce_dates} onIdeaClick={setSelectedIdea} onAddClick={handleAddNewIdea} />
                    <DragOverlay>{activeIdea ? <PublicIdeaDot idea={activeIdea} onClick={() => {}} /> : null}</DragOverlay>
                  </DndContext>
                )}
                {viewMonth && effectiveView === 'list' && (
                  <CalendarAgenda ideas={data.ideas.filter(i => i.publish_date.startsWith(viewMonth))} onIdeaClick={setSelectedIdea} emptyLabel="No hay contenido planificado este mes." />
                )}
              </CardContent>
            </Card>
            <CalendarRecentComments
              clientId={data.client.id}
              calendarType={calendarType}
              month={viewMonth}
              shareToken={token}
              guestEmail={viewer?.type === 'guest' ? viewer.email : undefined}
              viewerAuthToken={viewer?.authToken}
              ideas={data.ideas}
              onOpenIdea={id => {
                const idea = data.ideas.find(item => item.id === id);
                if (idea) setSelectedIdea(idea);
              }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-4 text-[11px]">
          {Object.entries(STATUS_CONFIG).map(([, cfg]) => (
            <span key={cfg.label} className="flex items-center gap-1 text-muted-foreground">
              <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} />{cfg.label}
            </span>
          ))}
        </div>

        <CalendarComments
          className="mt-5"
          clientId={data.client.id}
          calendarType={calendarType}
          month={viewMonth}
          shareToken={token}
          guestEmail={viewer?.type === 'guest' ? viewer.email : undefined}
          viewerAuthToken={viewer?.authToken}
          mentionUsers={data.users || []}
          currentUserEmail={viewer?.email}
          title="Comentarios del mes"
        />

        <CalendarIdeaComments
          className="mt-5"
          clientId={data.client.id}
          calendarType={calendarType}
          month={viewMonth}
          shareToken={token}
          guestEmail={viewer?.type === 'guest' ? viewer.email : undefined}
          viewerAuthToken={viewer?.authToken}
          ideas={data.ideas}
          currentUserEmail={viewer?.email}
          onOpenIdea={id => {
            const idea = data.ideas.find(item => item.id === id);
            if (idea) setSelectedIdea(idea);
          }}
          title="Comentarios de las ideas"
        />
      </div>

      {selectedIdea && data && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) closeSelectedIdea(); }}
          onIdeaUpdated={(updatedIdea) => {
            setData({
              ...data,
              ideas: data.ideas.map(i => i.id === updatedIdea.id ? updatedIdea : i),
            });
            fetchCalendar();
          }}
          onIdeaDeleted={() => {
            closeSelectedIdea();
            fetchCalendar();
          }}
          users={data.users || []}
          calendarType={calendarType}
        />
      )}
    </div>
  );
}

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
      .then(json => { if (json.client) setClient(json.client); else setFetchError(json.error || 'Calendario no encontrado'); })
      .catch(() => setFetchError('Error al cargar'));
  }, [token, calendarType]);

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-4">
          <h1 className="text-xl font-semibold">No pudimos cargar el acceso al calendario</h1>
          <p className="text-sm text-muted-foreground" role="alert">{fetchError}</p>
          <Button onClick={() => window.location.reload()} className="gap-2 rounded-xl">
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        </div>
      </div>
    );
  }
  if (!client) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  return <AuthGate token={token} client={client} calendarType={calendarType} onEnter={onEnter} />;
}
