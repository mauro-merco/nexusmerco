'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';

export interface CalendarCommentUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface CalendarComment {
  id: string;
  client_id: string;
  calendar_type: 'social' | 'ads';
  month: string;
  user_id: string;
  content: string;
  created_at: string;
  user: CalendarCommentUser | null;
}

interface Options {
  clientId: string | null;
  calendarType: 'social' | 'ads';
  month: string | null;
  /** Public share link token (c/[token] calendar). */
  shareToken?: string;
  /** Guest email used by the public calendar when there is no session. */
  guestEmail?: string;
  /** Supabase session of the public viewer, when logged in. */
  viewerAuthToken?: string;
  pollMs?: number;
}

function buildQuery(o: Options) {
  const params = new URLSearchParams();
  if (o.shareToken) {
    params.set('token', o.shareToken);
    if (o.guestEmail) params.set('guest_email', o.guestEmail);
  } else {
    if (o.clientId) params.set('client_id', o.clientId);
  }
  params.set('calendar_type', o.calendarType);
  if (o.month) params.set('month', o.month);
  return params;
}

function authHeaders(o: Options) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (o.shareToken) {
    if (o.viewerAuthToken) headers.Authorization = `Bearer ${o.viewerAuthToken}`;
    if (o.guestEmail) headers['x-guest-email'] = o.guestEmail;
  } else {
    const token = useAuthStore.getState().token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export function useCalendarComments(options: Options) {
  const { clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken, pollMs = 30000 } = options;
  const [comments, setComments] = useState<CalendarComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const opts: Options = { clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken, pollMs };

  const fetchComments = useCallback(async () => {
    // Public guests without an email cannot be authorized by the API.
    if (shareToken && !viewerAuthToken && !guestEmail) {
      setComments([]);
      setLoading(false);
      return;
    }
    if (!shareToken && !clientId) {
      setLoading(false);
      return;
    }
    if (!month) {
      setComments([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/calendar-comments?${buildQuery(opts).toString()}`, {
        headers: authHeaders(opts),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComments(json.data || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  useEffect(() => {
    const t = setInterval(fetchComments, pollMs);
    return () => clearInterval(t);
  }, [fetchComments, pollMs]);

  const addComment = useCallback(
    async (content: string) => {
      const res = await fetch('/api/calendar-comments', {
        method: 'POST',
        headers: authHeaders(opts),
        body: JSON.stringify({
          client_id: clientId,
          calendar_type: calendarType,
          month,
          content,
          ...(shareToken ? { token: shareToken } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComments(prev => [...prev, json.data as CalendarComment]);
      return json.data as CalendarComment;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken],
  );

  const removeComment = useCallback(async (id: string) => {
    const headers: Record<string, string> = {};
    const params = new URLSearchParams();
    if (shareToken) {
      if (viewerAuthToken) headers.Authorization = `Bearer ${viewerAuthToken}`;
      if (guestEmail) headers['x-guest-email'] = guestEmail;
      params.set('token', shareToken);
      params.set('calendar_type', calendarType);
    } else {
      const token = useAuthStore.getState().token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`/api/calendar-comments/${id}?${params.toString()}`, {
      method: 'DELETE',
      headers,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setComments(prev => prev.filter(c => c.id !== id));
  }, [shareToken, guestEmail, viewerAuthToken, calendarType]);

  return { comments, loading, error, addComment, removeComment, refresh: fetchComments };
}
