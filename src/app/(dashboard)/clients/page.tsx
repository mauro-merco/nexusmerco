'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients, deleteClient } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { useT } from '@/lib/use-t';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Search, Building2, BarChart3, Plus, Loader2, Sparkles, Pencil, Trash2, AlertTriangle,
} from 'lucide-react';

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const _ = useT();
  const { clients, loading, error, refetch } = useClients();
  const [search, setSearch] = useState('');
  const [initMultipoint, setInitMultipoint] = useState(false);
  const [initMsg, setInitMsg] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'operador';

  const confirmEnabled = confirmText === 'ELIMINAR';

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !confirmEnabled) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      setConfirmText('');
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, confirmEnabled, refetch]);

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
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}`); }}>
                    <BarChart3 className="h-3 w-3" /> Ver Análisis
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: client.id, name: client.name });
                      setConfirmText('');
                      setDeleteError(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setConfirmText(''); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Eliminar cliente
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente <strong>{deleteTarget?.name}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Escribí <strong className="text-foreground">ELIMINAR</strong> para confirmar:
            </p>
            <Input
              placeholder="ELIMINAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className={cn(confirmText && !confirmEnabled && 'border-destructive/50')}
            />
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteTarget(null); setConfirmText(''); setDeleteError(null); }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!confirmEnabled || deleting}
              onClick={handleDelete}
              className="gap-2"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
