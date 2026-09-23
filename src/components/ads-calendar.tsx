'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { SocialIdeaCard } from '@/components/social-idea-card';
import { CalendarGuestAccessDialog } from '@/components/calendar-guest-access-dialog';
import type { SocialIdea, IdeaStatus, EcommerceDate } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, GripVertical, Check,
  ChevronDown, ShoppingBag, Trash2, X, Copy, Share, ExternalLink,
} from 'lucide-react';

const STATUS_ORDER: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];
type ShareConfig = { token: string | null; allowed_client_id?: string; guest_enabled: boolean; allowed_user_ids: string[] };

const ECOMMERCE_COLORS = [
  { label: 'Rojo',    value: '#ef4444' },
  { label: 'Naranja', value: '#f97316' },
  { label: 'Amarillo',value: '#eab308' },
  { label: 'Verde',   value: '#22c55e' },
  { label: 'Cian',    value: '#06b6d4' },
  { label: 'Azul',    value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' },
  { label: 'Rosa',    value: '#ec4899' },
  { label: 'Índigo',  value: '#6366f1' },
];

// ─── Ecommerce date dialog ────────────────────────────────────────────────────

function EcommerceDateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
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
      <div className="bg-background rounded-xl border shadow-xl w-full max-w-sm p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold">Nueva Fecha Ecommerce</h2>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { reset(); onOpenChange(false); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Black Friday, Cyber Monday..." />
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
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform hover:scale-110',
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-5 w-5 rounded-full border" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted-foreground">{ECOMMERCE_COLORS.find(c => c.value === color)?.label || color}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button size="sm" variant="cta" onClick={handleCreate} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Crear fecha
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ idea, onStatusChange }: { idea: SocialIdea; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const stConfig = STATUS_CONFIG[idea.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <button type="button" className={cn('flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium shrink-0 transition-colors hover:opacity-80', stConfig.colorClass)} onClick={(e) => e.stopPropagation()} />
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

// ─── Draggable pill ───────────────────────────────────────────────────────────

function DraggableIdeaPill({ idea, onClick, onStatusChange }: { idea: SocialIdea; onClick: () => void; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id, data: { idea } });
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';
  const style = transform ? { transform: CSS.Translate.toString(transform), zIndex: 50 } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer transition-opacity max-w-full truncate relative',
        isPublished ? 'bg-green-500/15 border-green-400/40 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass],
        isDragging && 'opacity-50 shadow-lg',
      )}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="h-3 w-3 opacity-40" />
      </span>
      {isPublished ? <Check className="h-3 w-3 shrink-0 text-green-500" strokeWidth={3} /> : <PtIcon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{idea.title}</span>
      <StatusDropdown idea={idea} onStatusChange={onStatusChange} />
    </div>
  );
}

// ─── Ecommerce bands (inside day cell) ───────────────────────────────────────

function EcommerceBands({ date, ecommerceDates }: { date: string; ecommerceDates: EcommerceDate[] }) {
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-col gap-px mb-1">
      {active.map(ed => (
        <div
          key={ed.id}
          style={{ backgroundColor: ed.color + '22', borderLeft: `2px solid ${ed.color}`, color: ed.color }}
          className="text-[9px] font-bold px-1 py-px rounded-r-sm truncate leading-tight"
        >
          {ed.start_date === date ? ed.name : ' '}
        </div>
      ))}
    </div>
  );
}

// ─── Droppable day ────────────────────────────────────────────────────────────

function DroppableDay({ date, ideas, isToday, ecommerceDates, onIdeaClick, onAddClick, onStatusChange }: {
  date: string; ideas: SocialIdea[]; isToday: boolean; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
  onStatusChange: (id: string, status: IdeaStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = new Date(date + 'T12:00:00').getDate();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[100px] rounded-lg border p-1.5 transition-colors relative group',
        isToday && 'border-primary/50 bg-primary/5',
        isOver && 'border-primary bg-primary/10',
        !isToday && ideas.length === 0 && 'border-border/20 hover:border-border/40',
        !isToday && ideas.length > 0 && 'border-border/30',
      )}
    >
      <EcommerceBands date={date} ecommerceDates={ecommerceDates} />
      <span className={cn('text-xs font-medium block mb-1 pl-0.5', isToday ? 'text-primary font-bold' : 'text-muted-foreground/60')}>
        {day}
      </span>
      <div className="space-y-1">
        {ideas.map(idea => (
          <DraggableIdeaPill key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} onStatusChange={onStatusChange} />
        ))}
      </div>
      <button
        type="button"
        className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-md bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-primary/20"
        onClick={(e) => { e.stopPropagation(); onAddClick(date); }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Vertical day row (mobile) ────────────────────────────────────────────────

function VerticalDayRow({ date, dayName, ideas, isToday, ecommerceDates, onIdeaClick, onAddClick, onStatusChange }: {
  date: string; dayName: string; ideas: SocialIdea[]; isToday: boolean; ecommerceDates: EcommerceDate[];
  onIdeaClick: (idea: SocialIdea) => void; onAddClick: (date: string) => void;
  onStatusChange: (id: string, status: IdeaStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = new Date(date + 'T12:00:00').getDate();
  const active = ecommerceDates.filter(ed => date >= ed.start_date && date <= ed.end_date);

  return (
    <div ref={setNodeRef} className={cn('rounded-xl border p-3 transition-colors', isToday ? 'border-primary/60 bg-primary/5' : 'border-border/40', isOver && 'border-primary bg-primary/10')}>
      {active.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {active.map(ed => (
            <span key={ed.id} style={{ backgroundColor: ed.color + '22', borderLeft: `2px solid ${ed.color}`, color: ed.color }} className="text-[9px] font-bold px-1.5 py-px rounded-r-sm">
              {ed.name}
            </span>
          ))}
        </div>
      )}
      <button type="button" onClick={() => onAddClick(date)} className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold', isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
            {day}
          </span>
          <div className="text-left">
            <span className={cn('block text-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>{dayName}</span>
            <span className="block text-xs text-muted-foreground">{ideas.length} pieza{ideas.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary opacity-60 hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4" />
        </span>
      </button>
      {ideas.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {ideas.map(idea => <DraggableIdeaPill key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} onStatusChange={onStatusChange} />)}
        </div>
      )}
    </div>
  );
}

function DragOverlayPill({ idea }: { idea: SocialIdea }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';
  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold shadow-xl max-w-[140px] truncate', isPublished ? 'bg-green-500/15 border-green-400/40 text-green-600' : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass])}>
      {isPublished ? <Check className="h-3 w-3 shrink-0 text-green-500" strokeWidth={3} /> : <PtIcon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{idea.title}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdsCalendarProps {
  clientId: string;
  clientName: string;
}

export function AdsCalendar({ clientId, clientName: _clientName }: AdsCalendarProps) {
  const { user } = useAuthStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { ideas, loading, createIdea, updateIdea, deleteIdea, patchIdea } = useAdsIdeas(clientId, monthStr);
  const internalUsers = useInternalUsers();
  const { dates: ecommerceDates, createDate, deleteDate } = useEcommerceDates(clientId, monthStr);

  const [showNewIdea, setShowNewIdea] = useState(false);
  const [showNewEcomDate, setShowNewEcomDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setShareLoading(true);
    fetch('/api/calendar-links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, calendar_type: 'ads', month: monthStr }),
    })
      .then(r => r.json())
      .then(json => setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] }))
      .catch(() => {})
      .finally(() => setShareLoading(false));
  }, [clientId, monthStr]);

  const syncIdea = useCallback((updated: SocialIdea) => {
    setSelectedIdea(updated);
    patchIdea(updated);
  }, [patchIdea]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }, [viewMonth]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const ideasByDate = useMemo(() => {
    const map = new Map<string, SocialIdea[]>();
    for (const idea of ideas) {
      const existing = map.get(idea.publish_date) || [];
      existing.push(idea);
      map.set(idea.publish_date, existing);
    }
    return map;
  }, [ideas]);

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
    if (idea && idea.publish_date !== newDate) {
      await updateIdea(idea.id, { publish_date: newDate });
    }
  }, [updateIdea]);

  const handleDayClick = useCallback((date: string) => {
    setSelectedDate(date);
    setShowNewIdea(true);
  }, []);

  const handleStatusChange = useCallback(async (id: string, status: IdeaStatus) => {
    await updateIdea(id, { status });
  }, [updateIdea]);

  const stats = useMemo(() => {
    const total = ideas.length;
    const byStatus = new Map<string, number>();
    for (const idea of ideas) byStatus.set(idea.status, (byStatus.get(idea.status) || 0) + 1);
    return { total, byStatus };
  }, [ideas]);

  const shareUrl = shareConfig?.token && typeof window !== 'undefined' ? `${window.location.origin}/c/${shareConfig.token}?type=ads` : '';
  const canManageShare = user?.role === 'admin' || user?.role === 'operador';

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Cargando calendario ADS...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold min-w-[160px] text-center">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {canManageShare && shareConfig?.token && (
              <>
                <CalendarGuestAccessDialog clientId={clientId} calendarType="ads" month={monthStr} config={shareConfig} onConfigChange={setShareConfig} />
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? '¡Copiado!' : 'Compartir'}
                </Button>
                <a href={`/c/${shareConfig.token}?type=ads`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Ver landing
                </a>
              </>
            )}
            {canManageShare && !shareConfig?.token && !shareLoading && (
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/calendar-links', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ client_id: clientId, calendar_type: 'ads', month: monthStr }),
                    });
                    if (res.ok) {
                      const json = await res.json();
                      setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] });
                    }
                  } catch { /* ignore */ }
                }}>
                <Share className="h-3.5 w-3.5" /> Generar link
              </Button>
            )}
            <Button onClick={() => setShowNewEcomDate(true)} variant="outline" size="sm" className="gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" /> Fecha Ecommerce
            </Button>
            <Button onClick={() => { setSelectedDate(null); setShowNewIdea(true); }} variant="cta" size="cta" className="gap-2">
              <Plus className="h-4 w-4" /> Nueva Pieza
            </Button>
          </div>
        </div>

        {canManageShare && shareConfig?.token && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-3 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">Link único para compartir con cliente</p>
                <p className="text-xs text-muted-foreground">Este link abre el calendario fuera de la app para ver, comentar y modificar según permisos.</p>
              </div>
              <Input value={shareUrl} readOnly className="h-9 min-w-0 md:max-w-md" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ecommerce dates legend */}
        {ecommerceDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ecommerceDates.map(ed => (
              <div
                key={ed.id}
                style={{ backgroundColor: ed.color + '18', borderColor: ed.color + '60', color: ed.color }}
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold"
              >
                <ShoppingBag className="h-3 w-3" />
                <span>{ed.name}</span>
                <span className="text-[10px] opacity-70">{ed.start_date} → {ed.end_date}</span>
                <button
                  type="button"
                  onClick={() => deleteDate(ed.id)}
                  className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{stats.total} pieza{stats.total !== 1 ? 's' : ''}</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stats.byStatus.get(key) || 0;
            if (count === 0) return null;
            return (
              <span key={key} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} /> {count} {cfg.label.toLowerCase()}
              </span>
            );
          })}
        </div>

        {/* Post type legend */}
        <div className="flex items-center gap-4 text-xs">
          {Object.entries(POST_TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <span key={key} className={cn('flex items-center gap-1.5 font-medium', cfg.colorClass)}>
                <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dotColor)} />
                <Icon className="h-3.5 w-3.5" /> {cfg.label}
              </span>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {/* Day names */}
              <div className="hidden md:grid grid-cols-7 gap-1.5 mb-1.5">
                {dayNames.map(n => (
                  <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{n}</div>
                ))}
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                  const dayIdeas = ideasByDate.get(dateStr) || [];
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                  return (
                    <DroppableDay
                      key={dateStr}
                      date={dateStr}
                      ideas={dayIdeas}
                      isToday={isToday}
                      ecommerceDates={ecommerceDates}
                      onIdeaClick={setSelectedIdea}
                      onAddClick={handleDayClick}
                      onStatusChange={handleStatusChange}
                    />
                  );
                })}
              </div>

              {/* Mobile vertical list */}
              <div className="md:hidden flex flex-col gap-2">
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                  const dayIdeas = ideasByDate.get(dateStr) || [];
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                  const dateObj = new Date(viewYear, viewMonth, day);
                  return (
                    <VerticalDayRow
                      key={dateStr}
                      date={dateStr}
                      dayName={dayNames[dateObj.getDay()]}
                      ideas={dayIdeas}
                      isToday={isToday}
                      ecommerceDates={ecommerceDates}
                      onIdeaClick={setSelectedIdea}
                      onAddClick={handleDayClick}
                      onStatusChange={handleStatusChange}
                    />
                  );
                })}
              </div>

              <DragOverlay>
                {activeIdea ? <DragOverlayPill idea={activeIdea} /> : null}
              </DragOverlay>
            </DndContext>
          </CardContent>
        </Card>

        {/* Idea cards */}
        {ideas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Piezas del mes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...ideas]
                .filter(i => i.publish_date.startsWith(monthStr))
                .sort((a, b) => a.publish_date.localeCompare(b.publish_date))
                .map(idea => (
                  <SocialIdeaCard key={idea.id} idea={idea} attachments={[]} onClick={() => setSelectedIdea(idea)} onStatusChange={handleStatusChange} />
                ))}
            </div>
          </div>
        )}
      </div>

      <SocialNewIdeaDialog
        open={showNewIdea}
        onOpenChange={setShowNewIdea}
        initialDate={selectedDate}
        onCreateIdea={createIdea}
        users={internalUsers}
        calendarType="ads"
      />

      <EcommerceDateDialog
        open={showNewEcomDate}
        onOpenChange={setShowNewEcomDate}
        onCreate={createDate}
      />

      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}
          onIdeaUpdated={(updated) => syncIdea(updated)}
          onIdeaDeleted={() => { deleteIdea(selectedIdea!.id); setSelectedIdea(null); }}
          users={internalUsers}
          calendarType="ads"
        />
      )}
    </>
  );
}
