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
        'group relative h-8 w-8 rounded-lg transition-colors hover:bg-muted',
        collapsed && 'justify-center px-0'
      )}
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
    >
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
