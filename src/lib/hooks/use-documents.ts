'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import type { NexusDocument, DocumentShare } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function useDocuments() {
  const [documents, setDocuments] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/documents', { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocuments(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const createDocument = useCallback(async (title?: string, content?: string) => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title, content }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setDocuments(prev => [json.data, ...prev]);
    return json.data as NexusDocument;
  }, []);

  const getDocument = useCallback(async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.data as NexusDocument;
  }, []);

  const updateDocument = useCallback(async (id: string, data: Partial<Pick<NexusDocument, 'title' | 'content'>>) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...json.data } : d));
    return json.data as NexusDocument;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  const addShare = useCallback(async (docId: string, userId: string) => {
    const res = await fetch(`/api/documents/${docId}/shares`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.data as DocumentShare;
  }, []);

  const removeShare = useCallback(async (docId: string, userId: string) => {
    const res = await fetch(`/api/documents/${docId}/shares?user_id=${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
  }, []);

  const getShares = useCallback(async (docId: string) => {
    const res = await fetch(`/api/documents/${docId}/shares`, { headers: authHeaders() });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    return json.data as DocumentShare[];
  }, []);

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    createDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    addShare,
    removeShare,
    getShares,
  };
}
