'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lightbulb, Bug, ChevronDown, ArrowUpRight } from 'lucide-react';
import { SuggestionComposeDialog } from '@/components/suggestion-compose-dialog';
import { useSuggestions } from '@/lib/hooks/use-suggestions';
import type { SuggestionType } from '@/lib/types';

export function SuggestionsFloatingButtons() {
  const { create } = useSuggestions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [defaultType, setDefaultType] = useState<SuggestionType>('suggestion');

  const open = (type: SuggestionType) => {
    setMenuOpen(false);
    setDefaultType(type);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <div ref={menuRef} className="relative z-40 shrink-0">
        <button type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Sugerencias y bugs"
          className="flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:px-3">
          <Lightbulb className="h-4 w-4" />
          <span className="hidden lg:inline">Sugerencias</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        {menuOpen && <div role="menu" className="absolute left-0 top-full z-50 mt-2 w-48 rounded-xl border bg-popover p-1.5 shadow-xl">
          <button type="button" role="menuitem" onClick={() => open('suggestion')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-violet-600 hover:bg-violet-500/10 dark:text-violet-400">
            <Lightbulb className="h-4 w-4" /> Enviar sugerencia
          </button>
          <button type="button" role="menuitem" onClick={() => open('bug')} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400">
            <Bug className="h-4 w-4" /> Reportar bug
          </button>
          <Link href="/sugerencias" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg border-t px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowUpRight className="h-4 w-4" /> Ver todas
          </Link>
        </div>}
      </div>
      <SuggestionComposeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={defaultType}
        onSubmit={create}
      />
    </>
  );
}
