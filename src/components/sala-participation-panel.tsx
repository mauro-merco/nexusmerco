'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSalaParticipation } from '@/lib/hooks/use-salas';
import { SALA_ACTION_CONFIG } from '@/lib/sala-config';
import type { SalaParticipationAction } from '@/lib/types';
import {
  Activity,
  ChevronDown,
  Eye,
  Heart,
  Inbox,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Users,
} from 'lucide-react';

function formatAt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function actionIcon(action: SalaParticipationAction) {
  switch (action) {
    case 'bulletin_published':
      return Megaphone;
    case 'reaction_added':
    case 'reaction_removed':
      return Heart;
    case 'message_viewed':
      return Eye;
    case 'joined':
    case 'left':
    case 'room_created':
      return Users;
    default:
      return MessageSquare;
  }
}

interface SalaParticipationPanelProps {
  userId: string;
  salaId?: string | null;
  title?: string;
  compact?: boolean;
  days?: number;
  className?: string;
}

export function SalaParticipationPanel({
  userId,
  salaId,
  title = 'Participación en las salas',
  compact = false,
  days = 0,
  className,
}: SalaParticipationPanelProps) {
  const { data, loading, error, refresh } = useSalaParticipation(userId, days, salaId);
  const [showAll, setShowAll] = useState(false);

  const stats = data?.stats;
  const events = data?.events || [];
  const visibleEvents = useMemo(
    () => (compact && !showAll ? events.slice(0, 6) : events.slice(0, 60)),
    [events, compact, showAll]
  );

  const cards = [
    { key: 'messages', label: 'Mensajes', value: stats?.messages || 0, icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'replies', label: 'Respuestas', value: stats?.replies || 0, icon: MessageSquare, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { key: 'bulletins', label: 'Boletines', value: stats?.bulletins || 0, icon: Megaphone, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'reactions', label: 'Reacciones', value: stats?.reactions || 0, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { key: 'views', label: 'Vistos', value: stats?.views || 0, icon: Eye, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { key: 'rooms', label: 'Salas', value: stats?.rooms || 0, icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-tech flex h-8 w-8 items-center justify-center rounded-xl">
            <Activity className="h-4 w-4 text-white" />
          </span>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[10px] text-muted-foreground">
              {stats?.total || 0} interacciones registradas
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map(({ key, label, value, icon: Icon, color, bg }) => (
          <div key={key} className="flex items-center gap-2.5 rounded-xl border bg-card p-3">
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', bg, color)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-none">{value}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {!compact && (data?.rooms?.length || 0) > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Salas con más actividad</p>
          <div className="space-y-1.5">
            {(data?.rooms || []).slice(0, 6).map((room) => (
              <div key={`${room.sala_id || room.sala_name}`} className="flex items-center justify-between gap-2 rounded-lg border bg-card/60 px-3 py-2">
                <p className="min-w-0 truncate text-xs font-semibold">{room.sala_name}</p>
                <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
                  {room.messages > 0 && <span title="Mensajes">💬 {room.messages}</span>}
                  {room.replies > 0 && <span title="Respuestas">↩ {room.replies}</span>}
                  {room.bulletins > 0 && <span title="Boletines">📣 {room.bulletins}</span>}
                  {room.reactions > 0 && <span title="Reacciones">❤️ {room.reactions}</span>}
                  {room.views > 0 && <span title="Vistos">👁 {room.views}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Últimas interacciones</p>
        {loading && events.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Cargando participación…</p>
        )}
        {!loading && visibleEvents.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-8 text-center text-muted-foreground">
            <Inbox className="h-7 w-7 opacity-40" />
            <p className="text-xs">Todavía no participó en las salas</p>
          </div>
        )}
        <div className="space-y-1.5">
          {visibleEvents.map((event) => {
            const cfg = SALA_ACTION_CONFIG[event.action as SalaParticipationAction];
            const Icon = actionIcon(event.action as SalaParticipationAction);
            return (
              <div key={event.id} className="flex items-start gap-2.5 rounded-lg border bg-card/60 px-3 py-2">
                <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg?.bgColorClass || 'bg-muted', cfg?.colorClass || 'text-muted-foreground')}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs">
                    <span className="font-semibold">{cfg?.label || event.action}</span>
                    {event.emoji && <span className="ml-1 text-sm">{event.emoji}</span>}
                    {event.sala_name && <span className="text-muted-foreground"> · {event.sala_name}</span>}
                  </p>
                  {event.detail && <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{event.detail}</p>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground/80">{formatAt(event.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
        {compact && events.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll(v => !v)}
            className="flex w-full items-center justify-center gap-1 rounded-lg border py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {showAll ? 'Ver menos' : `Ver todas (${events.length})`}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
          </button>
        )}
      </div>
    </div>
  );
}
