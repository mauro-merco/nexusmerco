'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';
import { useClientWall } from '@/lib/hooks/use-client-wall';
import { MessageCircle, Send, Loader2, Trash2 } from 'lucide-react';

function getTimeAgo(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  return `hace ${Math.floor(diffH / 24)}d`;
}

export function ClientWall({ clientId }: { clientId: string }) {
  const { user } = useAuthStore();
  const { messages, loading, addMessage, deleteMessage } = useClientWall(clientId);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await addMessage(content.trim());
      setContent('');
    } catch { /* */ } finally {
      setSending(false);
    }
  }, [content, addMessage]);

  return (
    <Card className="bg-card/50 backdrop-blur-xl border border-border/30">
      <CardContent className="p-5 space-y-4">
        <p className="text-sm font-bold flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> Muro del equipo
        </p>
        <p className="text-xs text-muted-foreground -mt-2">Solo visible para el equipo de Merco. Coordiná acá lo que haga falta sobre este cliente.</p>

        <div className="space-y-3 max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-muted-foreground/60 italic text-center py-4">Sin mensajes todavía</p>
          )}
          {messages.map(m => (
            <div key={m.id} className="group flex items-start gap-2.5">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={m.user?.avatar_url} />
                <AvatarFallback className="text-[10px] font-bold">{m.user?.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{m.user?.full_name || 'Usuario'}</span>
                  <span className="text-[10px] text-muted-foreground">{getTimeAgo(m.created_at)}</span>
                </div>
                <p className="text-sm text-foreground/80 mt-0.5 leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
              {m.user_id === user?.id && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => deleteMessage(m.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border/30 pt-3">
          <Input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escribí algo para el equipo..."
            className="h-9 text-sm"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
          />
          <Button size="sm" onClick={handleSend} disabled={sending || !content.trim()} className="h-9 w-9 p-0 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
