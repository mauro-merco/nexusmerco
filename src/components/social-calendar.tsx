'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { SocialNewIdeaDialog } from '@/components/social-new-idea-dialog';
import { SocialIdeaModal } from '@/components/social-idea-modal';
import { SocialIdeaCard } from '@/components/social-idea-card';
import type { SocialIdea, IdeaStatus } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { ChevronLeft, ChevronRight, Plus, Calendar, Loader2, GripVertical, Check, ChevronDown, Copy, Share, RefreshCw } from 'lucide-react';

const STATUS_ORDER: IdeaStatus[] = ['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'];

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
        'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer transition-opacity max-w-full truncate relative',
        isPublished
          ? 'bg-green-500/15 border-green-400/40 text-green-600'
          : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass],
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
        'min-h-[100px] rounded-lg border p-1.5 transition-colors relative group',
        isToday && 'border-primary/50 bg-primary/5',
        isOver && 'border-primary bg-primary/10',
        !isToday && ideas.length === 0 && 'border-border/20 hover:border-border/40',
        !isToday && ideas.length > 0 && 'border-border/30',
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
        className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-md bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-primary/20"
        onClick={(e) => { e.stopPropagation(); onAddClick(date); }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function DragOverlayPill({ idea }: { idea: SocialIdea }) {
  const ptConfig = POST_TYPE_CONFIG[idea.post_type];
  const PtIcon = ptConfig.icon;
  const isPublished = idea.status === 'posteado';
  return (
    <div className={cn(
      'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold shadow-xl max-w-[140px] truncate',
      isPublished
        ? 'bg-green-500/15 border-green-400/40 text-green-600'
        : [ptConfig.bgColorClass, ptConfig.colorClass, ptConfig.borderColorClass],
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
}

export function SocialCalendar({ clientId, clientName }: SocialCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const { ideas, loading, createIdea, updateIdea, deleteIdea, patchIdea } = useSocialIdeas(clientId, monthStr);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<SocialIdea | null>(null);
  const [activeIdea, setActiveIdea] = useState<SocialIdea | null>(null);
  const [attachmentsByIdea, setAttachmentsByIdea] = useState<Record<string, { url: string }[]>>({});

  const syncIdea = useCallback((updated: SocialIdea) => {
    setSelectedIdea(updated);
    patchIdea(updated);
  }, [patchIdea]);

  // Fetch client share token
  const fetchShareToken = useCallback(async () => {
    if (!clientId) return;
    setShareLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setShareToken(json.data?.share_token || null);
      }
    } catch {
      // ignore
    } finally {
      setShareLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchShareToken();
  }, [fetchShareToken]);

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

  if (loading) {
    return (
      <Card>
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
          <Button onClick={() => { setSelectedDate(null); setShowNewIdea(true); }} variant="cta" size="cta" className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Idea
          </Button>

          {shareToken && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  const link = `${window.location.origin}/c/${shareToken}`;
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? '¡Copiado!' : 'Compartir calendario'}
              </Button>
              <a
                href={`/c/${shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Share className="h-3.5 w-3.5 mr-1" /> Ver landing
              </a>
            </div>
          )}

          {!shareToken && !shareLoading && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                // This will trigger the auto-migration to generate the share_token
                // We need to ensure the token exists
                try {
                  const res = await fetch(`/api/clients/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ share_token: crypto.randomUUID() }),
                  });
                  if (res.ok) {
                    const json = await res.json();
                    setShareToken(json.data?.share_token);
                  }
                } catch {
                  // ignore
                }
              }}
            >
              <Share className="h-3.5 w-3.5" /> Generar link
            </Button>
          )}
        </div>

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
        <Card>
          <CardContent className="p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Day names */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {dayNames.map(n => (
                  <div key={n} className="text-center text-xs font-semibold text-muted-foreground py-1.5">{n}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1.5">
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
      />

      {/* Idea Detail Modal */}
      {selectedIdea && (
        <SocialIdeaModal
          idea={selectedIdea}
          open={!!selectedIdea}
          onOpenChange={(open) => { if (!open) setSelectedIdea(null); }}
          onIdeaUpdated={(updated) => {
            syncIdea(updated);
          }}
          onIdeaDeleted={() => {
            deleteIdea(selectedIdea!.id);
            setSelectedIdea(null);
          }}
        />
      )}
    </>
  );
}
