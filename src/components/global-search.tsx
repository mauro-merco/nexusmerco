'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { Search, Building2, User, FileText, KanbanSquare, CalendarDays, MessageSquare, Lightbulb, MessagesSquare } from 'lucide-react';

interface SearchResult {
  type: 'client' | 'user' | 'document' | 'task' | 'task_comment' | 'social_idea' | 'ads_idea' | 'social_comment' | 'ads_comment' | 'calendar_comment' | 'suggestion' | 'suggestion_comment' | 'sala_message';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

const GROUP_LABELS: Record<SearchResult['type'], string> = {
  client: 'Clientes',
  user: 'Usuarios',
  document: 'Documentos',
  task: 'Tareas',
  task_comment: 'Comentarios en tareas',
  social_idea: 'Ideas de Redes',
  ads_idea: 'Ideas de ADS',
  social_comment: 'Comentarios en Redes',
  ads_comment: 'Comentarios en ADS',
  calendar_comment: 'Comentarios en calendarios',
  suggestion: 'Sugerencias y bugs',
  suggestion_comment: 'Comentarios en sugerencias',
  sala_message: 'Mensajes en salas',
};

const GROUP_ICONS: Record<SearchResult['type'], typeof Search> = {
  client: Building2,
  user: User,
  document: FileText,
  task: KanbanSquare,
  task_comment: MessageSquare,
  social_idea: CalendarDays,
  ads_idea: CalendarDays,
  social_comment: MessageSquare,
  ads_comment: MessageSquare,
  calendar_comment: MessageSquare,
  suggestion: Lightbulb,
  suggestion_comment: MessageSquare,
  sala_message: MessagesSquare,
};

export function GlobalSearch() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return; }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { requestRef.current++; setResults([]); setLoading(false); return; }
    const requestId = ++requestRef.current;
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (requestId === requestRef.current) setResults(json.data || []);
      } catch {
        if (requestId === requestRef.current) setResults([]);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, token]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const groups: SearchResult['type'][] = ['client', 'user', 'task', 'task_comment', 'social_idea', 'social_comment', 'ads_idea', 'ads_comment', 'calendar_comment', 'document', 'suggestion', 'suggestion_comment', 'sala_message'];

  return (
    <>
      <div className="hidden w-full max-w-[360px] sm:block">
        <button type="button" onClick={() => setOpen(true)}
          className="flex h-10 w-full items-center gap-2.5 rounded-full border border-border bg-card px-3.5 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Buscar clientes, tareas, documentos…</span>
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] font-sans font-semibold lg:inline">Ctrl K</kbd>
        </button>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground sm:hidden"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Buscá contenido en la plataforma" className="search-modal-glow top-[12vh] w-[calc(100%-2rem)] max-w-2xl translate-y-0 border-0 p-px sm:top-[15vh]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar tareas, comentarios, ideas, usuarios..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[min(65vh,560px)]">
            {loading && (
              <ContentSkeleton />
            )}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>Sin resultados para &quot;{query}&quot;</CommandEmpty>
            )}
            {!loading && query.trim().length < 2 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Escribí al menos 2 caracteres...</p>
            )}
            {!loading && groups.map(type => {
              const items = results.filter(r => r.type === type);
              if (items.length === 0) return null;
              const Icon = GROUP_ICONS[type];
              return (
                <CommandGroup key={type} heading={GROUP_LABELS[type]}>
                  {items.map(item => (
                    <CommandItem key={`${item.type}-${item.id}`} value={`${item.type}-${item.id}-${item.label}`} onSelect={() => handleSelect(item.href)}>
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{item.label}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{item.sublabel}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
