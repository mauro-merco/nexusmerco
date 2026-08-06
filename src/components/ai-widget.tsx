'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/lib/use-t';
import { useAuthStore } from '@/store/auth-store';
import { Bot, X, Send, Sparkles, User, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

export function AIWidget() {
  const _ = useT();
  const { user, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: _('aiWidget.welcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sessionKey = user?.id ? `nexus_ai_session_${user.id}` : null;

  // Check AI server availability on mount
  const checkAvailability = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/status');
      const json = await res.json();
      setAiAvailable(json.available);
    } catch {
      setAiAvailable(false);
    }
  }, []);

  useEffect(() => {
    checkAvailability();
    // Recheck when the widget is opened
  }, [checkAvailability]);

  const handleOpen = () => {
    setOpen(true);
    checkAvailability();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const suggestions = [
    _('aiWidget.whyRoas'),
    _('aiWidget.bestCpa'),
    _('aiWidget.summarizeWeek'),
    _('aiWidget.whatOptimizations'),
  ];

  async function handleSend(text?: string) {
    if (!text && !input.trim()) return;
    
    // If AI was previously checked as unavailable, try rechecking
    if (aiAvailable === false) {
      await checkAvailability();
      if (aiAvailable === false) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'El servidor de IA no está disponible. Asegurate de que `npm run ai` esté corriendo localmente.',
            error: true,
          },
        ]);
        return;
      }
    }

    const msg = (text || input).trim();
    if (!msg || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    try {
      const storedSession = sessionKey ? localStorage.getItem(sessionKey) || '' : '';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          session_id: storedSession || undefined,
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || 'Error al contactar el asistente');
      }

      if (json?.data?.session_id && sessionKey) {
        localStorage.setItem(sessionKey, json.data.session_id);
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: json?.data?.reply || '' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Error al contactar el asistente',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {aiAvailable !== false && (
        <>
          {!open && (
            <Button
              onClick={handleOpen}
              className="bg-gradient-tech glow-tech fixed bottom-20 md:bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:opacity-90"
              size="icon"
              disabled={aiAvailable === null}
            >
              {aiAvailable === null ? (
                <Bot className="h-6 w-6 text-white animate-pulse" />
              ) : (
                <Bot className="h-6 w-6 text-white" />
              )}
            </Button>
          )}

          {open && (
            <Card className="fixed bottom-20 md:bottom-6 right-6 z-50 flex w-80 flex-col shadow-2xl sm:w-96">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 border-b p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-medium">{_('aiWidget.title')}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <ScrollArea className="h-72 p-3">
                  <div className="flex flex-col gap-3">
                    {messages.map((msg, i) => (
                      <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', msg.role === 'assistant' ? 'bg-gradient-tech' : 'bg-muted')}>
                          {msg.role === 'assistant' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4" />}
                        </div>
                        <div
                          className={cn(
                            'rounded-lg px-3 py-2 text-sm max-w-[80%]',
                            msg.role === 'assistant' ? (msg.error ? 'bg-destructive/10 text-destructive' : 'bg-muted') : 'bg-primary text-primary-foreground'
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex gap-2">
                        <div className="bg-gradient-tech flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="rounded-lg bg-muted px-3 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Déjame pensar... 🤔
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </ScrollArea>

                <div className="border-t p-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        onClick={() => handleSend(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t p-3">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex w-full gap-2"
                >
                  <Input
                    placeholder={_('aiWidget.placeholder')}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim() || loading}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          )}
        </>
      )}
    </>
  );
}
