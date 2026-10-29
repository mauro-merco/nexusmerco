'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useEffect, useState } from 'react';
import { SocialComment } from '@/components/social-comment';
import type { SocialIdea, SocialComment as Comment } from '@/lib/types';
import type { CommentReader } from '@/lib/hooks/use-comment-reads';

export function PublicIdeaComments({ idea, shareToken, viewerAuthToken, calendarType, onChanged }: {
  idea: SocialIdea;
  shareToken: string;
  viewerAuthToken?: string;
  calendarType: 'social' | 'ads';
  onChanged: () => void;
}) {
  const [data, setData] = useState<{ data: Comment[]; readers: Record<string, CommentReader[]>; user_id?: string }>({ data: [], readers: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const url = `/api/calendar-links/${encodeURIComponent(shareToken)}/comments?${new URLSearchParams({ idea_id: idea.id, calendar_type: calendarType })}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setData({ data: [], readers: {} });
    async function load() {
      try {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${viewerAuthToken || ''}` } });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        if (active) { setData(json); setError(null); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'No se pudieron cargar los comentarios'); }
      finally { if (active) setLoading(false); }
    }
    void load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [url, viewerAuthToken]);

  async function mutate(method: string, body: object) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${viewerAuthToken || ''}` }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo guardar');
    setData(json);
    setError(null);
    window.dispatchEvent(new Event('calendar-comments-changed'));
    onChanged();
    return undefined;
  }

  return <div className="flex h-full min-h-0 flex-col gap-2">
    {loading && <ContentSkeleton variant="comments" label="Cargando comentarios" />}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <SocialComment ideaId={idea.id} comments={data.data} currentUserId={data.user_id}
      onAddComment={(_userId, content, parentId) => mutate('POST', { content, parent_id: parentId })}
      onUpdateComment={(id, content) => mutate('PUT', { id, content })}
      onDeleteComment={async id => { await mutate('DELETE', { id }); }}
      publicReads={{ readers: data.readers, pending, toggle: async id => {
        if (pending) return;
        setPending(id);
        try { await mutate('POST', { id, action: 'seen' }); }
        catch (e) { setError(e instanceof Error ? e.message : 'No se pudo marcar como visto'); }
        finally { setPending(null); }
      } }} />
  </div>;
}
