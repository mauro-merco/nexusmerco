'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export function NoAccess({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12 opacity-30" />
        <p className="text-base font-medium">Sin acceso</p>
        {message && <p className="text-sm text-center max-w-md">{message}</p>}
      </CardContent>
    </Card>
  );
}
