'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/use-t';
import { KanbanSquare, Plus } from 'lucide-react';

export default function OperationsPage() {
  const _ = useT();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{_('operations.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{_('operations.subtitle')}</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" disabled>
          <Plus className="h-4 w-4" /> {_('operations.newTask')}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <KanbanSquare className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Sin tareas todavía</p>
          <p className="text-sm text-center max-w-md">
            Las tareas y optimizaciones aparecerán acá cuando empieces a cargar reportes de clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
