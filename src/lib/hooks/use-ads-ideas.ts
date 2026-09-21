'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SocialIdea, PostType, IdeaStatus, Responsable, EcommerceDate, WorkRole } from '@/lib/types';

export function useAdsIdeas(clientId: string | null, month?: string | null) {
  const [ideas, setIdeas] = useState<SocialIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIdeas = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ client_id: clientId });
      if (month) params.set('month', month);
      const res = await fetch(`/api/ads-ideas?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setIdeas(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, month]);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const createIdea = useCallback(async (data: {
    title: string;
    description?: string;
    brief?: string;
    eje_contenido?: string;
    copy_text?: string;
    responsable?: Responsable;
    post_type: PostType;
    status?: IdeaStatus;
    publish_date: string;
    author_id?: string;
    assignees?: { id: string; role: WorkRole }[];
  }) => {
    const res = await fetch('/api/ads-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIdeas(prev => [...prev, json.data].sort((a, b) => a.publish_date.localeCompare(b.publish_date)));
    return json.data as SocialIdea;
  }, [clientId]);

  const updateIdea = useCallback(async (id: string, data: Partial<{
    title: string; description: string; brief: string; eje_contenido: string;
    copy_text: string; responsable: Responsable; post_type: PostType; status: IdeaStatus; publish_date: string;
    assignees: { id: string; role: WorkRole }[];
  }>) => {
    const res = await fetch(`/api/ads-ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIdeas(prev => prev.map(i => i.id === id ? json.data : i));
    return json.data as SocialIdea;
  }, []);

  const patchIdea = useCallback((updated: SocialIdea) => {
    setIdeas(prev => prev.map(i => i.id === updated.id ? updated : i));
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    const res = await fetch(`/api/ads-ideas/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  return { ideas, loading, error, refetch: fetchIdeas, createIdea, updateIdea, deleteIdea, patchIdea };
}

export function useEcommerceDates(clientId: string | null, month?: string | null) {
  const [dates, setDates] = useState<EcommerceDate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDates = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ client_id: clientId });
      if (month) params.set('month', month);
      const res = await fetch(`/api/ecommerce-dates?${params}`);
      const json = await res.json();
      setDates(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [clientId, month]);

  useEffect(() => { fetchDates(); }, [fetchDates]);

  const createDate = useCallback(async (data: { name: string; color: string; start_date: string; end_date: string }) => {
    const res = await fetch('/api/ecommerce-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setDates(prev => [...prev, json.data].sort((a, b) => a.start_date.localeCompare(b.start_date)));
    return json.data as EcommerceDate;
  }, [clientId]);

  const deleteDate = useCallback(async (id: string) => {
    const res = await fetch(`/api/ecommerce-dates/${id}`, { method: 'DELETE' });
    if (res.ok) setDates(prev => prev.filter(d => d.id !== id));
  }, []);

  return { dates, loading, refetch: fetchDates, createDate, deleteDate };
}
