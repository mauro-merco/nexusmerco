'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { CommentReader } from './use-comment-reads';

export interface CalendarCommentUser {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

/** The idea a comment was written on, so the feed can link back to it. */
export interface CalendarCommentIdea {
  id: string;
  title: string;
  publish_date: string | null;
}

/**
 * One row of the unified feed: either a general comment on the calendar
 * (`idea: null`) or a comment written on an idea of the month being viewed.
 */
export interface CalendarComment {
  id: string;
  client_id?: string;
  calendar_type?: 'social' | 'ads';
  month?: string;
  scope: 'calendar' | 'idea';
  idea_id?: string;
  user_id: string;
  content: string;
  created_at: string;
  user: CalendarCommentUser | null;
  idea: CalendarCommentIdea | null;
  replies: Omit<CalendarComment, 'replies'>[];
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

async function readCommentResponse(res: Response, requireData = true) {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof json?.error === 'string' ? json.error.trim() : '';
    throw new Error(message && message !== 'Error'
      ? message
      : `No se pudo procesar el comentario (HTTP ${res.status}). Intenta nuevamente.`);
  }
  if (!json || typeof json !== 'object' || (requireData && !('data' in json))) {
    throw new Error('El servidor devolvio una respuesta de comentarios invalida.');
  }
  return json;
}

export function useCalendarComments(options: Options) {
  const { clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken, pollMs = 30000 } = options;
  const [comments, setComments] = useState<CalendarComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string>();
  const [readers, setReaders] = useState<Record<string, CommentReader[]>>({});
  const [readError, setReadError] = useState<string | null>(null);

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
      const json = await readCommentResponse(res);
      if (!Array.isArray(json.data)) throw new Error('El servidor devolvio una lista de comentarios invalida.');
      setComments(json.data || []);
      setViewerId(json.user_id);
      setError(null);
      try {
        const params = buildQuery(opts);
        params.set('action', 'readers');
        const response = await fetch(`/api/calendar-comments?${params}`, { headers: authHeaders(opts) });
        const marks = await readCommentResponse(response);
        setReaders(marks.data);
        setReadError(null);
      } catch (e) {
        setReadError(e instanceof Error ? e.message : 'No se pudieron cargar los vistos');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchComments(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchComments]);

  useEffect(() => {
    const refresh = () => { void fetchComments(); };
    window.addEventListener('calendar-comments-changed', refresh);
    return () => window.removeEventListener('calendar-comments-changed', refresh);
  }, [fetchComments]);

  useEffect(() => {
    const t = setInterval(fetchComments, pollMs);
    return () => clearInterval(t);
  }, [fetchComments, pollMs]);

  const addComment = useCallback(
    async (content: string) => {
      const res = await fetch(`/api/calendar-comments?${buildQuery(opts).toString()}`, {
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
      const json = await readCommentResponse(res);
      if (!json.data || typeof json.data.id !== 'string' || typeof json.data.content !== 'string') {
        throw new Error('El servidor no confirmo la creacion del comentario. Actualiza antes de reintentar.');
      }
      // Normalize the POST payload to the same shape as the feed rows.
      const created: CalendarComment = {
        ...(json.data as Omit<CalendarComment, 'scope' | 'idea' | 'replies'>),
        scope: 'calendar',
        idea: null,
        replies: [],
      };
      setComments(prev => [...prev, created]);
      return created;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, calendarType, month, shareToken, guestEmail, viewerAuthToken],
  );

  /**
   * `scope` tells the API which table the comment lives in, so a comment on an
   * idea of the ads calendar is not looked up in the social one.
   */
  const removeComment = useCallback(
    async (id: string, scope: 'calendar' | 'idea' = 'calendar') => {
      if (scope === 'calendar') {
        const res = await fetch(`/api/calendar-comments?${buildQuery(opts)}`, {
          method: 'DELETE', headers: authHeaders(opts), body: JSON.stringify({ id }),
        });
        await readCommentResponse(res);
        setComments(prev => prev.filter(c => c.id !== id));
        return;
      }
      const headers: Record<string, string> = {};
      const params = new URLSearchParams();
      params.set('scope', scope);
      if (scope === 'idea') params.set('calendar_type', calendarType);
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
      await readCommentResponse(res, false);
      // Drop the comment plus the replies that were only visible under it.
      setComments(prev => prev.filter(c => c.id !== id && !c.replies.some(r => r.id === id)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shareToken, guestEmail, viewerAuthToken, calendarType, clientId, month],
  );

  const updateComment = async (id: string, content: string) => {
    const res = await fetch(`/api/calendar-comments?${buildQuery(opts)}`, {
      method: 'PUT', headers: authHeaders(opts), body: JSON.stringify({ id, content }),
    });
    await readCommentResponse(res);
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: content.trim() } : c));
  };
  const toggleSeen = async (id: string) => {
    const res = await fetch(`/api/calendar-comments?${buildQuery(opts)}`, {
      method: 'POST', headers: authHeaders(opts), body: JSON.stringify({ id, action: 'seen' }),
    });
    await readCommentResponse(res);
    await fetchComments();
  };
  return { comments, loading, error, readError, viewerId, readers, updateComment, toggleSeen, addComment, removeComment, refresh: fetchComments };
}
