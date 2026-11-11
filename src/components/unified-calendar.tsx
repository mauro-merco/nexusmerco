'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useSocialIdeas } from '@/lib/hooks/use-social-ideas';
import { useAdsIdeas, useEcommerceDates } from '@/lib/hooks/use-ads-ideas';
import { useInternalUsers } from '@/lib/hooks/use-internal-users';
import { CalendarComments } from '@/components/calendar-comments';
import { CalendarIdeaComments } from '@/components/calendar-idea-comments';
import { CalendarRecentComments } from '@/components/calendar-recent-comments';
import { CalendarSearch } from '@/components/calendar-search';
import { useAuthStore } from '@/store/auth-store';
import { SocialNewIdeaDialog } from '@/components/social-new-idea-dialog';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { CalendarGuestAccessDialog } from '@/components/calendar-guest-access-dialog';
import { CalendarAgenda, useIsMobile } from '@/components/calendar-agenda';
import { EcommerceDateDialog } from '@/components/ecommerce-date-dialog';
import { CalendarFolders, CalendarTypeFilter, CalendarTabs, CalendarMonthSummary, CALENDAR_PANEL, CALENDAR_COLUMNS, CALENDAR_TOOLBAR, CALENDAR_DAY } from '@/components/calendar-parts';
import { Scroller } from '@/components/task-ui';
import { CalendarMonthFolder } from '@/components/calendar-month-folder';
import { CalendarGeneralFolders } from '@/components/calendar-general-folders';
import type { SocialIdea, IdeaStatus, PostType, EcommerceDate } from '@/lib/types';
import { CalendarPillBody, calendarPillTitle } from '@/components/calendar-pill-body';
import { POST_TYPE_CONFIG, STATUS_CONFIG, IDEA_STATUS_ORDER, ideaName } from '@/lib/social-config';
import { ChevronLeft, ChevronRight, Plus, Loader2, RefreshCw, Check, ChevronDown, Copy, Share2, Users, ExternalLink, LayoutGrid, List as ListIcon, ChevronRight as ChevronRightIcon, ShoppingBag, Trash2 } from 'lucide-react';

const STATUS_ORDER = IDEA_STATUS_ORDER;
type ShareConfig = { token: string | null; allowed_client_id?: string; guest_enabled: boolean; allowed_user_ids: string[] };
type ViewMode = 'month' | 'agenda';

function StatusDropdown({ idea, onStatusChange }: { idea: SocialIdea; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const stConfig = STATUS_CONFIG[idea.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" className={cn('flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium shrink-0 transition-colors hover:opacity-80', stConfig.colorClass)} onClick={(e) => e.stopPropagation()} />}>
        <span className="truncate max-w-[60px]">{stConfig.label}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuRadioGroup value={idea.status} onValueChange={(val) => onStatusChange(idea.id, val as IdeaStatus)}>
          {STATUS_ORDER.map(key => {
            const s = STATUS_CONFIG[key];
            return <DropdownMenuRadioItem key={key} value={key}><span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.dotColor)} />{s.label}</DropdownMenuRadioItem>;
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DraggableDot({ idea, onClick, isExtended }: { idea: SocialIdea; onClick: () => void; isExtended?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id, data: { idea } });
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const isPublished = idea.status === 'posteado';
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes} type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} title={calendarPillTitle(idea)}
      className={cn('tm-lift tm-press flex w-full flex-col items-stretch rounded-lg px-2 py-1 text-[11px] font-medium transition-opacity text-left',
        idea.status === 'espera_cliente' ? 'border border-red-500/60 bg-red-500/20 text-red-700 dark:text-red-200 shadow-sm shadow-red-500/20' : isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass],
        isExtended && 'grayscale opacity-70',
        isDragging && 'opacity-50 shadow-lg')}>
      <CalendarPillBody idea={idea} />
    </button>
  );
}

function DragOverlayPill({ idea }: { idea: SocialIdea }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const isPublished = idea.status === 'posteado';
  return <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold shadow-xl max-w-[160px] truncate', idea.status === 'espera_cliente' ? 'border border-red-500/60 bg-red-500/20 text-red-700 dark:text-red-200' : isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass])}><span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isPublished ? 'bg-green-500' : ptConfig.dotColor)} /><span className="truncate">{idea.title}</span></div>;
}

function AgendaRow({ idea, onClick, onStatusChange }: { idea: SocialIdea; onClick: () => void; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const date = new Date(idea.publish_date + 'T12:00:00');
  return (
    <button type="button" onClick={onClick} className="group w-full flex items-center gap-3 rounded-2xl bg-muted/30 hover:bg-muted/55 transition-colors p-3 text-left">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-background"><span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">{date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span><span className="text-base font-bold leading-none mt-0.5">{date.getDate()}</span></div>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ptConfig.bgColorClass, ptConfig.colorClass)}><PtIcon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{idea.title}</p><p className="text-xs text-muted-foreground truncate">{ptConfig.label}{idea.eje_contenido ? ` · ${idea.eje_contenido}` : ''}</p></div>
      <div onClick={(e) => e.stopPropagation()}><StatusDropdown idea={idea} onStatusChange={onStatusChange} /></div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

function MonthDayCell({ date, ideas, isToday, isCurrentMonth, ecommerceDates, onIdeaClick, onAddClick }: {
  date: string; ideas: SocialIdea[]; isToday: boolean; isCurrentMonth: boolean; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = Number(date.split('-')[2]);
  const [y, m] = date.split('-').map(Number);
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);
  const count = ideas.length;
  const minH = Math.max(132, 90 + count * 22);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' });

  return (
    <div ref={setNodeRef} onClick={() => onAddClick(date)}
      style={{ minHeight: minH, ...(active.length > 0 ? { backgroundColor: `${active[0].color}14` } : isCurrentMonth ? {} : { backgroundColor: 'rgba(148,163,184,0.10)' }) }}
      className={cn(CALENDAR_DAY, !isCurrentMonth && 'grayscale opacity-70', isOver ? 'bg-primary/15' : isToday ? 'bg-primary/8' : isCurrentMonth ? 'bg-muted/25 hover:bg-muted/40' : 'bg-muted/12 hover:bg-muted/25')}>
      {active.length > 0 && (
        <div className="flex flex-col gap-1 mb-1.5">
          {active.map(ed => <div key={ed.id} style={{ backgroundColor: `${ed.color}38`, color: ed.color, boxShadow: `inset 0 0 0 1.5px ${ed.color}` }} className="truncate rounded-lg px-1.5 py-1 text-center text-[11px] font-black uppercase leading-tight tracking-wide">{ed.name}</div>)}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-muted-foreground/70' : 'text-muted-foreground/60')}>{day}</span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', isCurrentMonth ? 'bg-muted/60 text-muted-foreground' : 'bg-muted/40 text-muted-foreground/70')}>de {monthLabel}</span>
        </div>
        <span role="button" onClick={(e) => { e.stopPropagation(); onAddClick(date); }} className="h-5 w-5 rounded-md flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/15 transition-opacity"><Plus className="h-3.5 w-3.5" /></span>
      </div>
      <div className="space-y-1 flex-1">
        {ideas.map(idea => <DraggableDot key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} isExtended={!isCurrentMonth} />)}
      </div>
    </div>
  );
}

interface UnifiedCalendarProps {
  clientId: string;
  clientName: string;
  initialMonth?: string | null;
  initialIdeaId?: string | null;
  forceType?: 'redes' | 'ads' | 'tareas';
  /** Vista inicial (mes / agenda), leída de la URL. */
  initialView?: 'month' | 'agenda' | null;
  /** Avisos para mantener la URL sincronizada (cada estado con link propio). */
  onMonthChange?: (month: string) => void;
  onViewChange?: (view: 'month' | 'agenda') => void;
  onIdeaChange?: (ideaId: string | null) => void;
}

export function UnifiedCalendar({ clientId, clientName, initialMonth, initialIdeaId, initialView, onMonthChange, onViewChange, onIdeaChange }: UnifiedCalendarProps) {
  const { user } = useAuthStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialMonth ? Number(initialMonth.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ? Number(initialMonth.split('-')[1]) - 1 : today.getMonth());
  const [viewMode, setViewModeState] = useState<ViewMode>(initialView === 'agenda' ? 'agenda' : 'month');
  const setViewMode = (v: ViewMode) => { setViewModeState(v); onViewChange?.(v); };
  const isMobile = useIsMobile();
  const effectiveView: ViewMode = isMobile ? 'agenda' : viewMode;
  const [search, setSearch] = useState('');
  const isSearching = search.trim().length >= 2;
  const [activeTypes, setActiveTypes] = useState<Set<PostType>>(new Set(Object.keys(POST_TYPE_CONFIG) as PostType[]));
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef<HTMLDivElement>(null);
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const prevDate = new Date(viewYear, viewMonth - 1, 1);
  const nextDate = new Date(viewYear, viewMonth + 1, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

  const { ideas: socialIdeasCur, loading: loadingSocialCur, refetch: refetchSocialCur, createIdea: createSocialIdea, updateIdea: updateSocialIdea, deleteIdea: deleteSocialIdea, patchIdea: patchSocialIdea } = useSocialIdeas(clientId, monthStr);
  const { ideas: socialIdeasPrev, refetch: refetchSocialPrev } = useSocialIdeas(clientId, prevMonthStr);
  const { ideas: socialIdeasNext, refetch: refetchSocialNext } = useSocialIdeas(clientId, nextMonthStr);
  const { ideas: adsIdeasCur, loading: loadingAdsCur, refetch: refetchAdsCur, createIdea: createAdsIdea, updateIdea: updateAdsIdea, deleteIdea: deleteAdsIdea, patchIdea: patchAdsIdea } = useAdsIdeas(clientId, monthStr);
  const { ideas: adsIdeasPrev, refetch: refetchAdsPrev } = useAdsIdeas(clientId, prevMonthStr);
  const { ideas: adsIdeasNext, refetch: refetchAdsNext } = useAdsIdeas(clientId, nextMonthStr);
  const { dates: ecommerceDatesCur, refetch: refetchEcomCur, createDate: createEcomDate, deleteDate: deleteEcomDate } = useEcommerceDates(clientId, monthStr);
  const { dates: ecommerceDatesPrev, refetch: refetchEcomPrev } = useEcommerceDates(clientId, prevMonthStr);
  const { dates: ecommerceDatesNext, refetch: refetchEcomNext } = useEcommerceDates(clientId, nextMonthStr);

  const socialIdeas = useMemo(() => [...new Map([...socialIdeasPrev, ...socialIdeasNext, ...socialIdeasCur].map(idea => [idea.id, idea])).values()], [socialIdeasPrev, socialIdeasCur, socialIdeasNext]);
  const adsIdeas = useMemo(() => [...new Map([...adsIdeasPrev, ...adsIdeasNext, ...adsIdeasCur].map(idea => [idea.id, idea])).values()], [adsIdeasPrev, adsIdeasCur, adsIdeasNext]);
  const ecommerceDates = useMemo(() => [...new Map([...ecommerceDatesPrev, ...ecommerceDatesNext, ...ecommerceDatesCur].map(date => [date.id, date])).values()], [ecommerceDatesPrev, ecommerceDatesCur, ecommerceDatesNext]);
  const loadingSocial = loadingSocialCur;
  const loadingAds = loadingAdsCur;
  const internalUsers = useInternalUsers();

  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [showNewEcomDate, setShowNewEcomDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [selectedIdeaType, setSelectedIdeaType] = useState<'social' | 'ads'>('social');
  const [dismissedIdeaId, setDismissedIdeaId] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);

  const allIdeas = useMemo(() => [...socialIdeas.map(i => ({ ...i, _cal: 'social' as const })), ...adsIdeas.map(i => ({ ...i, _cal: 'ads' as const }))], [socialIdeas, adsIdeas]);
  const loading = loadingSocial || loadingAds;
  const [refreshing, setRefreshing] = useState(false);
  const refreshCalendar = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchSocialPrev(), refetchSocialCur(), refetchSocialNext(),
        refetchAdsPrev(), refetchAdsCur(), refetchAdsNext(),
        refetchEcomPrev(), refetchEcomCur(), refetchEcomNext(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchShareToken = useCallback(async () => {
    if (!clientId) return;
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch('/api/calendar-links', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, calendar_type: 'social', month: monthStr }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo generar el link');
      setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] });
    } catch (err) { setShareError(err instanceof Error ? err.message : 'No se pudo generar el link'); } finally { setShareLoading(false); }
  }, [clientId, monthStr]);

  useEffect(() => { fetchShareToken(); }, [fetchShareToken]);
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;
  useEffect(() => { onMonthChangeRef.current?.(monthStr); }, [monthStr]);
  const onIdeaChangeRef = useRef(onIdeaChange);
  onIdeaChangeRef.current = onIdeaChange;
  useEffect(() => { if (selectedIdea?.id) onIdeaChangeRef.current?.(selectedIdea.id); }, [selectedIdea?.id]);
  useEffect(() => { if (!initialMonth) return; const [year, month] = initialMonth.split('-').map(Number); if (year && month) { setViewYear(year); setViewMonth(month - 1); } }, [initialMonth]);
  useEffect(() => {
    if (!initialIdeaId || dismissedIdeaId === initialIdeaId || selectedIdea?.id === initialIdeaId) return;
    const idea = allIdeas.find((item: any) => item.id === initialIdeaId);
    if (idea) { setSelectedIdea(idea as SocialIdea); setSelectedIdeaType((idea as any)._cal); }
  }, [dismissedIdeaId, initialIdeaId, allIdeas, selectedIdea?.id]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const goToday = useCallback(() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }, [today]);
  const prevMonth = useCallback(() => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); }, [viewMonth]);
  const nextMonth = useCallback(() => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); }, [viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const filteredIdeas = useMemo(() => allIdeas.filter((i: any) => activeTypes.has(i.post_type)), [allIdeas, activeTypes]);
  const ideasByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const idea of filteredIdeas as any[]) {
      const arr = map.get(idea.publish_date) || [];
      arr.push(idea);
      map.set(idea.publish_date, arr);
    }
    return map;
  }, [filteredIdeas]);

  const handleDragStart = useCallback((event: DragStartEvent) => { const idea = (event.active.data.current as { idea?: SocialIdea })?.idea; if (idea) setActiveIdea(idea); }, []);
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveIdea(null);
    const { active, over } = event;
    if (!over) return;
    const idea = (active.data.current as { idea?: any })?.idea;
    const newDate = over.id as string;
    if (!idea || idea.publish_date === newDate) return;
    if (idea._cal === 'ads') await updateAdsIdea(idea.id, { publish_date: newDate });
    else await updateSocialIdea(idea.id, { publish_date: newDate });
  }, [updateAdsIdea, updateSocialIdea]);

  const handleDayClick = useCallback((date: string) => { setSelectedDate(date); setShowNewIdea(true); }, []);
  const handleStatusChange = useCallback(async (id: string, status: IdeaStatus) => {
    const idea = allIdeas.find((i: any) => i.id === id) as any;
    if (idea?._cal === 'ads') await updateAdsIdea(id, { status });
    else await updateSocialIdea(id, { status });
  }, [allIdeas, updateAdsIdea, updateSocialIdea]);

  const shareUrl = shareConfig?.token && typeof window !== 'undefined' ? `${window.location.origin}/c/${shareConfig.token}` : '';
  const closeSelectedIdea = useCallback(() => {
    if (selectedIdea) setDismissedIdeaId(selectedIdea.id);
    setSelectedIdea(null);
    onIdeaChangeRef.current?.(null);
  }, [selectedIdea]);

  const toggleType = (t: PostType) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next.size === 0 ? new Set(Object.keys(POST_TYPE_CONFIG) as PostType[]) : next;
    });
  };

  const monthCells = useMemo(() => {
    const cells: { date: string; inMonth: boolean }[] = [];
    const firstDay = (firstDayOfWeek + 6) % 7; // lunes = 0
    let leading = firstDay;
    while (leading < 10) leading += 7;
    for (let i = 0; i < leading; i++) {
      const d = new Date(viewYear, viewMonth, -leading + i + 1);
      cells.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) cells.push({ date: `${monthStr}-${String(day).padStart(2, '0')}`, inMonth: true });
    let trailing = 0;
    while (true) {
      const remainder = cells.length % 7;
      if (remainder === 0 && trailing >= 10) break;
      const last = new Date(cells[cells.length - 1].date + 'T12:00:00');
      last.setDate(last.getDate() + 1);
      cells.push({ date: last.toISOString().split('T')[0], inMonth: false });
      trailing += 1;
      if (trailing > 42) break;
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth, monthStr, viewYear, viewMonth]);

  if (loading && !refreshing) return <ContentSkeleton variant="calendar" />;

  return (
    <>
      <div className={CALENDAR_COLUMNS}>
        <div className="space-y-4 min-w-0">
          <div className={CALENDAR_TOOLBAR}>
            <div className="flex items-center rounded-full border border-border bg-card p-1">
              <button type="button" onClick={prevMonth} aria-label="Mes anterior" className="tm-press flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={goToday} title="Ir al mes actual" className="min-w-[150px] px-2 text-center text-[15px] font-semibold capitalize transition-colors hover:text-primary">{monthNames[viewMonth]} {viewYear}</button>
              <button type="button" onClick={nextMonth} aria-label="Mes siguiente" className="tm-press flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="hidden rounded-full border border-border bg-card p-1 md:flex">
              {([['month', 'Mes', LayoutGrid], ['agenda', 'Agenda', ListIcon]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" onClick={() => setViewMode(k)}
                  className={cn('flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors', viewMode === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" onClick={refreshCalendar} disabled={refreshing} title="Actualizar" aria-label={refreshing ? 'Actualizando calendario' : 'Actualizar calendario'} aria-busy={refreshing}
                className="tm-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-60">
                <RefreshCw aria-hidden="true" className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <button type="button" onClick={() => setShowNewEcomDate(true)}
                className="tm-press flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-medium hover:bg-muted">
                <ShoppingBag className="h-4 w-4 text-violet-500" /> <span className="hidden sm:inline">Fecha ecommerce</span>
              </button>
              <div className="relative" ref={shareBtnRef}>
                <button type="button" onClick={() => setShareOpen(o => !o)}
                  className={cn('tm-press flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors', shareOpen ? 'border-primary/40 bg-tint-blue text-tint-blue-foreground' : 'border-border bg-card hover:bg-muted')}>
                  <Share2 className="h-4 w-4" /> Compartir
                </button>
                {shareOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                    <div className="tm-pop absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] space-y-3 rounded-[1.4rem] border border-border bg-popover p-4 shadow-xl">
                      <div>
                        <p className="text-sm font-semibold">Landing para el cliente</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Link único de <span className="font-semibold capitalize text-foreground">{monthNames[viewMonth]} {viewYear}</span>. Muestra este mismo calendario y se actualiza solo con cada cambio.</p>
                      </div>
                      {shareConfig?.token ? (
                        <>
                          <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/40 py-1 pl-3.5 pr-1">
                            <input value={shareUrl} readOnly className="min-w-0 flex-1 bg-transparent text-xs outline-none" onFocus={(e) => e.currentTarget.select()} />
                            <button type="button" title="Copiar link" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                              className="tm-press flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-3 text-xs font-semibold">
                              {copied ? <><Check className="h-3.5 w-3.5" /> Copiado</> : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><CalendarGuestAccessDialog clientId={clientId} calendarType="social" month={monthStr} config={shareConfig} onConfigChange={setShareConfig} /></div>
                            <a href={`/c/${shareConfig.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted"><ExternalLink className="h-3.5 w-3.5" /> Ver landing</a>
                          </div>
                        </>
                      ) : (
                        <button type="button" disabled={shareLoading} onClick={fetchShareToken} className="tm-press flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-brand-gradient text-sm font-semibold disabled:opacity-70">
                          {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />} Generar link del mes
                        </button>
                      )}
                      {shareError && <p className="text-xs text-destructive">{shareError}</p>}
                    </div>
                  </>
                )}
              </div>
              <button type="button" onClick={() => { setSelectedDate(null); setShowNewIdea(true); }}
                className="tm-press bg-brand-gradient shadow-brand flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:brightness-105">
                <Plus className="h-4 w-4" /> Nueva idea / pieza
              </button>
            </div>
          </div>

          {ecommerceDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ecommerceDates.map(ed => <div key={ed.id} style={{ backgroundColor: ed.color + '18', color: ed.color }} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"><ShoppingBag className="h-3 w-3" /><span>{ed.name}</span><span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span><button type="button" onClick={() => deleteEcomDate(ed.id)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button></div>)}
            </div>
          )}

          <CalendarSearch className="mb-4" value={search} onChange={setSearch} ideas={allIdeas as SocialIdea[]} onSelect={(idea) => { const found = allIdeas.find((i: any) => i.id === idea.id) as any; setSelectedIdea(idea); setSelectedIdeaType(found?._cal || 'social'); }} />
          <CalendarFolders><CalendarMonthFolder clientId={clientId} calendarType="social" month={monthStr} /><CalendarGeneralFolders clientId={clientId} /></CalendarFolders>
          <CalendarTypeFilter ideas={allIdeas.filter(idea => idea.publish_date.startsWith(`${monthStr}-`))} active={activeTypes} onToggle={toggleType} />

          {isSearching ? null : effectiveView === 'month' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className={cn(CALENDAR_PANEL, 'grid grid-cols-7 gap-1.5 p-3 md:p-4')}>
                {dayNames.map(n => <div key={n} className="py-1 text-center text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{n}</div>)}
                {monthCells.map(cell => {
                  const isToday = cell.date === today.toISOString().split('T')[0];
                  const list = (ideasByDate.get(cell.date) || []) as any[];
                  return <MonthDayCell key={cell.date} date={cell.date} ideas={list as SocialIdea[]} isToday={isToday} isCurrentMonth={cell.inMonth} ecommerceDates={ecommerceDates} onIdeaClick={(idea) => { const found = allIdeas.find((i: any) => i.id === idea.id) as any; setSelectedIdea(idea); setSelectedIdeaType(found?._cal || 'social'); }} onAddClick={handleDayClick} />;
                })}
              </div>
              <DragOverlay>{activeIdea ? <DragOverlayPill idea={activeIdea} /> : null}</DragOverlay>
            </DndContext>
          ) : (
            <CalendarAgenda ideas={(filteredIdeas as SocialIdea[]).filter(i => i.publish_date.startsWith(monthStr))} onIdeaClick={(idea) => { const found = allIdeas.find((i: any) => i.id === idea.id) as any; setSelectedIdea(idea); setSelectedIdeaType(found?._cal || 'social'); }} onStatusChange={handleStatusChange} onAdd={() => { setSelectedDate(null); setShowNewIdea(true); }} emptyLabel="No hay ideas/piezas planificadas este mes." />
          )}
        </div>

        <div className="space-y-4">
          <CalendarMonthSummary ideas={allIdeas} month={monthStr} />
          <Scroller className="h-auto max-h-[620px] rounded-2xl" innerClassName="h-auto max-h-[620px]"><CalendarRecentComments clientId={clientId} calendarType="social" month={monthStr} ideas={allIdeas as SocialIdea[]} onOpenIdea={(id) => { const idea = allIdeas.find((i: any) => i.id === id) as any; if (idea) { setSelectedIdea(idea); setSelectedIdeaType(idea._cal); } }} /></Scroller>
        </div>
      </div>

      <CalendarTabs className="mt-5" first={<CalendarComments className="mt-0" clientId={clientId} calendarType="social" month={monthStr} mentionUsers={internalUsers} currentUserId={user?.id} isAdmin={user?.role === 'admin'} title="Comentarios del mes" />} second={<CalendarIdeaComments className="mt-0" clientId={clientId} calendarType="social" month={monthStr} ideas={allIdeas as SocialIdea[]} currentUserId={user?.id} isAdmin={user?.role === 'admin'} onOpenIdea={(id) => { const idea = allIdeas.find((i: any) => i.id === id) as any; if (idea) { setSelectedIdea(idea); setSelectedIdeaType(idea._cal); } }} title="Comentarios de las ideas" />} />

      <SocialNewIdeaDialog open={showNewIdea} onOpenChange={setShowNewIdea} initialDate={selectedDate} onCreateIdea={createSocialIdea} users={internalUsers} calendarType="social" />
      <EcommerceDateDialog open={showNewEcomDate} onOpenChange={setShowNewEcomDate} onCreate={createEcomDate} />

      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) closeSelectedIdea(); }}
          onIdeaUpdated={(updated) => { if (selectedIdeaType === 'ads') { patchAdsIdea(updated); setSelectedIdea(updated); } else { patchSocialIdea(updated); setSelectedIdea(updated); } }}
          onIdeaDeleted={() => { window.dispatchEvent(new CustomEvent('calendar-idea-changed', { detail: { type: selectedIdeaType, id: selectedIdea!.id } })); setSelectedIdea(null); onIdeaChangeRef.current?.(null); }}
          users={internalUsers}
          calendarType={selectedIdeaType}
        />
      )}
    </>
  );
}
