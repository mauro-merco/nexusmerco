import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type SkeletonVariant = 'cards' | 'list' | 'comments' | 'calendar' | 'board' | 'form' | 'report';

export function ContentSkeleton({ variant = 'list', className, label = 'Cargando contenido' }: {
  variant?: SkeletonVariant;
  className?: string;
  label?: string;
}) {
  return (
    <div role="status" className={cn('w-full min-w-0 space-y-4', className)}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-4">
        {variant === 'calendar' ? <>
          <div className="flex items-center justify-between gap-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-24" /></div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
            {Array.from({ length: 7 }, (_, i) => <div key={i} className="bg-card p-2"><Skeleton className="h-4 w-8 max-w-full" /></div>)}
            {Array.from({ length: 35 }, (_, i) => <div key={i} className="min-h-20 bg-card p-2 sm:min-h-28"><Skeleton className="h-3 w-4" />{i % 3 === 0 && <Skeleton className="mt-4 h-6 w-full" />}</div>)}
          </div>
        </> : variant === 'report' ? <>
          <Skeleton className="h-8 w-56 max-w-full" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3 rounded-2xl border p-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-24" /></div>)}</div>
          <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
        </> : variant === 'form' ? <div className="space-y-6 rounded-2xl border p-5">
          <Skeleton className="h-7 w-40" />
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full" /></div>)}
        </div> : variant === 'cards' || variant === 'board' ? <div className={cn('grid gap-4', variant === 'board' ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3')}>
          {Array.from({ length: variant === 'board' ? 4 : 6 }, (_, i) => <div key={i} className="space-y-4 rounded-2xl border bg-card p-5"><Skeleton className="h-9 w-9 rounded-xl" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-2/3" />{variant === 'board' && <Skeleton className="h-32 w-full" />}</div>)}
        </div> : <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="flex gap-3 rounded-xl border p-3"><Skeleton className="h-9 w-9 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-3"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-full" />{variant === 'comments' && <Skeleton className="h-3 w-2/3" />}</div></div>)}
        </div>}
      </div>
    </div>
  );
}

export function PageSkeleton({ variant = 'cards' }: { variant?: SkeletonVariant }) {
  return <div className="mx-auto w-full max-w-7xl space-y-6 p-4"><div aria-hidden="true" className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64 max-w-full" /></div><ContentSkeleton variant={variant} /></div>;
}
