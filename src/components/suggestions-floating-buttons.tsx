'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lightbulb, Bug, ChevronDown, ArrowUpRight, BookOpen, Palette } from 'lucide-react';
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
        <button type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-haspopup="menu" aria-label="Recursos, sugerencias y bugs"
          className="flex h-10 items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/5 px-2.5 text-xs font-semibold text-blue-700 transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 dark:text-blue-300 sm:px-3">
          <BookOpen className="h-4 w-4" />
          <span className="hidden lg:inline">Recursos</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        {menuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-1.5 shadow-xl">
          <Link href="/recursos" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted">
            <BookOpen className="h-4 w-4 text-primary" /> Centro de recursos
          </Link>
          <Link href="/recursos/media-kit" role="menuitem" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium hover:bg-muted">
            <Palette className="h-4 w-4 text-primary" /> Media Kit / Branding
          </Link>
          <div className="my-1 border-t" />
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
