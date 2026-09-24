'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useClients, deleteClient } from '@/lib/hooks/use-clients';
import { NoAccess } from '@/components/no-access';
import { hasModuleAccess, getAllowedClientIds } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ExecutiveDashboard } from '../clients/[id]/executive-dashboard';
import { GoogleAdsTab } from '@/components/google-ads-tab';
import { MetaAdsTab } from '@/components/meta-ads-tab';
import { AnalyticsTab } from '@/components/analytics-tab';
import { FunnelSeoTab } from '@/components/funnel-seo-tab';
import { ShareReportDialog } from '@/components/share-report-dialog';
import { SocialCalendar } from '@/components/social-calendar';
import { AdsCalendar } from '@/components/ads-calendar';
import { ClientTasksTab } from '@/components/client-tasks-tab';
import { ClientProfileSummary } from '@/components/client-profile-summary';
import {
  Building2, Upload, BarChart3, Users, Plus,
  LayoutDashboard, Search, Megaphone, Globe, Activity, Share2,
  ArrowLeft, HelpCircle, Sparkles, ChevronRight, Calendar, Settings, Pencil, Trash2, Loader2, ShoppingBag, KanbanSquare,
  LayoutGrid, List,
} from 'lucide-react';

const TAB_TOOLTIPS: Record<string, string> = {
  executive: 'Métricas generales del negocio: facturación, inversión, ROAS, conversiones y tendencias mensuales.',
  google: 'Rendimiento de campañas de Google Ads: costos, impresiones, clicks, palabras clave y grupos de activos.',
  meta: 'Rendimiento de campañas de Meta Ads (Facebook e Instagram): inversión, alcance, resultados y conjuntos de anuncios.',
  analytics: 'Tráfico del sitio web por canal: sesiones, engagement, revenue y distribución por fuente de tráfico.',
  funnel: 'Embudo de conversión y métricas SEO: adquisición, comportamiento, conversiones y rendimiento orgánico.',
  tasks: 'Tareas en curso e historial de tareas finalizadas para este cliente.',
};

const statusBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | undefined }> = {
  active: { label: 'Activo', variant: 'default' },
  paused: { label: 'Pausado', variant: 'secondary' },
  onboarding: { label: 'Onboarding', variant: 'outline' },
};

// Flat, harmonious category colors reused from the chart palette — one per hue family.
const CATEGORY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];
function colorForClient(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  
  if (!hasModuleAccess(user, 'dashboard')) {
    return <NoAccess message="No tienes permiso para acceder al Centro de Control." />;
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, loading, refetch } = useClients();
  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'operador';
  const canView = user?.role === 'admin' || user?.role === 'operador' || user?.role === 'client';

  const allowedClientIds = getAllowedClientIds(user);
  const allClients = clients.filter(c => {
    if (allowedClientIds === null) return true; // null = all clients
    return allowedClientIds.includes(c.id);
  });
  const activeClients = allClients.filter(c => c.status === 'active' || c.status === 'onboarding');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientView, setClientView] = useState<'menu' | 'analysis' | 'calendar' | 'ads' | null>(null);
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmEnabled = confirmText === 'ELIMINAR';

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !confirmEnabled) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      setConfirmText('');
      refetch();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, confirmEnabled, refetch]);

  // Deep link from global search: ?client=<id>
  useEffect(() => {
    const clientParam = searchParams.get('client');
    if (!clientParam || clientParam === selectedClientId || clients.length === 0) return;
    const client = clients.find(c => c.id === clientParam);
    if (!client) return;
    setSelectedClientId(clientParam);
    setClientView('menu');
  }, [clients, selectedClientId, searchParams]);

  if (!canView) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <BarChart3 className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Sin acceso</p>
        </CardContent>
      </Card>
    );
  }

  const handleBack = () => {
    setClientView(null);
    setSelectedClientId(null);
  };

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setClientView('menu');
  };

  // Client selected + analysis view
  if (selectedClient && clientView === 'analysis') {
    return (
      <TooltipProvider delay={0}>
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Volver
              </Button>
              <div className="h-5 w-px bg-border/50" />
              {selectedClient.logo_url ? (
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
                <p className="text-sm font-bold">{selectedClient.name}</p>
                <p className="text-xs text-muted-foreground">{selectedClient.industry || 'Dashboard de marketing'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClientView('calendar')} className="gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" /> Calendario
              </Button>
              <Tooltip>
                <TooltipTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />} onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="h-3.5 w-3.5" /> Compartir
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end">Generá un link público para compartir este reporte con el cliente</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Tabs defaultValue="executive" className="w-full">
            <TabsList className={cn('grid w-full max-w-3xl', isAdminOrTeam ? 'grid-cols-6' : 'grid-cols-5')}>
              <Tooltip>
                <TooltipTrigger render={<TabsTrigger value="executive" className="gap-1.5" />}>
                  <LayoutDashboard className="h-3.5 w-3.5" /> Resumen General
                </TooltipTrigger>
                <TooltipContent side="bottom">{TAB_TOOLTIPS.executive}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<TabsTrigger value="google" className="gap-1.5" />}>
                  <Search className="h-3.5 w-3.5" /> Google Ads
                </TooltipTrigger>
                <TooltipContent side="bottom">{TAB_TOOLTIPS.google}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<TabsTrigger value="meta" className="gap-1.5" />}>
                  <Megaphone className="h-3.5 w-3.5" /> Meta Ads
                </TooltipTrigger>
                <TooltipContent side="bottom">{TAB_TOOLTIPS.meta}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<TabsTrigger value="analytics" className="gap-1.5" />}>
                  <Globe className="h-3.5 w-3.5" /> Canales
                </TooltipTrigger>
                <TooltipContent side="bottom">{TAB_TOOLTIPS.analytics}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<TabsTrigger value="funnel" className="gap-1.5" />}>
                  <Activity className="h-3.5 w-3.5" /> Embudo & SEO
                </TooltipTrigger>
                <TooltipContent side="bottom">{TAB_TOOLTIPS.funnel}</TooltipContent>
              </Tooltip>
              {isAdminOrTeam && (
                <Tooltip>
                  <TooltipTrigger render={<TabsTrigger value="tasks" className="gap-1.5" />}>
                    <KanbanSquare className="h-3.5 w-3.5" /> Tareas
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{TAB_TOOLTIPS.tasks}</TooltipContent>
                </Tooltip>
              )}
            </TabsList>
            <TabsContent value="executive" className="mt-4">
              <ExecutiveDashboard clientId={selectedClientId!} clientName={selectedClient.name} />
            </TabsContent>
            <TabsContent value="google" className="mt-4">
              <GoogleAdsTab clientId={selectedClientId!} clientName={selectedClient.name} />
            </TabsContent>
            {isAdminOrTeam && (
              <TabsContent value="tasks" className="mt-4">
                <ClientTasksTab clientId={selectedClientId!} />
              </TabsContent>
            )}
            <TabsContent value="meta" className="mt-4">
              <MetaAdsTab clientId={selectedClientId!} clientName={selectedClient.name} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-4">
              <AnalyticsTab clientId={selectedClientId!} clientName={selectedClient.name} />
            </TabsContent>
            <TabsContent value="funnel" className="mt-4">
              <FunnelSeoTab clientId={selectedClientId!} clientName={selectedClient.name} />
            </TabsContent>
          </Tabs>

          <ShareReportDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            clientId={selectedClientId!}
            clientName={selectedClient.name}
            initialEnabled={selectedClient.public_enabled}
            initialDescription={selectedClient.public_description}
            onUpdate={() => refetch()}
          />
        </div>
      </TooltipProvider>
    );
  }

  // Client selected + calendar view
  if (selectedClient && clientView === 'calendar') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="h-5 w-px bg-border/50" />
            {selectedClient.logo_url ? (
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
              <p className="text-sm font-bold">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground">Calendario de Redes</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setClientView('analysis')} className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Centro de Análisis
          </Button>
        </div>
        <SocialCalendar clientId={selectedClientId!} clientName={selectedClient.name} />
      </div>
    );
  }

  // Client selected + ADS calendar view
  if (selectedClient && clientView === 'ads') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="h-5 w-px bg-border/50" />
            {selectedClient.logo_url ? (
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
              <p className="text-sm font-bold">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground">Piezas para ADS</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setClientView('menu')} className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Módulos
          </Button>
        </div>
        <AdsCalendar clientId={selectedClientId!} clientName={selectedClient.name} />
      </div>
    );
  }

  // Client selected + menu (intermediate step)
  if (selectedClient && clientView === 'menu') {
    const hasAnalysis = selectedClient.analysis_enabled;
    const hasCalendar = selectedClient.social_calendar_enabled;
    const hasAds = selectedClient.ads_calendar_enabled;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="h-5 w-px bg-border/50" />
            {selectedClient.logo_url ? (
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
              <p className="text-sm font-bold">{selectedClient.name}</p>
              <p className="text-xs text-muted-foreground">{selectedClient.industry || 'Seleccioná una vista'}</p>
            </div>
          </div>
          {isAdminOrTeam && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => router.push(`/clients/${selectedClient.id}/edit`)}>
              <Settings className="h-3.5 w-3.5" /> Editar cliente
            </Button>
          )}
        </div>

        {isAdminOrTeam && <ClientProfileSummary clientId={selectedClient.id} />}

        {!hasAnalysis && !hasCalendar && !hasAds && (
          <Card className="border-0 ring-0 shadow-none bg-muted/40 rounded-3xl">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Building2 className="h-8 w-8 opacity-30" />
              <p className="text-sm">Este cliente no tiene módulos habilitados todavía.</p>
              {isAdminOrTeam && (
                <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-1" onClick={() => router.push(`/clients/${selectedClient.id}/edit`)}>
                  <Settings className="h-3.5 w-3.5" /> Habilitar módulos
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {hasAnalysis && (
            <Card
              className="group cursor-pointer border-0 ring-0 shadow-none transition-colors duration-200 hover:bg-muted/40 bg-card rounded-3xl w-full"
              onClick={() => setClientView('analysis')}
            >
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="rounded-2xl bg-blue-500/10 p-5 shrink-0 self-start sm:self-center">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold">Centro de Análisis</p>
                  <p className="text-sm text-muted-foreground mt-1">Métricas, campañas, tráfico, embudo y SEO</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px]">Resumen</Badge>
                    <Badge variant="outline" className="text-[10px]">Google Ads</Badge>
                    <Badge variant="outline" className="text-[10px]">Meta Ads</Badge>
                    <Badge variant="outline" className="text-[10px]">Canales</Badge>
                    <Badge variant="outline" className="text-[10px]">Embudo</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 self-center hidden sm:block" />
              </CardContent>
            </Card>
          )}

          {hasCalendar && (
            <Card
              className="group cursor-pointer border-0 ring-0 shadow-none transition-colors duration-200 hover:bg-muted/40 bg-card rounded-3xl w-full"
              onClick={() => setClientView('calendar')}
            >
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-5 shrink-0 self-start sm:self-center">
                  <Calendar className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold">Calendario de Redes</p>
                  <p className="text-sm text-muted-foreground mt-1">Planificá publicaciones, historias, reels y carruseles</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px]">Historias</Badge>
                    <Badge variant="outline" className="text-[10px]">Reels</Badge>
                    <Badge variant="outline" className="text-[10px]">Carruseles</Badge>
                    <Badge variant="outline" className="text-[10px]">Comentarios</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 self-center hidden sm:block" />
              </CardContent>
            </Card>
          )}

          {hasAds && (
            <Card
              className="group cursor-pointer border-0 ring-0 shadow-none transition-colors duration-200 hover:bg-muted/40 bg-card rounded-3xl w-full"
              onClick={() => setClientView('ads')}
            >
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="rounded-2xl bg-violet-500/10 p-5 shrink-0 self-start sm:self-center">
                  <ShoppingBag className="h-8 w-8 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold">Piezas para ADS</p>
                  <p className="text-sm text-muted-foreground mt-1">Calendário de piezas publicitarias con fechas ecommerce</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px]">Piezas</Badge>
                    <Badge variant="outline" className="text-[10px]">Ecommerce</Badge>
                    <Badge variant="outline" className="text-[10px]">Fechas</Badge>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 self-center hidden sm:block" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // No client selected → show client cards
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Centro de Control</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Bienvenido, {user?.full_name}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdminOrTeam && (
            <>
              <Button onClick={() => router.push('/clients/new')} variant="default" size="cta" className="gap-2 rounded-2xl">
                <Plus className="h-4 w-4" /> Nuevo Cliente
              </Button>
              <Button onClick={() => router.push('/wizard')} variant="secondary" size="cta" className="gap-2 rounded-2xl">
                <Upload className="h-4 w-4" /> Cargar CSV
              </Button>
            </>
          )}
          <TooltipProvider delay={0}>
            <Tooltip>
              <TooltipTrigger render={<Button onClick={() => router.push('/clients')} variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground" />}>
                <Users className="h-3.5 w-3.5" /> Ver clientes
              </TooltipTrigger>
              <TooltipContent side="bottom">Administrar todos los clientes y sus configuraciones</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-card border-0 ring-0 shadow-none rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-muted/30 animate-pulse" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted/30 animate-pulse rounded w-2/3" />
                    <div className="h-3 bg-muted/20 animate-pulse rounded w-1/3" />
                  </div>
                </div>
                <div className="h-3 bg-muted/20 animate-pulse rounded w-full mb-2" />
                <div className="h-3 bg-muted/20 animate-pulse rounded w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length > 0 ? (
        <>
          {/* Section intro + layout toggle */}
          <div className="flex items-center gap-3 bg-accent rounded-2xl px-5 py-4">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm text-accent-foreground flex-1">Seleccioná un cliente para explorar sus métricas de marketing digital, campañas y análisis de rendimiento.</span>
            <div className="hidden sm:flex items-center gap-1 bg-background/60 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setLayout('grid')}
                aria-label="Vista grilla"
                className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', layout === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayout('list')}
                aria-label="Vista lista"
                className={cn('flex h-7 w-7 items-center justify-center rounded-lg transition-colors', layout === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Client cards — grid layout */}
          {layout === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeClients.map((client) => {
                const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                const color = colorForClient(client.name);
                return (
                  <Card
                    key={client.id}
                    className="relative group bg-card border-0 ring-0 shadow-none hover:bg-muted/40 transition-colors duration-200 cursor-pointer rounded-3xl"
                    onClick={() => handleSelectClient(client.id)}
                  >
                    <CardContent className="p-5 relative">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {client.logo_url ? (
                            <Avatar className="h-11 w-11 rounded-2xl">
                              <AvatarImage src={client.logo_url} alt={client.name} />
                              <AvatarFallback className="rounded-2xl text-sm font-bold" style={{ background: `color-mix(in oklch, ${color} 18%, var(--card))`, color }}>
                                {client.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm" style={{ background: `color-mix(in oklch, ${color} 18%, var(--card))`, color }}>
                              {client.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold truncate max-w-[180px]">{client.name}</p>
                            {client.industry && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{client.industry}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-lg"
                            onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="rounded-lg text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: client.id, name: client.name });
                              setConfirmText('');
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {client.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{client.description}</p>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={statusInfo.variant} className="text-[10px] px-2.5 py-0 rounded-full">
                          {statusInfo.label}
                        </Badge>
                        {client.campaign_types && client.campaign_types.length > 0 && client.campaign_types.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: `color-mix(in oklch, ${color} 14%, var(--card))`, color }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Client cards — compact list layout */}
          {layout === 'list' && (
            <Card className="border-0 ring-0 shadow-none rounded-3xl overflow-hidden">
              <div className="divide-y divide-border/60">
                {activeClients.map((client) => {
                  const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                  const color = colorForClient(client.name);
                  return (
                    <div
                      key={client.id}
                      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-accent/40 transition-colors cursor-pointer"
                      onClick={() => handleSelectClient(client.id)}
                    >
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0" style={{ background: `color-mix(in oklch, ${color} 18%, var(--card))`, color }}>
                        {client.name.charAt(0)}
                      </div>
                      <div className="w-40 shrink-0 min-w-0">
                        <p className="text-sm font-bold truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{client.industry || '—'}</p>
                      </div>
                      <p className="flex-1 text-xs text-muted-foreground truncate hidden md:block">{client.description || ''}</p>
                      <Badge variant={statusInfo.variant} className="text-[10px] px-2.5 py-0 rounded-full shrink-0">
                        {statusInfo.label}
                      </Badge>
                      <div className="hidden sm:flex gap-1 w-20 shrink-0">
                        {client.campaign_types?.slice(0, 2).map(t => (
                          <span key={t} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: `color-mix(in oklch, ${color} 14%, var(--card))`, color }}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg"
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-lg text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: client.id, name: client.name });
                            setConfirmText('');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Paused or onboarding clients */}
          {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length > 0 && (
            <details className="group">
              <summary className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors list-none flex items-center gap-1.5">
                <ChevronRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length} cliente{clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length !== 1 ? 's' : ''} inactivo{clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length !== 1 ? 's' : ''}
              </summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').map((client) => {
                  const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                  return (
                    <Card key={client.id} className="border-0 ring-0 shadow-none bg-muted/30 rounded-2xl opacity-60 hover:opacity-100 transition-opacity cursor-default">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{client.name}</p>
                          <Badge variant={statusInfo.variant} className="text-[10px] px-2 py-0 mt-0.5 rounded-full">{statusInfo.label}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </details>
          )}
        </>
      ) : (
        <Card className="border-0 ring-0 shadow-none bg-muted/40 rounded-3xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
            <div className="p-4 rounded-2xl bg-accent">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
            <p className="text-base font-semibold">No hay clientes todavía</p>
            <p className="text-sm text-center max-w-md">Creá un cliente para empezar a cargar datos de campañas y ver métricas de marketing digital.</p>
            {isAdminOrTeam && (
              <Button onClick={() => router.push('/clients/new')} variant="default" size="cta" className="gap-2 mt-2 rounded-2xl">
                <Plus className="h-4 w-4" /> Crear Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setConfirmText(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Eliminar cliente
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará permanentemente <strong>{deleteTarget?.name}</strong> y todos sus datos. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Escribí <strong>ELIMINAR</strong> para confirmar:</Label>
            <Input
              placeholder="ELIMINAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              className={cn(confirmText && !confirmEnabled && 'border-destructive/50')}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setConfirmText(''); }} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={!confirmEnabled || deleting} onClick={handleDelete} className="gap-2">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
