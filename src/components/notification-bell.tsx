'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/lib/hooks/use-notifications';
import { useAuthStore } from '@/store/auth-store';
import { Bell, CheckCheck, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { notifications, unreadCount, loading, refetch, markAsRead, markAllRead } = useNotifications(user?.id || null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => { refetch(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, refetch]);

  const handleClick = (notif: typeof notifications[0]) => {
    markAsRead([notif.id]);
    if (notif.task_id) {
      router.push('/operations');
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen(!open)}>
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-hidden rounded-xl border bg-popover shadow-xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
              <span className="text-sm font-semibold">Notificaciones</span>
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
              {notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b border-border/30 hover:bg-muted/50 transition-colors',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {new Date(n.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {n.task_id && <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
