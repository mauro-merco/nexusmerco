'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useNotifications } from '@/lib/hooks/use-notifications';
import type { Notification } from '@/lib/types';
import {
  Bell, UserPlus, AtSign, FileText, AlarmClock, CheckCircle2, Info, X,
} from 'lucide-react';

const TYPE_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  task_assigned: { icon: UserPlus, color: 'text-cyan-400' },
  mention: { icon: AtSign, color: 'text-violet-400' },
  document_shared: { icon: FileText, color: 'text-blue-400' },
  reminder: { icon: AlarmClock, color: 'text-amber-400' },
  task_completed: { icon: CheckCircle2, color: 'text-emerald-400' },
};

function getConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: Info, color: 'text-muted-foreground' };
}

interface Toast {
  key: string;
  notification: Notification;
}

function ToastCard({ toast, onClose, onOpen }: {
  toast: Toast;
  onClose: (key: string) => void;
  onOpen: (n: Notification) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onClose(toast.key), 6000);
    return () => clearTimeout(t);
  }, [toast.key, onClose]);

  const cfg = getConfig(toast.notification.type);
  const Icon = cfg.icon;
  const hasLink = !!(toast.notification.link || toast.notification.task_id);

  return (
    <div className="animate-[transition-fade_0.25s_ease-out] w-full max-w-sm">
      <div className="relative overflow-hidden rounded-xl border bg-popover shadow-2xl backdrop-blur-xl">
        <div className="bg-gradient-tech absolute inset-x-0 top-0 h-px" />
        <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-20 blur-2xl"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(34,211,238,0.7), transparent 70%)' }} />
        <div className="relative flex items-start gap-3 p-3.5">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cfg.color)} style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <Icon className="h-4.5 w-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gradient-tech">Notificación</p>
              <button onClick={() => onClose(toast.key)} className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm font-semibold mt-0.5 leading-snug">{toast.notification.title}</p>
            {toast.notification.message && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{toast.notification.message}</p>
            )}
            {hasLink && (
              <button
                onClick={() => onOpen(toast.notification)}
                className="mt-1.5 text-[11px] font-semibold text-primary hover:underline"
              >
                Ver → 
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationToasts() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { notifications, markAsRead, refetch } = useNotifications(user?.id || null);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => { refetch(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, refetch]);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!notifications.length) return;
    if (!initializedRef.current) {
      initializedRef.current = true;
      notifications.forEach(n => seenRef.current.add(n.id));
      return;
    }

    const fresh = notifications.filter(n => !seenRef.current.has(n.id) && !n.deleted_at);
    if (fresh.length === 0) return;

    fresh.forEach(n => seenRef.current.add(n.id));

    const newToasts: Toast[] = fresh.map(n => ({
      key: `${n.id}-${Date.now()}-${Math.random()}`,
      notification: n,
    }));
    setToasts(prev => [...prev, ...newToasts].slice(-3));
  }, [notifications]);

  const close = useCallback((key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key));
  }, []);

  const open = useCallback((n: Notification) => {
    markAsRead([n.id]);
    close(toasts.find(t => t.notification.id === n.id)?.key || '');
    const link = n.link || (n.task_id ? `/operations?task=${n.task_id}` : null);
    if (link) router.push(link);
  }, [markAsRead, router, close, toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div key={t.key} className="pointer-events-auto w-full max-w-sm">
          <ToastCard toast={t} onClose={close} onOpen={open} />
        </div>
      ))}
    </div>
  );
}
