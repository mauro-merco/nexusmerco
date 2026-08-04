'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/use-t';
import { Cable, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function IntegrationsPage() {
  const _ = useT();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{_('integrations.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{_('integrations.subtitle')}</p>
        </div>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" disabled>
          <RefreshCw className="h-4 w-4" /> {_('integrations.refreshAll')}
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <Cable className="h-16 w-16 opacity-20" />
          <p className="text-lg font-medium">Sin integraciones configuradas</p>
          <p className="text-sm text-center max-w-md">
            Configurá las conexiones con Google Ads, Meta Ads, Shopify y más. 
            Primero creá un cliente para empezar.
          </p>
          <Button onClick={() => router.push('/clients/new')} variant="cta" className="mt-2">
            Crear Cliente
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
