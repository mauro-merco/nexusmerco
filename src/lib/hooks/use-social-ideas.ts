'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SocialIdea, SocialAttachment, SocialComment, SocialAnnotation, PostType, IdeaStatus, Responsable } from '@/lib/types';

export function useSocialIdeas(clientId: string | null, month?: string | null) {
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
      const res = await fetch(`/api/social-ideas?${params}`);
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
    responsable?: Responsable;
    post_type: PostType;
    status?: IdeaStatus;
    publish_date: string;
    author_id?: string;
  }) => {
    const res = await fetch('/api/social-ideas', {
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
    title: string;
    description: string;
    brief: string;
    eje_contenido: string;
    responsable: Responsable;
    post_type: PostType;
    status: IdeaStatus;
    publish_date: string;
  }>) => {
    const res = await fetch(`/api/social-ideas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIdeas(prev => prev.map(i => i.id === id ? json.data : i));
    return json.data as SocialIdea;
  }, []);

  const deleteIdea = useCallback(async (id: string) => {
    const res = await fetch(`/api/social-ideas/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setIdeas(prev => prev.filter(i => i.id !== id));
  }, []);

  return { ideas, loading, error, refetch: fetchIdeas, createIdea, updateIdea, deleteIdea };
}

export function useSocialAttachments(ideaId: string | null) {
  const [attachments, setAttachments] = useState<SocialAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!ideaId) { setAttachments([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/social-attachments?idea_id=${ideaId}`);
      const json = await res.json();
      setAttachments(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const addAttachment = useCallback(async (data: { type: 'image' | 'video' | 'link'; url: string; name?: string; preview_url?: string }) => {
    if (!ideaId) return;
    const res = await fetch('/api/social-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_id: ideaId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setAttachments(prev => [...prev, json.data]);
    return json.data as SocialAttachment;
  }, [ideaId]);

  const removeAttachment = useCallback(async (id: string) => {
    const res = await fetch(`/api/social-attachments/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  return { attachments, loading, refetch: fetchAttachments, addAttachment, removeAttachment };
}

export function useSocialComments(ideaId: string | null) {
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!ideaId) { setComments([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/social-comments?idea_id=${ideaId}`);
      const json = await res.json();
      setComments(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [ideaId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = useCallback(async (userId: string, content: string) => {
    if (!ideaId) return;
    const res = await fetch('/api/social-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea_id: ideaId, user_id: userId, content }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setComments(prev => [...prev, json.data]);
    return json.data as SocialComment;
  }, [ideaId]);

  const deleteComment = useCallback(async (id: string) => {
    const res = await fetch(`/api/social-comments/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateComment = useCallback(async (id: string, content: string) => {
    const res = await fetch(`/api/social-comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setComments(prev => prev.map(c => c.id === id ? { ...c, content: json.data.content } : c));
    return json.data as SocialComment;
  }, []);

  return { comments, loading, refetch: fetchComments, addComment, deleteComment, updateComment };
}

export function useSocialAnnotations(attachmentId: string | null) {
  const [annotations, setAnnotations] = useState<SocialAnnotation[]>([]);

  const fetchAnnotations = useCallback(async () => {
    if (!attachmentId) { setAnnotations([]); return; }
    try {
      const res = await fetch(`/api/social-annotations?attachment_id=${attachmentId}`);
      const json = await res.json();
      setAnnotations(json.data || []);
    } catch { /* */ }
  }, [attachmentId]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  const addAnnotation = useCallback(async (commentId: string, x: number, y: number, label?: string) => {
    if (!attachmentId) return;
    const res = await fetch('/api/social-annotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId, attachment_id: attachmentId, x, y, label: label || '' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setAnnotations(prev => [...prev, json.data]);
    return json.data as SocialAnnotation;
  }, [attachmentId]);

  return { annotations, refetch: fetchAnnotations, addAnnotation };
}
