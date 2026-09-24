'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useSocialIdeas } from '@/lib/hooks/use-social-ideas';
import { useInternalUsers } from '@/lib/hooks/use-internal-users';
import { useAuthStore } from '@/store/auth-store';
import { SocialNewIdeaDialog } from '@/components/social-new-idea-dialog';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { SocialIdeaCard } from '@/components/social-idea-card';
import { CalendarGuestAccessDialog } from '@/components/calendar-guest-access-dialog';
import type { SocialIdea, IdeaStatus } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { ChevronLeft, ChevronRight, Plus, Loader2, GripVertical, Check, ChevronDown, Copy, Share } from 'lucide-react';

const STATUS_ORDER: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];
type ShareConfig = { token: string | null; allowed_client_id?: string; guest_enabled: boolean; allowed_user_ids: string[] };

function StatusDropdown({ idea, onStatusChange }: { idea: SocialIdea; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const stConfig = STATUS_CONFIG[idea.status];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              'flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9px] font-medium shrink-0 transition-colors hover:opacity-80',
              stConfig.colorClass,
            )}
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <span className="truncate max-w-[60px]">{stConfig.label}</span>
        <ChevronDown className="h-2.5 w-2.5 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={4}>
        <DropdownMenuRadioGroup
          value={idea.status}
          onValueChange={(val) => onStatusChange(idea.id, val as IdeaStatus)}
        >
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

function DraggableIdeaPill({ idea, onClick, onStatusChange }: { idea: SocialIdea; onClick: () => void; onStatusChange: (id: string, status: IdeaStatus) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: idea.id,
    data: { idea },
  });

  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: 50,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer transition-opacity max-w-full truncate relative',
        isPublished
          ? 'bg-green-500/15 text-green-600'
          : [ptConfig.bgColorClass, ptConfig.colorClass],
        isDragging && 'opacity-50 shadow-lg',
      )}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <span {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing shrink-0">
        <GripVertical className="h-3 w-3 opacity-40" />
      </span>
      {isPublished ? (
        <Check className="h-3 w-3 shrink-0 text-green-500" strokeWidth={3} />
      ) : (
        <PtIcon className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{idea.title}</span>
      <StatusDropdown idea={idea} onStatusChange={onStatusChange} />
    </div>
  );
}

function DroppableDay({ date, ideas, isToday, onIdeaClick, onAddClick, onStatusChange }: {
  date: string;
  ideas: SocialIdea[];
  isToday: boolean;
  onIdeaClick: (idea: SocialIdea) => void;
  onAddClick: (date: string) => void;
  onStatusChange: (id: string, status: IdeaStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = new Date(date + 'T12:00:00').getDate();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[100px] rounded-xl p-1.5 transition-colors relative group',
        isToday && 'bg-primary/8',
        isOver && 'bg-primary/15',
        !isToday && !isOver && 'bg-muted/25 hover:bg-muted/45',
      )}
    >
      <span className={cn(
        'text-xs font-medium block mb-1 pl-0.5',
        isToday ? 'text-primary font-bold' : 'text-muted-foreground/60',
      )}>
        {day}
      </span>
      <div className="space-y-1">
        {ideas.map(idea => (
          <DraggableIdeaPill key={idea.id} idea={idea} onClick={() => onIdeaClick(idea)} onStatusChange={onStatusChange} />
        ))}
      </div>
      <button
        type="button"
        className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20"
        onClick={(e) => { e.stopPropagation(); onAddClick(date); }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function VerticalDayRow({ date, dayName, ideas, isToday, onIdeaClick, onAddClick, onStatusChange }: {
  date: string;
  dayName: string;
  ideas: SocialIdea[];
  isToday: boolean;
  onIdeaClick: (idea: SocialIdea) => void;
  onAddClick: (date: string) => void;
  onStatusChange: (id: string, status: IdeaStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  const day = new Date(date + 'T12:00:00').getDate();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl p-3 transition-colors',
        isToday ? 'bg-primary/8' : 'bg-muted/25',
        isOver && 'bg-primary/15',
      )}
    >
      <button
        type="button"
        onClick={() => onAddClick(date)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-3">
          <span className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold',
            isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          )}>
            {day}
          </span>
          <div className="text-left">
            <span className={cn('block text-sm font-semibold', isToday ? 'text-primary' : 'text-foreground')}>
              {dayName}
            </span>
            <span className="block text-xs text-muted-foreground">
              {ideas.length} idea{ideas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary opacity-60 hover:opacity-100 transition-opacity">
          <Plus className="h-4 w-4" />
        </span>
      </button>

      {ideas.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {ideas.map(idea => (
            <DraggableIdeaPill
              key={idea.id}
              idea={idea}
              onClick={() => onIdeaClick(idea)}
              onStatusChange={onStatusChange}
            />
          ))}
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
    <div className={cn(
      'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold shadow-xl max-w-[140px] truncate',
      isPublished
        ? 'bg-green-500/15 text-green-600'
        : [ptConfig.bgColorClass, ptConfig.colorClass],
    )}>
      {isPublished ? (
        <Check className="h-3 w-3 shrink-0 text-green-500" strokeWidth={3} />
      ) : (
        <PtIcon className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">{idea.title}</span>
    </div>
  );
}

interface SocialCalendarProps {
  clientId: string;
  clientName: string;
  initialMonth?: string | null;
  initialIdeaId?: string | null;
}

export function SocialCalendar({ clientId, clientName, initialMonth, initialIdeaId }: SocialCalendarProps) {
  const { user } = useAuthStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(initialMonth ? Number(initialMonth.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth ? Number(initialMonth.split('-')[1]) - 1 : today.getMonth());
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { ideas, loading, createIdea, updateIdea, deleteIdea, patchIdea } = useSocialIdeas(clientId, monthStr);
  const internalUsers = useInternalUsers();
  const [shareConfig, setShareConfig] = useState<ShareConfig | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [dismissedIdeaId, setDismissedIdeaId] = useState<string | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const [attachmentsByIdea, setAttachmentsByIdea] = useState<Record<string, { url: string }[]>>({});

  const syncIdea = useCallback((updated: SocialIdea) => {
    setSelectedIdea(updated);
    patchIdea(updated);
  }, [patchIdea]);

  // Fetch/create share token for the visible month
  const fetchShareToken = useCallback(async () => {
    if (!clientId) return;
    setShareLoading(true);
    setShareError('');
    try {
      const res = await fetch('/api/calendar-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, calendar_type: 'social', month: monthStr }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo generar el link');
      setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] });
    } catch (err) {
      setShareError(err instanceof Error ? err.message : 'No se pudo generar el link');
    } finally {
      setShareLoading(false);
    }
  }, [clientId, monthStr]);

  useEffect(() => {
    fetchShareToken();
  }, [fetchShareToken]);

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
    const stillVisible = ideas.some(idea => idea.id === selectedIdea.id);
    if (!stillVisible) setSelectedIdea(null);
  }, [ideas, selectedIdea]);

  useEffect(() => {
    if (ideas.length === 0) { setAttachmentsByIdea({}); return; }
    const ids = ideas.map(i => i.id).join(',');
    fetch(`/api/social-attachments?idea_ids=${ids}`)
      .then(r => r.json())
      .then(json => {
        const map: Record<string, { url: string }[]> = {};
        for (const att of json.data || []) {
          if (!map[att.idea_id]) map[att.idea_id] = [];
          map[att.idea_id].push(att);
        }
        setAttachmentsByIdea(map);
      })
      .catch(() => {});
  }, [ideas]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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
    for (const idea of ideas) {
      byStatus.set(idea.status, (byStatus.get(idea.status) || 0) + 1);
    }
    return { total, byStatus };
  }, [ideas]);

  const shareUrl = shareConfig?.token && typeof window !== 'undefined' ? `${window.location.origin}/c/${shareConfig.token}` : '';
  const canManageShare = user?.role === 'admin' || user?.role === 'operador';

  const closeSelectedIdea = useCallback(() => {
    if (selectedIdea) setDismissedIdeaId(selectedIdea.id);
    setSelectedIdea(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('idea')) {
        url.searchParams.delete('idea');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
  }, [selectedIdea]);

  if (loading) {
    return (
      <Card className="border-0 ring-0 shadow-none rounded-3xl">
        <CardContent className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">Cargando calendario...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
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
          </div>
          <Button onClick={() => { setSelectedDate(null); setShowNewIdea(true); }} variant="default" size="cta" className="gap-2 rounded-xl">
            <Plus className="h-4 w-4" /> Nueva Idea
          </Button>

          {canManageShare && shareConfig?.token && (
            <div className="flex items-center gap-2">
              <CalendarGuestAccessDialog clientId={clientId} calendarType="social" month={monthStr} config={shareConfig} onConfigChange={setShareConfig} />
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '¡Copiado!' : 'Compartir calendario'}
              </Button>
              <a
                href={`/c/${shareConfig.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Share className="h-3.5 w-3.5 mr-1" /> Ver landing
              </a>
            </div>
          )}

          {canManageShare && !shareConfig?.token && !shareLoading && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={async () => {
                setShareLoading(true);
                setShareError('');
                try {
                  const res = await fetch('/api/calendar-links', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client_id: clientId, calendar_type: 'social', month: monthStr }),
                  });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error || 'No se pudo generar el link');
                  setShareConfig({ token: json.data?.token || null, allowed_client_id: json.data?.allowed_client_id, guest_enabled: !!json.data?.guest_enabled, allowed_user_ids: json.data?.allowed_user_ids || [] });
                } catch (err) {
                  setShareError(err instanceof Error ? err.message : 'No se pudo generar el link');
                } finally {
                  setShareLoading(false);
                }
              }}
            >
              {shareLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share className="h-3.5 w-3.5" />} Generar link
            </Button>
          )}
        </div>

        {canManageShare && shareError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{shareError}</p>
        )}

        {canManageShare && shareConfig?.token && (
          <Card className="border-0 ring-0 shadow-none bg-accent rounded-2xl">
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wide text-accent-foreground">Link único para compartir con cliente</p>
                <p className="text-xs text-accent-foreground/70">Este link abre el calendario fuera de la app para ver, comentar y modificar según permisos.</p>
              </div>
              <Input value={shareUrl} readOnly className="h-9 min-w-0 md:max-w-md bg-background rounded-lg" onFocus={(e) => e.currentTarget.select()} />
              <Button variant="secondary" size="sm" className="gap-1.5 rounded-lg shrink-0" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copiado' : 'Copiar link'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{stats.total} idea{stats.total !== 1 ? 's' : ''}</span>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stats.byStatus.get(key) || 0;
            if (count === 0) return null;
            return (
              <span key={key} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', cfg.dotColor)} /> {count} {cfg.label.toLowerCase()}{count !== 1 ? 's' : ''}
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
        <Card className="border-0 ring-0 shadow-none rounded-3xl">
          <CardContent className="p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Day names */}
              <div className="hidden md:grid grid-cols-7 gap-1.5 mb-1.5">
                {dayNames.map(n => (
                  <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{n}</div>
                ))}
              </div>

              {/* Days grid - desktop */}
              <div className="hidden md:grid grid-cols-7 gap-1.5">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
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
                      onIdeaClick={setSelectedIdea}
                      onAddClick={handleDayClick}
                      onStatusChange={handleStatusChange}
                    />
                  );
                })}
              </div>

              {/* Vertical list - mobile */}
              <div className="md:hidden flex flex-col gap-2">
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
                  const dayIdeas = ideasByDate.get(dateStr) || [];
                  const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                  const dateObj = new Date(viewYear, viewMonth, day);
                  const dayName = dayNames[dateObj.getDay()];

                  return (
                    <VerticalDayRow
                      key={dateStr}
                      date={dateStr}
                      dayName={dayName}
                      ideas={dayIdeas}
                      isToday={isToday}
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

        {/* Idea Cards */}
        {ideas.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Ideas del mes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...ideas]
                .filter(i => i.publish_date.startsWith(monthStr))
                .sort((a, b) => a.publish_date.localeCompare(b.publish_date))
                .map(idea => (
                  <SocialIdeaCard key={idea.id} idea={idea} attachments={attachmentsByIdea[idea.id] || []} onClick={() => setSelectedIdea(idea)} onStatusChange={handleStatusChange} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* New Idea Dialog */}
      <SocialNewIdeaDialog
        open={showNewIdea}
        onOpenChange={setShowNewIdea}
        initialDate={selectedDate}
        onCreateIdea={createIdea}
        users={internalUsers}
        calendarType="social"
      />

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) closeSelectedIdea(); }}
          onIdeaUpdated={(updated) => {
            syncIdea(updated);
          }}
          onIdeaDeleted={() => {
            deleteIdea(selectedIdea!.id);
            setSelectedIdea(null);
          }}
          users={internalUsers}
          calendarType="social"
        />
      )}
    </>
  );
}
