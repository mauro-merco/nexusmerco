'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { Search, Building2, User, FileText, KanbanSquare, Loader2 } from 'lucide-react';

interface SearchResult {
  type: 'client' | 'user' | 'document' | 'task';
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
};

const GROUP_ICONS: Record<SearchResult['type'], typeof Search> = {
  client: Building2,
  user: User,
  document: FileText,
  task: KanbanSquare,
};

export function GlobalSearch() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (query.trim().length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, token]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const groups: SearchResult['type'][] = ['client', 'user', 'document', 'task'];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-input/40 bg-input/20 px-3 py-1.5 text-xs text-muted-foreground hover:border-input/70 transition-colors w-56"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="text-[10px] font-mono opacity-60">Ctrl K</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} title="Buscar" description="Buscá clientes, usuarios, documentos y tareas">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar clientes, usuarios, documentos, tareas..." value={query} onValueChange={setQuery} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
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
