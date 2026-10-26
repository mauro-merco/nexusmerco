'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { CalendarFolders, CalendarTypeFilter, CalendarTabs } from '@/components/calendar-parts';
import { Scroller } from '@/components/task-ui';
import { CalendarMonthFolder } from '@/components/calendar-month-folder';
import { CalendarGeneralFolders } from '@/components/calendar-general-folders';
import type { SocialIdea, IdeaStatus, PostType, EcommerceDate } from '@/lib/types';
import { CalendarPillBody, calendarPillTitle } from '@/components/calendar-pill-body';
import { POST_TYPE_CONFIG, STATUS_CONFIG, IDEA_STATUS_ORDER } from '@/lib/social-config';
import { ChevronLeft, ChevronRight, Plus, Loader2, Check, ChevronDown, Copy, Share2, Users, ExternalLink, LayoutGrid, List as ListIcon, ChevronRight as ChevronRightIcon, ShoppingBag, Trash2 } from 'lucide-react';

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

function DraggableDot({ idea, onClick }: { idea: SocialIdea; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id, data: { idea } });
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const isPublished = idea.status === 'posteado';
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;
  return (
    <button ref={setNodeRef} style={style} {...listeners} {...attributes} type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} title={calendarPillTitle(idea)}
      className={cn('tm-lift tm-press flex w-full flex-col items-stretch rounded-lg px-2 py-1 text-[11px] font-medium transition-opacity text-left',
        idea.status === 'espera_cliente' ? 'border border-red-500/60 bg-red-500/20 text-red-700 dark:text-red-200 shadow-sm shadow-red-500/20' : isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass],
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
  const minH = Math.max(110, 90 + count * 22);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long' });

  return (
    <div ref={setNodeRef} onClick={() => onAddClick(date)}
      style={{ minHeight: minH, ...(active.length > 0 ? { backgroundColor: `${active[0].color}14` } : {}) }}
      className={cn('tm-fade rounded-2xl p-2 transition-all cursor-pointer flex flex-col group', isCurrentMonth ? '' : 'bg-amber-500/8 opacity-90', isOver ? 'bg-primary/15' : isToday ? 'bg-primary/8' : isCurrentMonth ? 'bg-muted/25 hover:bg-muted/40' : 'hover:bg-amber-500/12')}>
      {active.length > 0 && (
        <div className="flex flex-col gap-1 mb-1.5">
          {active.map(ed => <div key={ed.id} style={{ backgroundColor: `${ed.color}38`, color: ed.color, boxShadow: `inset 0 0 0 1.5px ${ed.color}` }} className="truncate rounded-lg px-1.5 py-1 text-center text-[11px] font-black uppercase leading-tight tracking-wide">{ed.name}</div>)}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-primary text-primary-foreground' : isCurrentMonth ? 'text-muted-foreground/70' : 'text-amber-600 dark:text-amber-400')}>{day}</span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide', isCurrentMonth ? 'bg-muted/60 text-muted-foreground' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300')}>de {monthLabel}</span>
        </div>
        <span role="button" onClick={(e) => { e.stopPropagation(); onAddClick(date); }} className="h-5 w-5 rounded-md flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/15 transition-opacity"><Plus className="h-3.5 w-3.5" /></span>
      </div>
      <div className="space-y-1 flex-1">
        {ideas.map(idea => <DraggableDot key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} />)}
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
}

export function UnifiedCalendar({ clientId, clientName, initialMonth, initialIdeaId }: UnifiedCalendarProps) {
  const { user } = useAuthStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialMonth ? Number(initialMonth.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ? Number(initialMonth.split('-')[1]) - 1 : today.getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const isMobile = useIsMobile();
  const effectiveView: ViewMode = isMobile ? 'agenda' : viewMode;
  const [search, setSearch] = useState('');
  const isSearching = search.trim().length >= 2;
  const [activeTypes, setActiveTypes] = useState<Set<PostType>>(new Set(Object.keys(POST_TYPE_CONFIG) as PostType[]));
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef<HTMLDivElement>(null);
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { ideas: socialIdeas, loading: loadingSocial, createIdea: createSocialIdea, updateIdea: updateSocialIdea, deleteIdea: deleteSocialIdea, patchIdea: patchSocialIdea } = useSocialIdeas(clientId, monthStr);
  const { ideas: adsIdeas, loading: loadingAds, createIdea: createAdsIdea, updateIdea: updateAdsIdea, deleteIdea: deleteAdsIdea, patchIdea: patchAdsIdea } = useAdsIdeas(clientId, monthStr);
  const { dates: ecommerceDates, createDate: createEcomDate, deleteDate: deleteEcomDate } = useEcommerceDates(clientId, monthStr);
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
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('idea')) { url.searchParams.delete('idea'); window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`); }
    }
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
    let leading = firstDayOfWeek;
    if (leading < 10) leading = 10;
    for (let i = 0; i < leading; i++) {
      const d = new Date(viewYear, viewMonth, -leading + i + 1);
      cells.push({ date: d.toISOString().split('T')[0], inMonth: false });
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

  if (loading) return <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">Cargando calendario...</p></div>;

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <button type="button" onClick={goToday} className="text-lg font-bold min-w-[150px] text-center hover:text-primary transition-colors capitalize">{monthNames[viewMonth]} {viewYear}</button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="hidden md:flex items-center gap-1 bg-muted/40 rounded-xl p-1">
              <button type="button" onClick={() => setViewMode('month')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'month' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}><LayoutGrid className="h-3.5 w-3.5" /> Mes</button>
              <button type="button" onClick={() => setViewMode('agenda')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'agenda' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}><ListIcon className="h-3.5 w-3.5" /> Agenda</button>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Button onClick={() => setShowNewEcomDate(true)} variant="secondary" size="sm" className="gap-1.5 rounded-lg"><ShoppingBag className="h-3.5 w-3.5" /> Crear fecha ecommerce</Button>
              <div className="relative" ref={shareBtnRef}>
                <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg" onClick={() => setShareOpen(o => !o)}><Share2 className="h-3.5 w-3.5" /> Compartir</Button>
                {shareOpen && (<><div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} /><div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-popover p-4 shadow-xl z-50 space-y-3"><p className="text-xs font-semibold text-muted-foreground">Link para el cliente</p>{shareConfig?.token ? (<><div className="flex gap-1.5"><Input value={shareUrl} readOnly className="h-8 text-xs rounded-lg" onFocus={(e) => e.currentTarget.select()} /><Button size="icon-sm" variant="secondary" className="rounded-lg shrink-0" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}</Button></div><div className="flex items-center gap-2"><div className="flex-1"><CalendarGuestAccessDialog clientId={clientId} calendarType="social" month={monthStr} config={shareConfig} onConfigChange={setShareConfig} /></div><a href={`/c/${shareConfig.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"><ExternalLink className="h-3 w-3" /> Ver landing</a></div></>) : (<Button size="sm" variant="secondary" className="w-full gap-1.5 rounded-lg" disabled={shareLoading} onClick={fetchShareToken}>{shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />} Generar link</Button>)}{shareError && <p className="text-xs text-destructive">{shareError}</p>}</div></>)}
              </div>
              <Button onClick={() => { setSelectedDate(null); setShowNewIdea(true); }} variant="default" className="tm-press gap-2 rounded-xl"><Plus className="h-4 w-4" /> Nueva Idea / Pieza</Button>
            </div>
          </div>

          {ecommerceDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ecommerceDates.map(ed => <div key={ed.id} style={{ backgroundColor: ed.color + '18', color: ed.color }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold"><ShoppingBag className="h-3 w-3" /><span>{ed.name}</span><span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span><button type="button" onClick={() => deleteEcomDate(ed.id)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button></div>)}
            </div>
          )}

          <CalendarSearch className="mb-4" value={search} onChange={setSearch} ideas={allIdeas as SocialIdea[]} onSelect={(idea) => { const found = allIdeas.find((i: any) => i.id === idea.id) as any; setSelectedIdea(idea); setSelectedIdeaType(found?._cal || 'social'); }} />
          <CalendarFolders><CalendarMonthFolder clientId={clientId} calendarType="social" month={monthStr} /><CalendarGeneralFolders clientId={clientId} /></CalendarFolders>
          <CalendarTypeFilter ideas={allIdeas as SocialIdea[]} active={activeTypes} onToggle={toggleType} />

          {isSearching ? null : effectiveView === 'month' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-7 gap-1.5">
                {dayNames.map(n => <div key={n} className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide py-1">{n}</div>)}
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
          <div className="rounded-2xl bg-muted/25 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Este mes</p>
            <div className="flex items-baseline gap-1.5"><span className="text-2xl font-bold">{(allIdeas as any[]).filter(i => i.publish_date.startsWith(monthStr)).length}</span><span className="text-xs text-muted-foreground">ideas/piezas planificadas</span></div>
            <div className="space-y-1 pt-1">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = (allIdeas as any[]).filter(i => i.status === key && i.publish_date.startsWith(monthStr)).length;
                if (count === 0) return null;
                return <div key={key} className="flex items-center gap-1.5 text-xs"><span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} /><span className="text-muted-foreground flex-1">{cfg.label}</span><span className="font-semibold">{count}</span></div>;
              })}
            </div>
          </div>
          <Scroller className="h-auto max-h-[620px] rounded-2xl" innerClassName="h-auto max-h-[620px]"><CalendarRecentComments clientId={clientId} calendarType="social" month={monthStr} ideas={allIdeas as SocialIdea[]} onOpenIdea={(id) => { const idea = allIdeas.find((i: any) => i.id === id) as any; if (idea) { setSelectedIdea(idea); setSelectedIdeaType(idea._cal); } }} /></Scroller>
        </div>
      </div>

      <CalendarTabs className="mt-5" first={<CalendarComments className="mt-0" clientId={clientId} calendarType="social" month={monthStr} mentionUsers={internalUsers} currentUserId={user?.id} isAdmin={user?.role === 'admin'} title="Comentarios del mes" />} second={<CalendarIdeaComments className="mt-0" clientId={clientId} calendarType="social" month={monthStr} ideas={allIdeas as SocialIdea[]} currentUserId={user?.id} isAdmin={user?.role === 'admin'} onOpenIdea={(id) => { const idea = allIdeas.find((i: any) => i.id === id) as any; if (idea) { setSelectedIdea(idea); setSelectedIdeaType(idea._cal); } }} title="Comentarios de las ideas" />} />

      <SocialNewIdeaDialog open={showNewIdea} onOpenChange={setShowNewIdea} initialDate={selectedDate} onCreateIdea={async (data: any) => { await createSocialIdea(data); return createAdsIdea(data) as any; }} users={internalUsers} calendarType="social" />
      <EcommerceDateDialog open={showNewEcomDate} onOpenChange={setShowNewEcomDate} onCreate={createEcomDate} />

      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) closeSelectedIdea(); }}
          onIdeaUpdated={(updated) => { if (selectedIdeaType === 'ads') { patchAdsIdea(updated); setSelectedIdea(updated); } else { patchSocialIdea(updated); setSelectedIdea(updated); } }}
          onIdeaDeleted={() => { if (selectedIdeaType === 'ads') deleteAdsIdea(selectedIdea!.id); else deleteSocialIdea(selectedIdea!.id); setSelectedIdea(null); }}
          users={internalUsers}
          calendarType={selectedIdeaType}
        />
      )}
    </>
  );
}
