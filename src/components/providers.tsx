'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import { installApiAuth } from '@/lib/install-api-auth';
import { TaskClosureDialog } from '@/components/task-closure-dialog';

export function Providers({ children }: { children: React.ReactNode }) {
  installApiAuth();
  return (
    <ThemeProvider>
      <TooltipProvider>{children}<TaskClosureDialog /></TooltipProvider>
    </ThemeProvider>
  );
}
