'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { NexusDocument, DocumentShare, DocumentComment, DocumentLinkedTask, DocumentKind, DocumentStatus } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...authHeaders(), ...(init?.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Error');
  return json.data as T;
}

export interface CreateDocumentInput {
  title?: string;
  content?: string;
  client_id?: string | null;
  task_id?: string | null;
  kind?: DocumentKind;
  status?: DocumentStatus;
  tags?: string[];
  color?: string | null;
  icon?: string | null;
}

export type DocumentUpdate = Partial<Pick<NexusDocument, 'title' | 'content' | 'is_public' | 'client_id' | 'kind' | 'status' | 'tags' | 'color' | 'icon'>> & {
  archived?: boolean;
  favorite?: boolean;
};

/** Lista de documentos. `scope` limita a un cliente o a una tarea. */
export function useDocuments(scope?: { clientId?: string | null; taskId?: string | null }) {
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clientId = scope?.clientId || null;
  const taskId = scope?.taskId || null;

  const fetchDocuments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const qs = taskId ? `?task_id=${taskId}` : clientId ? `?client_id=${clientId}` : '';
      setDocuments(await call<NexusDocument[]>(`/api/documents${qs}`) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, taskId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const createDocument = useCallback(async (input: CreateDocumentInput = {}) => {
    const doc = await call<NexusDocument>('/api/documents', { method: 'POST', body: JSON.stringify(input) });
    setDocuments(prev => [doc, ...prev]);
    return doc;
  }, []);

  const getDocument = useCallback((id: string) => call<NexusDocument>(`/api/documents/${id}`), []);

  const updateDocument = useCallback(async (id: string, data: DocumentUpdate) => {
    const updated = await call<Partial<NexusDocument>>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    setDocuments(prev => prev.map(d => d.id === id ? {
      ...d,
      ...updated,
      ...(data.favorite !== undefined ? { is_favorite: data.favorite } : {}),
    } : d));
    return updated;
  }, []);

  /** Actualiza la lista local sin llamar a la API (cuando el modal ya guardó). */
  const patchLocal = useCallback((id: string, patch: Partial<NexusDocument>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await call(`/api/documents/${id}`, { method: 'DELETE' });
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const removeLocal = useCallback((id: string) => setDocuments(prev => prev.filter(d => d.id !== id)), []);

  const addShare = useCallback((docId: string, userId: string) =>
    call<DocumentShare>(`/api/documents/${docId}/shares`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }), []);
  const removeShare = useCallback(async (docId: string, userId: string) => {
    await call(`/api/documents/${docId}/shares?user_id=${userId}`, { method: 'DELETE' });
  }, []);
  const getShares = useCallback((docId: string) => call<DocumentShare[]>(`/api/documents/${docId}/shares`), []);

  return {
    documents, loading, error,
    refetch: fetchDocuments,
    createDocument, getDocument, updateDocument, deleteDocument, patchLocal, removeLocal,
    addShare, removeShare, getShares,
  };
}

export const documentApi = {
  get: (id: string) => call<NexusDocument>(`/api/documents/${id}`),
  create: (input: CreateDocumentInput) => call<NexusDocument>('/api/documents', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, data: DocumentUpdate) => call<Partial<NexusDocument>>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id: string) => call(`/api/documents/${id}`, { method: 'DELETE' }),
  linkTask: (id: string, taskId: string) => call<DocumentLinkedTask>(`/api/documents/${id}/links`, { method: 'POST', body: JSON.stringify({ task_id: taskId }) }),
  unlinkTask: (id: string, taskId: string) => call(`/api/documents/${id}/links?task_id=${taskId}`, { method: 'DELETE' }),
};

export function useDocumentComments(docId: string | null) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!docId) return;
    setLoading(true);
    try { setComments(await call<DocumentComment[]>(`/api/documents/${docId}/comments`) || []); }
    catch { /* el panel muestra vacío */ }
    finally { setLoading(false); }
  }, [docId]);

  useEffect(() => { setComments([]); refetch(); }, [refetch]);

  const add = useCallback(async (content: string, parentId?: string | null) => {
    if (!docId) return;
    const c = await call<DocumentComment>(`/api/documents/${docId}/comments`, { method: 'POST', body: JSON.stringify({ content, parent_id: parentId || null }) });
    setComments(prev => parentId
      ? prev.map(p => p.id === parentId ? { ...p, replies: [...(p.replies || []), c] } : p)
      : [...prev, c]);
  }, [docId]);

  const toggleResolved = useCallback(async (commentId: string, resolved: boolean) => {
    if (!docId) return;
    setComments(prev => prev.map(p => p.id === commentId ? { ...p, resolved } : p));
    await call(`/api/documents/${docId}/comments`, { method: 'PUT', body: JSON.stringify({ comment_id: commentId, resolved }) });
  }, [docId]);

  const remove = useCallback(async (commentId: string) => {
    if (!docId) return;
    await call(`/api/documents/${docId}/comments?comment_id=${commentId}`, { method: 'DELETE' });
    setComments(prev => prev
      .filter(p => p.id !== commentId)
      .map(p => ({ ...p, replies: (p.replies || []).filter(r => r.id !== commentId) })));
  }, [docId]);

  return { comments, loading, refetch, add, toggleResolved, remove };
}
