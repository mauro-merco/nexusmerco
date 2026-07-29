'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus, TaskComment, TaskAttachment, TaskPriority } from '@/lib/types';

export function useTasks(clientId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?client_id=${clientId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTasks(json.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const createTask = useCallback(async (data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    assignee_id?: string;
    author_id?: string;
    priority?: TaskPriority;
    due_date?: string;
  }) => {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, ...data }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setTasks(prev => [...prev, json.data]);
    return json.data as Task;
  }, [clientId]);

  const updateTask = useCallback(async (id: string, data: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    assignee_id: string | null;
    priority: TaskPriority;
    due_date: string | null;
    position: number;
  }>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...json.data } : t));
    return json.data as Task;
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error deleting task');
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const patchTask = useCallback((updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  }, []);

  return { tasks, loading, error, refetch: fetchTasks, createTask, updateTask, deleteTask, patchTask };
}

export function useTaskComments(taskId: string | null) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!taskId) { setComments([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/task-comments?task_id=${taskId}`);
      const json = await res.json();
      setComments(json.data || []);
    } catch { /* */ } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = useCallback(async (user_id: string, content: string, parentId?: string) => {
    if (!taskId) return;
    const res = await fetch('/api/task-comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, user_id, content, parent_id: parentId || null }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setComments(prev => {
      if (parentId) {
        return prev.map(c => c.id === parentId ? { ...c, replies: [...(c.replies || []), json.data] } : c);
      }
      return [...prev, json.data];
    });
    return json.data as TaskComment;
  }, [taskId]);

  const deleteComment = useCallback(async (id: string) => {
    const res = await fetch(`/api/task-comments/${id}`, { method: 'DELETE' });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== id).map(c => ({
      ...c,
      replies: (c.replies || []).filter(r => r.id !== id),
    })));
  }, []);

  const updateComment = useCallback(async (id: string, content: string) => {
    const res = await fetch(`/api/task-comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    const updated = json.data as TaskComment;
    setComments(prev => prev.map(c => {
      if (c.id === id) return { ...c, ...updated };
      if (c.replies) return { ...c, replies: c.replies.map(r => r.id === id ? { ...r, ...updated } : r) };
      return c;
    }));
    return updated;
  }, []);

  return { comments, loading, refetch: fetchComments, addComment, deleteComment, updateComment };
}

export function useTaskAttachments(taskId: string | null) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) { setAttachments([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/task-attachments?task_id=${taskId}`);
      const json = await res.json();
      setAttachments(json.data || []);
    } catch { /* */ } finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { fetchAttachments(); }, [fetchAttachments]);

  const addAttachment = useCallback(async (url: string, name?: string) => {
    if (!taskId) return;
    const res = await fetch('/api/task-attachments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: taskId, url, name: name || '' }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    setAttachments(prev => [...prev, json.data]);
    return json.data as TaskAttachment;
  }, [taskId]);

  const removeAttachment = useCallback(async (id: string) => {
    const res = await fetch(`/api/task-attachments/${id}`, { method: 'DELETE' });
    if (res.ok) setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  return { attachments, loading, refetch: fetchAttachments, addAttachment, removeAttachment };
}
