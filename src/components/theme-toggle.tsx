'use client';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      suppressHydrationWarning
      className={cn(
        'group relative h-9 w-9 rounded-xl transition-all duration-300 hover:scale-110 hover:bg-transparent hover:shadow-[0_0_16px_rgba(34,211,238,0.35)]',
        collapsed && 'justify-center px-0'
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-40" />
      <span className="relative transition-transform duration-700 group-hover:rotate-[360deg]">
        <span
          key={isDark ? 'sun' : 'moon'}
          className="block animate-[transition-flip_0.5s_ease-out_both] text-muted-foreground transition-colors duration-300 group-hover:text-primary"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </span>
      </span>
    </Button>
  );
}
