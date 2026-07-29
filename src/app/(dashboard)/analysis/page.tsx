'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { DashboardFullbai } from '@/components/dashboard-fullbai';
import { UploadCalendar } from '@/components/upload-calendar';
import { useRouter } from 'next/navigation';
import { BarChart3, Upload, Building2 } from 'lucide-react';

export default function AnalysisPage() {
  const _ = useT();
  const router = useRouter();
  const { user } = useAuthStore();
  const { clients } = useClients();
  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'operador';

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const client = useMemo(() => clients.find((c) => c.id === selectedClientId), [selectedClientId, clients]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Análisis</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Explorá los datos de cada cliente, semana a semana.
          </p>
        </div>
        {isAdminOrTeam && (
          <Button onClick={() => router.push('/wizard')} className="gap-2 shrink-0">
            <Upload className="h-4 w-4" /> Cargar CSV
          </Button>
        )}
      </div>

      {/* Client Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-64">
          <Select value={selectedClientId ?? ''} onValueChange={(v) => { setSelectedClientId(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar cliente">
                {client?.name || ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span>{c.name}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{c.plan}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {client && (
          <Badge variant={client.status === 'active' ? 'default' : client.status === 'paused' ? 'secondary' : 'outline'} className="capitalize">
            {client.status} — {client.industry || 'Sin industria'}
          </Badge>
        )}
      </div>

      {!client ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <BarChart3 className="h-12 w-12 opacity-30" />
            <p className="text-lg font-medium">Seleccioná un cliente</p>
            <p className="text-sm">Elegí un cliente para ver sus métricas semanales.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <UploadCalendar clientId={client.id} />
          <DashboardFullbai clientId={client.id} clientName={client.name} />
        </>
      )}
    </div>
  );
}
