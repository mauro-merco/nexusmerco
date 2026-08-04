'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { Notification } from '@/lib/types';
import {
  Bell, UserPlus, AtSign, FileText, AlarmClock, CheckCircle2, Info,
  ExternalLink, Trash2, RotateCcw, Loader2, CheckCheck, Inbox, Archive,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  task_assigned: { icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-400/10', label: 'Tarea asignada' },
  mention: { icon: AtSign, color: 'text-violet-400', bg: 'bg-violet-400/10', label: 'Mención' },
  document_shared: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Documento compartido' },
  reminder: { icon: AlarmClock, color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Recordatorio' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Tarea completada' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/60', label: 'Notificación' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLeft(deletedAt: string) {
  const expires = new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { notifications, unreadCount, loading, refetch, markAsRead, markAllRead, softDelete, restore } =
    useNotifications(user?.id || null);

  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [deleted, setDeleted] = useState<Notification[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  const fetchDeleted = useCallback(async () => {
    if (!user?.id) return;
    setDeletedLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${user.id}&view=deleted`);
      const json = await res.json();
      setDeleted(json.data || []);
    } catch { /* */ } finally { setDeletedLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const open = useCallback((n: Notification) => {
    markAsRead([n.id]);
    const link = n.link || (n.task_id ? '/operations?task=' + n.task_id : null);
    if (link) router.push(link);
  }, [markAsRead, router]);

  const handleDelete = async (id: string) => {
    await softDelete([id]);
    await fetchDeleted();
  };

  const handleRestore = async (id: string) => {
    await restore([id]);
    await fetchDeleted();
    refetch();
  };

  const renderList = (items: Notification[], opts: { deleted?: boolean } = {}) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          {opts.deleted ? <Archive className="h-12 w-12 opacity-40" /> : <Inbox className="h-12 w-12 opacity-40" />}
          <p className="text-base font-medium">
            {opts.deleted ? 'No hay notificaciones eliminadas' : 'No hay notificaciones'}
          </p>
          {opts.deleted && (
            <p className="text-sm text-muted-foreground/70 max-w-sm text-center">
              Las notificaciones eliminadas se guardan aquí durante 30 días y luego se borran solas.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((n) => {
          const cfg = getConfig(n.type);
          const Icon = cfg.icon;
          return (
            <Card
              key={n.id}
              className={cn(
                'group transition-all duration-300',
                opts.deleted ? 'opacity-60' : !n.read && 'border-primary/30 bg-gradient-tech-soft',
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', cfg.bg, cfg.color)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('text-sm', n.read ? 'font-medium' : 'font-bold')}>{n.title}</p>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                      {cfg.label}
                    </span>
                    {!n.read && !opts.deleted && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
                    <span>{timeAgo(n.created_at)}</span>
                    {opts.deleted && n.deleted_at && (
                      <span className="text-amber-500/90 font-medium">
                        Se elimina en {daysLeft(n.deleted_at)} día{daysLeft(n.deleted_at) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                  {!opts.deleted ? (
                    <>
                      {n.link || n.task_id ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => open(n)}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => markAsRead([n.id])}
                        >
                          Marcar leída
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        onClick={() => handleDelete(n.id)}
                        title="Mover a eliminadas"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                      onClick={() => handleRestore(n.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-gradient-tech text-2xl md:text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Todas tus notificaciones. Las eliminadas se borran solas después de 30 días.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" className="gap-2 shrink-0">
            <CheckCheck className="h-4 w-4" /> Marcar todas leídas ({unreadCount})
          </Button>
        )}
      </div>

      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setTab('active')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            tab === 'active' ? 'bg-gradient-tech text-white shadow-md' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Bell className="h-4 w-4" /> Activas
          {notifications.length > 0 && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', tab === 'active' ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>
              {notifications.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('deleted')}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            tab === 'deleted' ? 'bg-gradient-tech text-white shadow-md' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Archive className="h-4 w-4" /> Eliminadas
          {deleted.length > 0 && (
            <span className={cn('rounded-full px-1.5 text-[10px] font-bold', tab === 'deleted' ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>
              {deleted.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'deleted' && (
        <p className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5" />
          Estas notificaciones no se pueden eliminar permanentemente: se borran automáticamente a los 30 días.
        </p>
      )}

      {tab === 'active' ? (
        loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          renderList(notifications)
        )
      ) : deletedLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        renderList(deleted, { deleted: true })
      )}
    </div>
  );
}
