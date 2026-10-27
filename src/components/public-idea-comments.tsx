'use client';

import { useState } from 'react';
import { useCalendarComments } from '@/lib/hooks/use-calendar-comments';
import { MarkdownBody } from '@/lib/markdown';
import { Button } from '@/components/ui/button';
import type { SocialIdea } from '@/lib/types';

export function PublicIdeaComments({ idea, shareToken, viewerAuthToken, calendarType, onChanged }: {
  idea: SocialIdea;
  shareToken: string;
  viewerAuthToken?: string;
  calendarType: 'social' | 'ads';
  onChanged: () => void;
}) {
  const { comments, loading, error, refresh } = useCalendarComments({
    clientId: idea.client_id, calendarType, month: idea.publish_date.slice(0, 7), shareToken, viewerAuthToken,
  });
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const thread = comments.filter(c => c.idea_id === idea.id);

  async function send() {
    if (!content.trim() || sending) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/calendar-links/${encodeURIComponent(shareToken)}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(viewerAuthToken ? { Authorization: `Bearer ${viewerAuthToken}` } : {}) },
        body: JSON.stringify({ idea_id: idea.id, calendar_type: calendarType, action_type: 'comment', content: content.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo enviar el comentario');
      setContent('');
      await refresh();
      onChanged();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'No se pudo enviar el comentario');
    } finally { setSending(false); }
  }

  return <div className="flex h-full min-h-0 flex-col gap-3">
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
      {loading ? <p>Cargando comentarios...</p> : error ? <p role="alert">{error}</p> : thread.length === 0 ? <p>No hay comentarios</p> : thread.map(c => <div key={c.id}>
        <p className="text-sm font-semibold">{c.user?.full_name || 'Usuario'}</p>
        <MarkdownBody text={c.content} />
        {c.replies.map(r => <div key={r.id} className="ml-4 mt-2 border-l pl-3"><p className="text-sm font-semibold">{r.user?.full_name || 'Usuario'}</p><MarkdownBody text={r.content} /></div>)}
      </div>)}
    </div>
    {sendError && <p role="alert" className="text-sm text-destructive">{sendError}</p>}
    <form className="shrink-0 space-y-2" onSubmit={e => { e.preventDefault(); void send(); }}>
      <textarea aria-label="Comentario" className="w-full rounded-xl border p-3 text-sm" value={content} onChange={e => setContent(e.target.value)} maxLength={5000} disabled={sending} />
      <Button type="submit" disabled={sending || !content.trim() || !viewerAuthToken}>{sending ? 'Enviando...' : 'Enviar'}</Button>
    </form>
  </div>;
}
