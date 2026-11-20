'use client';
import { useEffect, useState } from 'react';
import type { MentionUser } from '@/components/mention';

export function useCalendarMentions(query: string | null) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setUsers([]); setError('');
    if (!query) return;
    let active = true;
    fetch(`/api/calendar-mentions?${query}`).then(async res => {
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (active) setUsers(json.data || []);
    }).catch(e => { if (active) setError(e.message || 'No se pudieron cargar las menciones'); });
    return () => { active = false; };
  }, [query]);
  return { users, error };
}
