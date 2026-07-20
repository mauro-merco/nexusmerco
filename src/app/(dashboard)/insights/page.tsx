'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useT } from '@/lib/use-t';
import { cn } from '@/lib/utils';
import { Bot, Send, Sparkles, User, TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const presetQueries = [
  { labelKey: 'summarize', icon: TrendingUp },
  { labelKey: 'attention', icon: AlertTriangle },
  { labelKey: 'topOptimizations', icon: Lightbulb },
  { labelKey: 'compare', icon: TrendingDown },
];

export default function InsightsPage() {
  const _ = useT();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: _('insights.welcome') },
  ]);
  const [input, setInput] = useState('');

  const responses: Record<string, string> = {
    [_('insights.summarize')]: _('insights.summarize'),
    [_('insights.attention')]: _('insights.attention'),
    [_('insights.topOptimizations')]: _('insights.topOptimizations'),
    [_('insights.compare')]: _('insights.compare'),
  };

  function handleSend(query?: string) {
    const text = query || input;
    if (!text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setTimeout(() => {
      const reply = responses[text] || `Mock response for: "${text}"`;
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    }, 600);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{_('insights.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">{_('insights.subtitle')}</p>
      </div>

      <Card className="flex flex-1 flex-col">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base">{_('insights.conversation')}</CardTitle>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1">
          <CardContent className="p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  msg.role === 'assistant' ? 'bg-amber-500/20' : 'bg-primary/10'
                )}>
                  {msg.role === 'assistant' ? <Bot className="h-4 w-4 text-amber-500" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn(
                  'rounded-lg px-4 py-2.5 text-sm max-w-[80%] leading-relaxed',
                  msg.role === 'assistant' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
          </CardContent>
        </ScrollArea>

        <CardContent className="border-t p-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {presetQueries.map((q) => {
              const Icon = q.icon;
              return (
                <Button
                  key={q.labelKey}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleSend(_(`insights.${q.labelKey}`))}
                >
                  <Icon className="h-3.5 w-3.5" /> {_(`insights.${q.labelKey}`)}
                </Button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-2"
          >
            <Input
              placeholder={_('insights.askPlaceholder')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
