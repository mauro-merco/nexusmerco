'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { Suggestion, SuggestionType, SuggestionStatus, SuggestionComment } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useSuggestions(filters?: { type?: SuggestionType | 'all'; status?: SuggestionStatus | 'all' }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = filtersRef.current;
      if (f?.type && f.type !== 'all') params.set('type', f.type);
      if (f?.status && f.status !== 'all') params.set('status', f.status);
      const qs = params.toString();
      const res = await fetch(`/api/suggestions${qs ? `?${qs}` : ''}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSuggestions(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  useEffect(() => {
    const t = setInterval(fetchSuggestions, 30000);
    return () => clearInterval(t);
  }, [fetchSuggestions]);

  const create = useCallback(async (data: { type: SuggestionType; title: string; content: string }) => {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setSuggestions(prev => [json.data, ...prev]);
    return json.data as Suggestion;
  }, []);

  const update = useCallback(async (id: string, data: { title?: string; content?: string; status?: SuggestionStatus }) => {
    const res = await fetch(`/api/suggestions/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...json.data, comments: s.comments } : s));
    return json.data as Suggestion;
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await fetch(`/api/suggestions/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return false;
    setSuggestions(prev => prev.filter(s => s.id !== id));
    return true;
  }, []);

  const toggleLike = useCallback(async (id: string) => {
    const res = await fetch(`/api/suggestions/${id}/like`, { method: 'POST', headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const { liked, like_count } = json.data;
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, liked_by_me: liked, like_count } : s));
    return json.data;
  }, []);

  const upsertCommentCount = useCallback((id: string, delta: number) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, comment_count: Math.max(0, (s.comment_count || 0) + delta) } : s));
  }, []);

  return { suggestions, loading, error, refetch: fetchSuggestions, create, update, remove, toggleLike, upsertCommentCount };
}

export function useSuggestionDetail(id: string | null) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions/${id}`, { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSuggestion(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const addComment = useCallback(async (content: string, parentId?: string | null) => {
    if (!id) return;
    const res = await fetch(`/api/suggestions/${id}/comments`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content, parent_id: parentId || null }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setSuggestion(prev => {
      if (!prev) return prev;
      const comment: SuggestionComment = json.data;
      const insert = (list: SuggestionComment[]): SuggestionComment[] => {
        if (comment.parent_id && list.some(c => c.id === comment.parent_id)) {
          return list.map(c => c.id === comment.parent_id ? { ...c, replies: [...(c.replies || []), comment] } : c);
        }
        if (comment.parent_id) {
          return list.map(c => ({ ...c, replies: insert(c.replies || []) }));
        }
        return [...list, comment];
      };
      return { ...prev, comments: insert(prev.comments || []), comment_count: (prev.comment_count || 0) + 1 };
    });
    return json.data as SuggestionComment;
  }, [id]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!id) return;
    const res = await fetch(`/api/suggestions/${id}/comments/${commentId}`, { method: 'DELETE', headers: authHeaders() });
    if (!res.ok) return false;
    fetchDetail();
    return true;
  }, [id, fetchDetail]);

  const updateStatus = useCallback(async (status: SuggestionStatus) => {
    if (!id || !suggestion) return;
    const res = await fetch(`/api/suggestions/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setSuggestion(json.data);
    return json.data as Suggestion;
  }, [id, suggestion]);

  const toggleLike = useCallback(async () => {
    if (!id || !suggestion) return;
    const res = await fetch(`/api/suggestions/${id}/like`, { method: 'POST', headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setSuggestion(prev => prev ? { ...prev, liked_by_me: json.data.liked, like_count: json.data.like_count } : prev);
  }, [id, suggestion]);

  return { suggestion, loading, refetch: fetchDetail, addComment, deleteComment, updateStatus, toggleLike };
}