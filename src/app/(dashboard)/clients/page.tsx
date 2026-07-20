'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Search, Building2, BarChart3, Plus, Loader2, Sparkles } from 'lucide-react';

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const _ = useT();
  const { clients, loading, error } = useClients();
  const [search, setSearch] = useState('');
  const [initMultipoint, setInitMultipoint] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);

  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'team';

  async function handleInitMultipoint() {
    setInitMultipoint(true);
    setInitMsg(null);
    try {
      const res = await fetch('/api/clients/init-multipoint', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setInitMsg(json.message);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setInitMsg('Error: ' + (e instanceof Error ? e.message : 'Error'));
    } finally {
      setInitMultipoint(false);
    }
  }
  const filteredClients = clients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{_('clients.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {user?.role === 'client' ? _('clients.subtitleClient') : _('clients.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {initMsg && (
            <span className={cn(
              'text-xs px-3 py-1.5 rounded-full',
              initMsg.startsWith('Error') ? 'bg-red-500/10 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
            )}>
              {initMsg}
            </span>
          )}
          {isAdminOrTeam && clients.length === 0 && (
            <Button variant="outline" className="gap-2 shrink-0" onClick={handleInitMultipoint} disabled={initMultipoint}>
              {initMultipoint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Inicializar Multipoint
            </Button>
          )}
          {isAdminOrTeam && (
            <Button onClick={() => router.push('/clients/new')} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={_('clients.search')}
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Cargando clientes...</p>
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-destructive gap-2">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="transition-shadow hover:shadow-md cursor-pointer" onClick={() => router.push(`/clients/${client.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="lg" className="shrink-0">
                      <AvatarImage src={client.logo_url || undefined} alt={client.name} />
                      <AvatarFallback>{client.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-lg truncate">{client.name}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{client.industry || 'Sin industria'}</p>
                    </div>
                  </div>
                  <Badge variant={statusColor(client.status) as 'default' | 'secondary' | 'outline'} className="capitalize shrink-0">
                    {client.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.campaign_types && client.campaign_types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.campaign_types.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                        {p.replace('_ads', '').replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                )}
                {client.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{client.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Plan: <span className="font-medium capitalize">{client.plan}</span></span>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}`); }}>
                  <BarChart3 className="h-3 w-3" /> Ver Análisis
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
          <Building2 className="h-12 w-12 opacity-50" />
          <p>{_('clients.noClients')}</p>
          {isAdminOrTeam && (
            <Button onClick={() => router.push('/clients/new')} variant="outline">
              Crear primer cliente
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
