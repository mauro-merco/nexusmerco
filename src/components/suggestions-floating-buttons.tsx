'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Bug } from 'lucide-react';
import { SuggestionComposeDialog } from '@/components/suggestion-compose-dialog';
import { useSuggestions } from '@/lib/hooks/use-suggestions';
import type { SuggestionType } from '@/lib/types';

export function SuggestionsFloatingButtons() {
  const router = useRouter();
  const { create } = useSuggestions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<SuggestionType>('suggestion');

  const open = (type: SuggestionType) => {
    setDefaultType(type);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="fixed bottom-[4.75rem] md:bottom-6 left-4 md:left-6 z-40 flex flex-col gap-2">
        <button type="button" onClick={() => open('suggestion')} title="Enviar sugerencia"
          className="group flex items-center gap-2 rounded-full border border-violet-500/40 bg-background/80 backdrop-blur px-3 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 shadow-lg transition-all hover:scale-105 hover:bg-violet-500/10">
          <Lightbulb className="h-4 w-4" />
          <span className="hidden md:inline">Sugerencia</span>
        </button>
        <button type="button" onClick={() => open('bug')} title="Reportar bug"
          className="group flex items-center gap-2 rounded-full border border-red-500/40 bg-background/80 backdrop-blur px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 shadow-lg transition-all hover:scale-105 hover:bg-red-500/10">
          <Bug className="h-4 w-4" />
          <span className="hidden md:inline">Reportar bug</span>
        </button>
        <button type="button" onClick={() => router.push('/sugerencias')} title="Ver muro de sugerencias"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur text-muted-foreground shadow-lg transition-all hover:scale-105 hover:text-primary hover:border-primary/40">
          <Lightbulb className="h-4 w-4" />
        </button>
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