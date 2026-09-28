'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConversationLite {
  user: { id: string } | null;
  unread: number;
}

export function useUnreadMessages(userId: string | null, token: string | null) {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!userId || !token) { setUnreadCount(0); return; }
    try {
      const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      const data: ConversationLite[] = json.data || [];
      setUnreadCount(data.reduce((acc, c) => acc + (c.unread || 0), 0));
    } catch { /* */ }
  }, [userId, token]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return { unreadCount, refetch: fetchUnread };
}
