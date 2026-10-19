'use client';

import { useCallback, useEffect, useState } from 'react';

export type CommentReadType = 'task_comment' | 'social_comment';

export interface CommentReader {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface Me {
  id: string;
  name: string;
}

interface CommentNode {
  id: string;
  replies?: CommentNode[];
}

/** "Visto" marks per comment/reply: `readers[commentId]` = who already saw it. */
export function useCommentReads(type: CommentReadType, ids: string[], me: Me | null) {
  const [readers, setReaders] = useState<Record<string, CommentReader[]>>({});
  const [pending, setPending] = useState<string | null>(null);

  const key = ids.filter(Boolean).sort().join(',');

  useEffect(() => {
    if (!key) { setReaders({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/comment-reads?type=${type}&ids=${encodeURIComponent(key)}`);
        const json = await res.json();
        if (!cancelled && res.ok) setReaders(json.data || {});
      } catch { /* keep what we have */ }
    })();
    return () => { cancelled = true; };
  }, [type, key]);

  const toggle = useCallback(async (id: string) => {
    if (!id) return;
    setPending(id);

    // Optimistic flip so the eye reacts instantly.
    const before = readers[id] || [];
    if (me) {
      const has = before.some(r => r.id === me.id);
      const next = has
        ? before.filter(r => r.id !== me.id)
        : [...before, { id: me.id, full_name: me.name, avatar_url: null }];
      setReaders(prev => ({ ...prev, [id]: next }));
    }

    try {
      const res = await fetch('/api/comment-reads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id }),
      });
      const json = await res.json();
      if (res.ok) {
        setReaders(prev => ({ ...prev, [id]: json.data || [] }));
      } else {
        setReaders(prev => ({ ...prev, [id]: before }));
      }
    } catch {
      setReaders(prev => ({ ...prev, [id]: before }));
    } finally {
      setPending(null);
    }
  }, [type, readers, me]);

  return { readers, toggle, pending };
}

/** Flattens nested comment trees (top-level + replies) into an id list. */
export function collectCommentIds(list: CommentNode[] | undefined): string[] {
  const out: string[] = [];
  const walk = (items?: CommentNode[]) => {
    if (!items) return;
    for (const c of items) { out.push(c.id); walk(c.replies); }
  };
  walk(list);
  return out;
}
