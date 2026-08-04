'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { useAuthStore } from '@/store/auth-store';
import {
  Bell, CheckCheck, Loader2, ExternalLink, UserPlus, AtSign, FileText, AlarmClock, CheckCircle2, Info, ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/types';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  task_assigned: { icon: UserPlus, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  mention: { icon: AtSign, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  document_shared: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  reminder: { icon: AlarmClock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
};

export function NotificationBell() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { notifications, unreadCount, loading, refetch, markAsRead, markAllRead } = useNotifications(user?.id || null);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => { refetch(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, refetch]);

  useEffect(() => {
    if (unreadCount > 0) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 1200);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  const handleClick = (notif: Notification) => {
    markAsRead([notif.id]);
    const link = notif.link || (notif.task_id ? '/operations' : null);
    if (link) router.push(link);
    setOpen(false);
  };

  const getConfig = (type: string) => TYPE_CONFIG[type] || { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted/60' };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn('group relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-all', open && 'bg-muted/60')}
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
      >
        <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-30" />
        <span key={ringing ? 'ring' : 'idle'} className={cn('relative', ringing && 'animate-[bell-ring_0.9s_ease-in-out]')}>
          <Bell className={cn('h-4.5 w-4.5 transition-colors', unreadCount > 0 ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-gradient-tech text-[9px] font-bold text-white flex items-center justify-center px-1 animate-[pulse-ring_1.5s_ease-out_infinite]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[440px] overflow-hidden rounded-xl border bg-popover shadow-xl z-50 flex flex-col animate-[transition-fade_0.2s_ease-out]">
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gradient-to-r from-primary/10 to-transparent">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-primary" /> Notificaciones
              </span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="h-3 w-3" /> Marcar todas leídas
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Sin notificaciones
                </div>
              )}
              {notifications.map(n => {
                const cfg = getConfig(n.type);
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/50 transition-colors flex items-start gap-2.5',
                      !n.read && 'bg-gradient-tech-soft',
                    )}
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5', cfg.bg, cfg.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-xs', n.read ? 'font-medium text-muted-foreground' : 'font-semibold')}>{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    {(n.task_id || n.link) && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => { setOpen(false); router.push('/notifications'); }}
              className="flex w-full items-center justify-center gap-1.5 border-t px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:bg-muted/50"
            >
              Ver todas las notificaciones
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
