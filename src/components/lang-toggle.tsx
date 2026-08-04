'use client';

import { useLangStore } from '@/store/lang-store';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LangToggle({ collapsed }: { collapsed?: boolean }) {
  const { lang, setLang } = useLangStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={lang === 'es' ? 'Cambiar idioma' : 'Change language'}
      className={cn(
        'group relative h-9 w-9 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-transparent hover:shadow-[0_0_16px_rgba(34,211,238,0.35)]',
        collapsed && 'justify-center px-0'
      )}
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
    >
      <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
      <span className="relative">
        <span className="block transition-colors duration-300 group-hover:animate-[wobble_0.6s_ease-in-out_infinite] group-hover:text-primary">
          <span
            key={lang}
            className="block animate-[transition-pop_0.4s_cubic-bezier(0.22,1,0.36,1)_both] text-muted-foreground"
          >
            <Languages className="h-4 w-4" />
          </span>
        </span>
      </span>
    </Button>
  );
}
