'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useT } from '@/lib/use-t';
import { useClients } from '@/lib/hooks/use-clients';
import { SocialCalendar } from '@/components/social-calendar';
import { cn } from '@/lib/utils';
import {
  Building2, Search, Calendar, ArrowLeft, Loader2, ChevronRight,
} from 'lucide-react';

export default function CalendariosPage() {
  const { user } = useAuthStore();
  const _ = useT();
  const { clients, loading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isClientUser = user?.role === 'client';

  const calendarClients = clients.filter(c => c.social_calendar_enabled);
  const filteredClients = calendarClients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // Client user: show their own calendar directly (if enabled)
  if (isClientUser && user?.client_id) {
    const client = clients.find(c => c.id === user.client_id);
    if (!client?.social_calendar_enabled) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
          <Calendar className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Calendario no disponible</p>
          <p className="text-sm">El calendario de redes no está habilitado para tu cuenta.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {client?.logo_url ? (
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={client.logo_url} alt={client.name} />
              <AvatarFallback className="rounded-lg text-xs">{client.name.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold">{client?.name || 'Calendario de Redes'}</p>
            <p className="text-xs text-muted-foreground">Calendario de clientes</p>
          </div>
        </div>
        <SocialCalendar clientId={user.client_id} clientName={client?.name || 'Mi Calendario'} />
      </div>
    );
  }

  // Admin/operador: show client selector
  if (!selectedClientId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calendario de clientes</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Seleccioná un cliente para ver su calendario de publicaciones
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 bg-card/50 backdrop-blur-xl"
              onClick={() => setSelectedClientId(client.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {client.logo_url ? (
                      <Avatar className="h-10 w-10 rounded-xl ring-2 ring-border/30">
                        <AvatarImage src={client.logo_url} alt={client.name} />
                        <AvatarFallback className="rounded-xl text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                          {client.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-border/30">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold truncate max-w-[180px]">{client.name}</p>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{client.industry}</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 p-2 group-hover:scale-105 transition-transform">
                    <Calendar className="h-5 w-5 text-emerald-500" />
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all ml-auto mt-3" />
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
            <Building2 className="h-12 w-12 opacity-50" />
            <p>No hay clientes con calendario habilitado</p>
          </div>
        )}
      </div>
    );
  }

  // Calendar view for admin/operador
  const selectedClient = clients.find(c => c.id === selectedClientId);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedClientId(null)} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div className="h-5 w-px bg-border/50" />
        {selectedClient?.logo_url ? (
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={selectedClient.logo_url} alt={selectedClient.name} />
            <AvatarFallback className="rounded-lg text-xs">{selectedClient.name.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
        )}
        <div>
          <p className="text-sm font-bold">{selectedClient?.name}</p>
            <p className="text-xs text-muted-foreground">Calendario de clientes</p>
          </div>
        </div>
      {selectedClient && (
        <SocialCalendar clientId={selectedClient.id} clientName={selectedClient.name} />
      )}
    </div>
  );
}
