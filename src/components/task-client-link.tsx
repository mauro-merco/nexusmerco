'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function TaskClientLink({ clientId, name, className, onNavigate }: {
  clientId: string; name: string; className?: string; onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/dashboard?client=${encodeURIComponent(clientId)}`}
      className={cn('hover:underline focus-visible:outline-2 focus-visible:outline-primary rounded-sm', className)}
      title={`Abrir ${name} en Centro de Control`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onKeyDown={e => e.stopPropagation()}
      onNavigate={onNavigate}
      draggable={false}
    >
      {name}
    </Link>
  );
}
