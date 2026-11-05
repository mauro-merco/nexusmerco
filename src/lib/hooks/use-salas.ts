'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type {
  Sala,
  SalaKind,
  SalaMessage,
  SalaParticipation,
  SalaVisibility,
} from '@/lib/types';

export interface NewSalaInput {
  name: string;
  description?: string;
  kind: SalaKind;
  visibility: SalaVisibility;
  emoji?: string;
  color?: string;
  member_ids?: string[];
}

export function useSalas() {
  const { user, token } = useAuthStore();
  const [rooms, setRooms] = useState<Sala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !token) return;
    try {
      const res = await fetch('/api/salas', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las salas');
      setRooms(json.data || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const createSala = useCallback(async (input: NewSalaInput) => {
    if (!token) throw new Error('No autorizado');
    const res = await fetch('/api/salas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo crear la sala');
    await refresh();
    return json.data as Sala;
  }, [token, refresh]);

  const updateSala = useCallback(async (salaId: string, input: Partial<NewSalaInput> & { archived?: boolean }) => {
    if (!token) throw new Error('No autorizado');
    const res = await fetch(`/api/salas/${salaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo actualizar la sala');
    await refresh();
    return json.data as Sala;
  }, [token, refresh]);

  const deleteSala = useCallback(async (salaId: string) => {
    if (!token) throw new Error('No autorizado');
    const res = await fetch(`/api/salas/${salaId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo eliminar la sala');
    await refresh();
  }, [token, refresh]);

  const join = useCallback(async (salaId: string) => {
    if (!token) throw new Error('No autorizado');
    const res = await fetch(`/api/salas/${salaId}/membership`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo unir a la sala');
    await refresh();
  }, [token, refresh]);

  const leave = useCallback(async (salaId: string) => {
    if (!token) throw new Error('No autorizado');
    const res = await fetch(`/api/salas/${salaId}/membership`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo salir de la sala');
    await refresh();
  }, [token, refresh]);

  return { rooms, loading, error, refresh, createSala, updateSala, deleteSala, join, leave };
}

export function useSalaFeed(salaId: string | null) {
  const { token } = useAuthStore();
  const [sala, setSala] = useState<Sala | null>(null);
  const [messages, setMessages] = useState<SalaMessage[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [canModerate, setCanModerate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async (silent = false) => {
    if (!salaId || !token) return;
    const req = ++requestId.current;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/salas/${salaId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar la sala');
      if (req !== requestId.current) return;
      setSala(json.data?.sala || null);
      setMessages(json.data?.messages || []);
      setCanPost(!!json.data?.can_post);
      setCanModerate(!!json.data?.can_moderate);
      setError(null);
    } catch (e) {
      if (req === requestId.current) setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      if (!silent && req === requestId.current) setLoading(false);
    }
  }, [salaId, token]);

  useEffect(() => {
    setSala(null);
    setMessages([]);
    setError(null);
    if (!salaId) return;
    refresh();
    const interval = setInterval(() => refresh(true), 12000);
    return () => clearInterval(interval);
  }, [salaId, refresh]);

  const sendMessage = useCallback(async (content: string, parentId: string | null = null) => {
    if (!salaId || !token) throw new Error('No autorizado');
    const text = content.trim();
    if (!text) return null;
    setSending(true);
    try {
      const res = await fetch(`/api/salas/${salaId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: text, parent_id: parentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo enviar el mensaje');
      const created = json.data as SalaMessage;
      setMessages(prev => {
        if (!parentId) return [...prev, { ...created, replies: [] }];
        return prev.map(m => (m.id === parentId ? { ...m, replies: [...(m.replies || []), created] } : m));
      });
      return created;
    } finally {
      setSending(false);
    }
  }, [salaId, token]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!salaId || !token) return;
    const res = await fetch(`/api/salas/${salaId}/messages/${messageId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ emoji }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo reaccionar');
    await refresh(true);
  }, [salaId, token, refresh]);

  const markViewed = useCallback(async (messageId: string) => {
    if (!salaId || !token) return;
    const res = await fetch(`/api/salas/${salaId}/messages/${messageId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo marcar como visto');
    await refresh(true);
  }, [salaId, token, refresh]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!salaId || !token) return;
    const res = await fetch(`/api/salas/${salaId}/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'No se pudo eliminar el mensaje');
    await refresh(true);
  }, [salaId, token, refresh]);

  return {
    sala, messages, canPost, canModerate, loading, sending, error,
    refresh, sendMessage, toggleReaction, markViewed, deleteMessage,
  };
}

export function useSalaParticipation(userId: string | null, days = 0, salaId?: string | null) {
  const { token } = useAuthStore();
  const [data, setData] = useState<SalaParticipation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: userId });
      if (days > 0) params.set('days', String(days));
      if (salaId) params.set('sala_id', salaId);
      const res = await fetch(`/api/sala-participation?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar la participación');
      setData(json.data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [userId, days, salaId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
