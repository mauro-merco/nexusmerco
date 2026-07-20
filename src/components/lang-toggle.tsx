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
      size={collapsed ? 'icon' : 'sm'}
      className={cn('w-full justify-start gap-3', collapsed && 'justify-center px-0')}
      onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
    >
      <Languages className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{lang === 'es' ? 'English' : 'Español'}</span>}
    </Button>
  );
}
