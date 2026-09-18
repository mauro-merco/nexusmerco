'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { ClientWallMessage } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useClientWall(clientId: string | null) {
  const [messages, setMessages] = useState<ClientWallMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/client-wall?client_id=${clientId}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessages(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const addMessage = useCallback(async (content: string) => {
    if (!clientId) return;
    const res = await fetch('/api/client-wall', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ client_id: clientId, content }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setMessages(prev => [...prev, json.data]);
    return json.data as ClientWallMessage;
  }, [clientId]);

  const deleteMessage = useCallback(async (id: string) => {
    const res = await fetch(`/api/client-wall/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.ok) setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  return { messages, loading, error, refetch: fetchMessages, addMessage, deleteMessage };
}
