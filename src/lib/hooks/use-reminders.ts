'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Reminder } from '@/lib/types';

export function useReminders(userId: string | null) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (!userId) { setReminders([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders?user_id=${userId}`);
      const json = await res.json();
      setReminders(json.data || []);
    } catch { /* */ } finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const createReminder = useCallback(async (data: { title: string; description?: string; reminder_at: string }) => {
    if (!userId) return null;
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...data }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReminders(prev => [...prev, json.data].sort((a, b) => a.reminder_at.localeCompare(b.reminder_at)));
        return json.data;
      }
    } catch { /* */ }
    return null;
  }, [userId]);

  const updateReminder = useCallback(async (id: string, updates: Partial<Reminder>) => {
    try {
      const res = await fetch('/api/reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReminders(prev => prev.map(r => r.id === id ? json.data : r));
      }
    } catch { /* */ }
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await fetch(`/api/reminders?id=${id}`, { method: 'DELETE' });
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch { /* */ }
  }, []);

  const checkDue = useCallback(async () => {
    if (!userId) return;
    try {
      await fetch('/api/reminders/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      fetchReminders();
    } catch { /* */ }
  }, [userId, fetchReminders]);

  return { reminders, loading, refetch: fetchReminders, createReminder, updateReminder, deleteReminder, checkDue };
}
