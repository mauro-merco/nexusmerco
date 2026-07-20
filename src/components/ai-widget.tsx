'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/lib/use-t';
import { Bot, X, Send, Sparkles, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIWidget() {
  const _ = useT();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: _('aiWidget.welcome') },
  ]);
  const [input, setInput] = useState('');

  const suggestions = [
    _('aiWidget.whyRoas'),
    _('aiWidget.bestCpa'),
    _('aiWidget.summarizeWeek'),
    _('aiWidget.whatOptimizations'),
  ];

  function handleSend(text?: string) {
    const msg = text || input;
    if (!msg.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Mock AI response for: "${msg}"` },
      ]);
    }, 800);
  }

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}

      {open && (
        <Card className="fixed bottom-6 right-6 z-50 flex w-80 flex-col shadow-2xl sm:w-96">
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
                    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted')}>
                      {msg.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className={cn('rounded-lg px-3 py-2 text-sm max-w-[80%]', msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground')}>
                      {msg.content}
                    </div>
                  </div>
                ))}
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
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
