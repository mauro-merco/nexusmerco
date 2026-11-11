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
        'group relative h-8 w-8 rounded-lg transition-colors hover:bg-muted',
        collapsed && 'justify-center px-0'
      )}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="relative transition-transform duration-700 ">
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
