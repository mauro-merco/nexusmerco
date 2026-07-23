'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/lib/types';

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); setUnreadCount(0); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`);
      const json = await res.json();
      setNotifications(json.data || []);
      setUnreadCount(json.unread_count || 0);
    } catch { /* */ } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!userId || ids.length === 0) return;
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_ids: ids }),
    });
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.length));
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true, user_id: userId }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  return { notifications, unreadCount, loading, refetch: fetchNotifications, markAsRead, markAllRead };
}
