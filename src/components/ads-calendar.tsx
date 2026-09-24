'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAdsIdeas, useEcommerceDates } from '@/lib/hooks/use-ads-ideas';
import { useInternalUsers } from '@/lib/hooks/use-internal-users';
import { useAuthStore } from '@/store/auth-store';
import { SocialNewIdeaDialog } from '@/components/social-new-idea-dialog';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { CalendarGuestAccessDialog } from '@/components/calendar-guest-access-dialog';
import type { SocialIdea, IdeaStatus, EcommerceDate, PostType } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Check,
  ChevronDown, ShoppingBag, Trash2, X, Copy, Share2, Users, ExternalLink,
  LayoutGrid, List as ListIcon, ChevronRight as ChevronRightIcon,
} from 'lucide-react';

const STATUS_ORDER: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];
type ShareConfig = { token: string | null; allowed_client_id?: string; guest_enabled: boolean; allowed_user_ids: string[] };
type ViewMode = 'month' | 'agenda';

const ECOMMERCE_COLORS = [
  { label: 'Rojo', value: '#ef4444' }, { label: 'Naranja', value: '#f97316' }, { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' }, { label: 'Cian', value: '#06b6d4' }, { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' }, { label: 'Rosa', value: '#ec4899' }, { label: 'Índigo', value: '#6366f1' },
];

function EcommerceDateDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (data: { name: string; color: string; start_date: string; end_date: string }) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setColor('#6366f1'); setStartDate(''); setEndDate(''); setError(''); };

  const handleCreate = async () => {
    if (!name.trim() || !startDate || !endDate) { setError('Completá todos los campos'); return; }
    if (startDate > endDate) { setError('La fecha de inicio debe ser anterior o igual a la fecha de fin'); return; }
    setSaving(true);
    setError('');
    try {
      await onCreate({ name: name.trim(), color, start_date: startDate, end_date: endDate });
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { reset(); onOpenChange(false); }}>
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Nueva Fecha Ecommerce</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => { reset(); onOpenChange(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Black Friday, Cyber Monday..." className="rounded-lg" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {ECOMMERCE_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={cn('h-7 w-7 rounded-full transition-transform hover:scale-110', color === c.value && 'ring-2 ring-offset-2 ring-foreground scale-110')}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg" />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button size="sm" variant="default" className="rounded-lg gap-1.5" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Crear fecha
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusDropdown({ idea, onStatusChange }: { idea: SocialIdea; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const stConfig = STATUS_CONFIG[idea.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button type="button" className={cn('flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium shrink-0 transition-colors hover:opacity-80', stConfig.colorClass)} onClick={(e) => e.stopPropagation()} />
      }>
        <span className="truncate max-w-[60px]">{stConfig.label}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuRadioGroup value={idea.status} onValueChange={(val) => onStatusChange(idea.id, val as IdeaStatus)}>
          {STATUS_ORDER.map(key => {
            const s = STATUS_CONFIG[key];
            return (
              <DropdownMenuRadioItem key={key} value={key}>
                <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', s.dotColor)} />
                {s.label}
              </DropdownMenuRadioItem>
            );
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
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={idea.title}
      className={cn(
        'flex items-center gap-1 w-full rounded-md px-1.5 py-1 text-[10.5px] font-medium truncate transition-opacity text-left',
        isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass],
        isDragging && 'opacity-50 shadow-lg',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isPublished ? 'bg-green-500' : ptConfig.dotColor)} />
      <span className="truncate">{idea.title}</span>
    </button>
  );
}

function MonthDayCell({ date, ideas, isToday, isCurrentMonth, ecommerceDates, onIdeaClick, onAddClick }: {
  date: string; ideas: SocialIdea[]; isToday: boolean; isCurrentMonth: boolean; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = Number(date.split('-')[2]);
  const shown = ideas.slice(0, 3);
  const overflow = ideas.length - shown.length;
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddClick(date)}
      className={cn(
        'min-h-[104px] rounded-2xl p-2 transition-colors cursor-pointer flex flex-col group',
        !isCurrentMonth && 'opacity-40',
        isOver ? 'bg-primary/15' : isToday ? 'bg-primary/8' : 'bg-muted/25 hover:bg-muted/45',
      )}
    >
      {active.length > 0 && (
        <div className="flex flex-col gap-px mb-1">
          {active.map(ed => (
            <div key={ed.id} style={{ backgroundColor: ed.color + '22', borderLeft: `2px solid ${ed.color}`, color: ed.color }} className="text-[9px] font-bold px-1 py-px rounded-r-sm truncate leading-tight">
              {ed.start_date === date ? ed.name : ' '}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground/70')}>
          {day}
        </span>
        <span role="button" onClick={(e) => { e.stopPropagation(); onAddClick(date); }} className="h-5 w-5 rounded-md flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/15 transition-opacity">
          <Plus className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="space-y-1 flex-1">
        {shown.map(idea => <DraggableDot key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} />)}
        {overflow > 0 && <p className="text-[10px] text-muted-foreground pl-1.5">+{overflow} más</p>}
      </div>
    </div>
  );
}

function DragOverlayPill({ idea }: { idea: SocialIdea }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const isPublished = idea.status === 'posteado';
  return (
    <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold shadow-xl max-w-[160px] truncate', isPublished ? 'bg-green-500/15 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass])}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', isPublished ? 'bg-green-500' : ptConfig.dotColor)} />
      <span className="truncate">{idea.title}</span>
    </div>
  );
}

function AgendaRow({ idea, onClick, onStatusChange }: { idea: SocialIdea; onClick: () => void; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const date = new Date(idea.publish_date + 'T12:00:00');
  return (
    <button type="button" onClick={onClick} className="group w-full flex items-center gap-3 rounded-2xl bg-muted/30 hover:bg-muted/55 transition-colors p-3 text-left">
      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-background">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase leading-none">{date.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}</span>
        <span className="text-base font-bold leading-none mt-0.5">{date.getDate()}</span>
      </div>
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', ptConfig.bgColorClass, ptConfig.colorClass)}>
        <PtIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{idea.title}</p>
        <p className="text-xs text-muted-foreground truncate">{ptConfig.label}{idea.eje_contenido ? ` · ${idea.eje_contenido}` : ''}</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}><StatusDropdown idea={idea} onStatusChange={onStatusChange} /></div>
      <ChevronRightIcon className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}

interface AdsCalendarProps {
  clientId: string;
  clientName: string;
  initialMonth?: string | null;
  initialIdeaId?: string | null;
}

export function AdsCalendar({ clientId, clientName: _clientName, initialMonth, initialIdeaId }: AdsCalendarProps) {
  const { user } = useAuthStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialMonth ? Number(initialMonth.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ? Number(initialMonth.split('-')[1]) - 1 : today.getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [activeTypes, setActiveTypes] = useState<Set<PostType>>(new Set(Object.keys(POST_TYPE_CONFIG) as PostType[]));
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef<HTMLDivElement>(null);
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { ideas, loading, createIdea, updateIdea, deleteIdea, patchIdea } = useAdsIdeas(clientId, monthStr);
  const internalUsers = useInternalUsers();
  const { dates: ecommerceDates, createDate, deleteDate } = useEcommerceDates(clientId, monthStr);

  const [showNewIdea, setShowNewIdea] = useState(false);
  const [showNewEcomDate, setShowNewEcomDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [dismissedIdeaId, setDismissedIdeaId] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchShareToken = useCallback(() => {
    if (!clientId) return;
    setShareLoading(true);
    setShareError('');
    fetch('/api/calendar-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, calendar_type: 'ads', month: monthStr }),
    })
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'No se pudo generar el link');
        setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] });
      })
      .catch((err) => setShareError(err instanceof Error ? err.message : 'No se pudo generar el link'))
      .finally(() => setShareLoading(false));
  }, [clientId, monthStr]);

  useEffect(() => { fetchShareToken(); }, [fetchShareToken]);

  useEffect(() => {
    if (!initialMonth) return;
    const [year, month] = initialMonth.split('-').map(Number);
    if (year && month) { setViewYear(year); setViewMonth(month - 1); }
  }, [initialMonth]);

  useEffect(() => {
    if (!initialIdeaId || dismissedIdeaId === initialIdeaId || selectedIdea?.id === initialIdeaId) return;
    const idea = ideas.find(item => item.id === initialIdeaId);
    if (idea) setSelectedIdea(idea);
  }, [dismissedIdeaId, initialIdeaId, ideas, selectedIdea?.id]);

  useEffect(() => {
    if (!selectedIdea) return;
    if (!ideas.some(idea => idea.id === selectedIdea.id)) setSelectedIdea(null);
  }, [ideas, selectedIdea]);

  const syncIdea = useCallback((updated: SocialIdea) => { setSelectedIdea(updated); patchIdea(updated); }, [patchIdea]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const goToday = useCallback(() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }, [today]);
  const prevMonth = useCallback(() => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); }, [viewMonth]);
  const nextMonth = useCallback(() => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); }, [viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const filteredIdeas = useMemo(() => ideas.filter(i => activeTypes.has(i.post_type)), [ideas, activeTypes]);

  const ideasByDate = useMemo(() => {
    const map = new Map<string, SocialIdea[]>();
    for (const idea of filteredIdeas) {
      const existing = map.get(idea.publish_date) || [];
      existing.push(idea);
      map.set(idea.publish_date, existing);
    }
    return map;
  }, [filteredIdeas]);

  const agendaGroups = useMemo(() => {
    const sorted = [...filteredIdeas].filter(i => i.publish_date.startsWith(monthStr)).sort((a, b) => a.publish_date.localeCompare(b.publish_date));
    const groups: { label: string; items: SocialIdea[] }[] = [];
    let currentWeekStart = '';
    for (const idea of sorted) {
      const d = new Date(idea.publish_date + 'T12:00:00');
      const monday = new Date(d);
      const dow = (d.getDay() + 6) % 7;
      monday.setDate(d.getDate() - dow);
      const key = monday.toISOString().split('T')[0];
      if (key !== currentWeekStart) {
        const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
        groups.push({ label: `${monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`, items: [] });
        currentWeekStart = key;
      }
      groups[groups.length - 1].items.push(idea);
    }
    return groups;
  }, [filteredIdeas, monthStr]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const idea = (event.active.data.current as { idea?: SocialIdea })?.idea;
    if (idea) setActiveIdea(idea);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveIdea(null);
    const { active, over } = event;
    if (!over) return;
    const idea = (active.data.current as { idea?: SocialIdea })?.idea;
    const newDate = over.id as string;
    if (idea && idea.publish_date !== newDate) await updateIdea(idea.id, { publish_date: newDate });
  }, [updateIdea]);

  const handleDayClick = useCallback((date: string) => { setSelectedDate(date); setShowNewIdea(true); }, []);
  const handleStatusChange = useCallback(async (id: string, status: IdeaStatus) => { await updateIdea(id, { status }); }, [updateIdea]);

  const shareUrl = shareConfig?.token && typeof window !== 'undefined' ? `${window.location.origin}/c/${shareConfig.token}?type=ads` : '';
  const canManageShare = user?.role === 'admin' || user?.role === 'operador';

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
    for (let i = 0; i < firstDayOfWeek; i++) {
      const d = new Date(viewYear, viewMonth, -firstDayOfWeek + i + 1);
      cells.push({ date: d.toISOString().split('T')[0], inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) cells.push({ date: `${monthStr}-${String(day).padStart(2, '0')}`, inMonth: true });
    while (cells.length % 7 !== 0) {
      const last = new Date(cells[cells.length - 1].date + 'T12:00:00');
      last.setDate(last.getDate() + 1);
      cells.push({ date: last.toISOString().split('T')[0], inMonth: false });
    }
    return cells;
  }, [firstDayOfWeek, daysInMonth, monthStr, viewYear, viewMonth]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /><p className="text-sm">Cargando calendario ADS...</p></div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        <div className="space-y-4 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
              <button type="button" onClick={goToday} className="text-lg font-bold min-w-[150px] text-center hover:text-primary transition-colors capitalize">
                {monthNames[viewMonth]} {viewYear}
              </button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            </div>

            <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
              <button type="button" onClick={() => setViewMode('month')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'month' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <LayoutGrid className="h-3.5 w-3.5" /> Mes
              </button>
              <button type="button" onClick={() => setViewMode('agenda')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors', viewMode === 'agenda' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <ListIcon className="h-3.5 w-3.5" /> Agenda
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button onClick={() => setShowNewEcomDate(true)} variant="secondary" size="sm" className="gap-1.5 rounded-lg">
                <ShoppingBag className="h-3.5 w-3.5" /> Fecha Ecommerce
              </Button>
              <div className="relative" ref={shareBtnRef}>
                <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg" onClick={() => setShareOpen(o => !o)}>
                  <Share2 className="h-3.5 w-3.5" /> Compartir
                </Button>
                {shareOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-popover p-4 shadow-xl z-50 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground">Link para el cliente</p>
                      {shareConfig?.token ? (
                        <>
                          <div className="flex gap-1.5">
                            <Input value={shareUrl} readOnly className="h-8 text-xs rounded-lg" onFocus={(e) => e.currentTarget.select()} />
                            <Button size="icon-sm" variant="secondary" className="rounded-lg shrink-0" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><CalendarGuestAccessDialog clientId={clientId} calendarType="ads" month={monthStr} config={shareConfig} onConfigChange={setShareConfig} /></div>
                            <a href={`/c/${shareConfig.token}?type=ads`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors">
                              <ExternalLink className="h-3 w-3" /> Ver landing
                            </a>
                          </div>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full gap-1.5 rounded-lg" disabled={shareLoading} onClick={fetchShareToken}>
                          {shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />} Generar link
                        </Button>
                      )}
                      {shareError && <p className="text-xs text-destructive">{shareError}</p>}
                    </div>
                  </>
                )}
              </div>
              <Button onClick={() => { setSelectedDate(null); setShowNewIdea(true); }} variant="default" className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Nueva Pieza
              </Button>
            </div>
          </div>

          {/* Ecommerce dates legend */}
          {ecommerceDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ecommerceDates.map(ed => (
                <div key={ed.id} style={{ backgroundColor: ed.color + '18', color: ed.color }} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                  <ShoppingBag className="h-3 w-3" />
                  <span>{ed.name}</span>
                  <span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span>
                  <button type="button" onClick={() => deleteDate(ed.id)} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'month' ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-7 gap-1.5">
                {dayNames.map(n => <div key={n} className="text-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide py-1">{n}</div>)}
                {monthCells.map(cell => {
                  const isToday = cell.date === today.toISOString().split('T')[0];
                  return (
                    <MonthDayCell
                      key={cell.date}
                      date={cell.date}
                      ideas={ideasByDate.get(cell.date) || []}
                      isToday={isToday}
                      isCurrentMonth={cell.inMonth}
                      ecommerceDates={ecommerceDates}
                      onIdeaClick={setSelectedIdea}
                      onAddClick={handleDayClick}
                    />
                  );
                })}
              </div>
              <DragOverlay>{activeIdea ? <DragOverlayPill idea={activeIdea} /> : null}</DragOverlay>
            </DndContext>
          ) : (
            <div className="space-y-5">
              {agendaGroups.length === 0 ? (
                <div className="rounded-2xl bg-muted/25 py-16 flex flex-col items-center gap-2 text-muted-foreground">
                  <ListIcon className="h-8 w-8 opacity-40" />
                  <p className="text-sm">No hay piezas planificadas este mes.</p>
                  <Button size="sm" variant="secondary" className="rounded-lg gap-1.5 mt-1" onClick={() => { setSelectedDate(null); setShowNewIdea(true); }}><Plus className="h-3.5 w-3.5" /> Agregar la primera</Button>
                </div>
              ) : agendaGroups.map(group => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1">Semana del {group.label}</p>
                  <div className="space-y-1.5">
                    {group.items.map(idea => <AgendaRow key={idea.id} idea={idea} onClick={() => setSelectedIdea(idea)} onStatusChange={handleStatusChange} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-muted/25 p-4 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filtrar por tipo</p>
            {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const on = activeTypes.has(key as PostType);
              const count = ideas.filter(i => i.post_type === key).length;
              return (
                <button key={key} type="button" onClick={() => toggleType(key as PostType)} className={cn('w-full flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors', on ? cn(cfg.bgColorClass, cfg.colorClass) : 'text-muted-foreground/50 hover:bg-muted/40')}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 text-left">{cfg.label}</span>
                  <span className="text-[10px] opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="rounded-2xl bg-muted/25 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Este mes</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold">{ideas.filter(i => i.publish_date.startsWith(monthStr)).length}</span>
              <span className="text-xs text-muted-foreground">piezas planificadas</span>
            </div>
            <div className="space-y-1 pt-1">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const count = ideas.filter(i => i.status === key && i.publish_date.startsWith(monthStr)).length;
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center gap-1.5 text-xs">
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dotColor)} />
                    <span className="text-muted-foreground flex-1">{cfg.label}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <SocialNewIdeaDialog open={showNewIdea} onOpenChange={setShowNewIdea} initialDate={selectedDate} onCreateIdea={createIdea} users={internalUsers} calendarType="ads" />
      <EcommerceDateDialog open={showNewEcomDate} onOpenChange={setShowNewEcomDate} onCreate={createDate} />

      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) closeSelectedIdea(); }}
          onIdeaUpdated={(updated) => syncIdea(updated)}
          onIdeaDeleted={() => { deleteIdea(selectedIdea!.id); setSelectedIdea(null); }}
          users={internalUsers}
          calendarType="ads"
        />
      )}
    </>
  );
}
