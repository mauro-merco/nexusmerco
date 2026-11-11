'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
import { UnifiedCalendar } from '@/components/unified-calendar';
import { ClientTasksTab } from '@/components/client-tasks-tab';
import { ClientProfileSummary } from '@/components/client-profile-summary';
import {
  Building2, BarChart3, Plus,
  LayoutDashboard, Search, Megaphone, Globe, Activity, Share2,
  ArrowLeft, HelpCircle, ChevronRight, Calendar, Settings, Pencil, Trash2, Loader2, ShoppingBag, KanbanSquare,
  LayoutGrid, List, ArrowUpRight,
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
  const selectedClient = allClients.find(c => c.id === selectedClientId);
  const appliedClientParam = useRef<string | null>(null);
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
    if (!clientParam) { appliedClientParam.current = null; return; }
    if (clientParam === appliedClientParam.current || loading) return;
    const client = clients.find(c => c.id === clientParam && (allowedClientIds === null || allowedClientIds.includes(c.id)));
    if (!client) return;
    appliedClientParam.current = clientParam;
    setSelectedClientId(clientParam);
    setClientView('menu');
  }, [clients, loading, allowedClientIds, searchParams]);

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
    if (searchParams.has('client')) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('client');
      router.replace(`/dashboard${params.size ? `?${params}` : ''}`, { scroll: false });
    }
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
        <UnifiedCalendar clientId={selectedClientId!} clientName={selectedClient.name} />
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
        <UnifiedCalendar clientId={selectedClientId!} clientName={selectedClient.name} />
      </div>
    );
  }

  // Client selected + menu (intermediate step)
  if (selectedClient && clientView === 'menu') {
    const hasAnalysis = selectedClient.analysis_enabled;
    const hasCalendar = selectedClient.social_calendar_enabled;
    const hasAds = selectedClient.ads_calendar_enabled;

    const clientInitials = selectedClient.name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const clientStatus = statusBadge[selectedClient.status]?.label || 'Pausado';
    const clientModules = [
      { key: 'analysis', enabled: hasAnalysis, view: 'analysis' as const, icon: BarChart3, label: 'Centro de Análisis', desc: 'Métricas, campañas, tráfico, embudo y SEO', tags: ['Resumen', 'Google Ads', 'Meta Ads', 'Canales', 'Embudo'], tint: 'bg-tint-blue text-tint-blue-foreground' },
      { key: 'calendar', enabled: hasCalendar, view: 'calendar' as const, icon: Calendar, label: 'Calendario de Redes', desc: 'Planificá publicaciones, historias, reels y carruseles', tags: ['Historias', 'Reels', 'Carruseles', 'Comentarios'], tint: 'bg-tint-sky text-tint-sky-foreground' },
      { key: 'ads', enabled: hasAds, view: 'ads' as const, icon: ShoppingBag, label: 'Piezas para ADS', desc: 'Calendario de piezas publicitarias con fechas ecommerce', tags: ['Piezas', 'Ecommerce', 'Fechas'], tint: 'bg-tint-red text-tint-red-foreground' },
    ].filter(m => m.enabled);

    return (
      <div className="space-y-6 pb-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={handleBack}
              aria-label="Volver"
              className="mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="mb-2 truncate text-xs text-muted-foreground">
                Centro de Control <span className="mx-1.5">→</span> {selectedClient.name}
              </p>
              <div className="flex min-w-0 items-center gap-3.5">
                {selectedClient.logo_url ? (
                  <Avatar className="h-12 w-12 shrink-0 rounded-2xl">
                    <AvatarImage src={selectedClient.logo_url} alt={selectedClient.name} />
                    <AvatarFallback className="rounded-2xl text-sm font-bold">{clientInitials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-tint-blue text-sm font-bold text-tint-blue-foreground">{clientInitials}</div>
                )}
                <div className="min-w-0">
                  <h1 className="break-words text-[1.7rem] font-normal leading-tight tracking-tight sm:text-[2.1rem] md:text-[2.4rem]">{selectedClient.name}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-tint-blue px-2.5 py-0.5 text-[11px] font-semibold text-tint-blue-foreground">{clientStatus}</span>
                    {selectedClient.industry && <span className="text-sm text-muted-foreground">{selectedClient.industry}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {isAdminOrTeam && (
            <button
              type="button"
              onClick={() => router.push(`/clients/${selectedClient.id}/edit`)}
              className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full border border-border bg-card px-5 text-[13px] font-medium transition-colors hover:bg-muted"
            >
              <Settings className="h-4 w-4" /> Editar cliente
            </button>
          )}
        </div>

        {clientModules.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[1.6rem] border border-border bg-card py-12 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-30" />
            <p className="text-sm">Este cliente no tiene módulos habilitados todavía.</p>
            {isAdminOrTeam && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-1" onClick={() => router.push(`/clients/${selectedClient.id}/edit`)}>
                <Settings className="h-3.5 w-3.5" /> Habilitar módulos
              </Button>
            )}
          </div>
        )}

        {/* MÓDULOS: el acceso principal, en filas a lo ancho */}
        {clientModules.length > 0 && (
          <div className="space-y-2.5">
            {clientModules.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setClientView(m.view)}
                  className="group flex w-full items-center gap-4 rounded-[1.6rem] border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface-inset md:px-5"
                >
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', m.tint)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{m.label}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{m.desc}</span>
                  </span>
                  <span className="hidden flex-wrap justify-end gap-1.5 lg:flex">
                    {m.tags.map(tag => (
                      <span key={tag} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{tag}</span>
                    ))}
                  </span>
                  <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isAdminOrTeam && <ClientProfileSummary clientId={selectedClient.id} />}
      </div>
    );
  }

  // No client selected → show client cards
  // ── Datos derivados solo para mostrar (no cambian la lógica de la vista) ──
  const countActive = allClients.filter(c => c.status === 'active').length;
  const countOnboarding = allClients.filter(c => c.status === 'onboarding').length;
  const countPaused = allClients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length;
  const countTotal = allClients.length;
  const onboardingClients = allClients.filter(c => c.status === 'onboarding');
  const statusMax = Math.max(countActive, countOnboarding, countPaused, 1);
  const campaignTally = Object.entries(
    activeClients.reduce<Record<string, number>>((acc, c) => {
      (c.campaign_types || []).forEach(t => { acc[t] = (acc[t] || 0) + 1; });
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const campaignTotal = campaignTally.reduce((s, [, n]) => s + n, 0);
  const DONUT_COLORS = ['var(--brand-blue)', 'var(--brand-sky)', 'var(--brand-red)', 'var(--chart-4)', 'var(--chart-5)'];
  let donutAcc = 0;
  const donutStops = campaignTally.slice(0, 5).map(([, n], i) => {
    const from = (donutAcc / Math.max(campaignTotal, 1)) * 100;
    donutAcc += n;
    const to = (donutAcc / Math.max(campaignTotal, 1)) * 100;
    return `${DONUT_COLORS[i]} ${from}% ${to}%`;
  });
  const donutBg = campaignTotal > 0 ? `conic-gradient(${donutStops.join(', ')}, var(--track) 0)` : 'var(--track)';
  const topCampaignPct = campaignTotal > 0 ? Math.round((campaignTally[0][1] / campaignTotal) * 100) : 0;
  const CLIENT_TINTS = [
    'bg-tint-blue text-tint-blue-foreground',
    'bg-tint-sky text-tint-sky-foreground',
    'bg-tint-red text-tint-red-foreground',
  ];
  const tintForClient = (key: string) => {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return CLIENT_TINTS[hash % CLIENT_TINTS.length];
  };
  const statusPill = (status: string) =>
    status === 'active'
      ? 'bg-tint-blue text-tint-blue-foreground'
      : status === 'onboarding'
        ? 'bg-tint-red text-tint-red-foreground'
        : 'bg-muted text-muted-foreground';
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roundBtn = 'flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-muted';

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 pt-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Inicio <span className="mx-1.5">→</span> Centro de Control</p>
          <h1 className="text-[2.1rem] font-normal leading-tight tracking-tight text-foreground md:text-[2.4rem]">Centro de Control</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bienvenido, {user?.full_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Vista" className="flex rounded-full border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setLayout('grid')}
              aria-label="Vista grilla"
              className={cn('flex h-8 w-9 items-center justify-center rounded-full transition-colors', layout === 'grid' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setLayout('list')}
              aria-label="Vista lista"
              className={cn('flex h-8 w-9 items-center justify-center rounded-full transition-colors', layout === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          {isAdminOrTeam && (
            <button
              type="button"
              onClick={() => router.push('/clients/new')}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-72 rounded-[1.6rem] border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : clients.length > 0 ? (
        <>
          {/* BENTO: resumen de cartera */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_0.8fr]">
            {/* Cartera */}
            <div className="relative flex min-h-[340px] flex-col overflow-hidden rounded-[1.6rem] border border-border bg-card p-5">
              <div aria-hidden className="pointer-events-none absolute -right-14 -top-10 h-60 w-60 rounded-full opacity-80 blur-[6px] dark:opacity-90" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 38%, #1A73E8 62%, transparent 72%)' }} />
              <div aria-hidden className="pointer-events-none absolute -left-10 bottom-16 h-36 w-36 rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #EA4335 0%, transparent 70%)' }} />
              <p className="relative text-[15px] font-medium">Cartera de clientes</p>
              <div className="relative flex-1" />
              <p className="relative text-xs text-muted-foreground">Clientes activos</p>
              <p className="relative mb-3 mt-0.5 text-6xl font-light leading-none tracking-tight">{countActive}</p>
              <div className="relative mb-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                {countActive > 0 && <div className="rounded-full" style={{ flex: countActive, background: 'linear-gradient(90deg, #1A73E8, #8AB4F8)' }} />}
                {countOnboarding > 0 && <div className="rounded-full bg-brand-red" style={{ flex: countOnboarding }} />}
                {countPaused > 0 && <div className="rounded-full bg-track" style={{ flex: countPaused }} />}
                {countTotal === 0 && <div className="flex-1 rounded-full bg-track" />}
              </div>
              <div className="relative flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-blue" />Activos</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-red" />Onboarding {countOnboarding}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-track" />Pausados {countPaused}</span>
              </div>
              {isAdminOrTeam && (
                <div className="relative mt-4 flex items-center gap-2.5 rounded-2xl bg-surface-inset py-2.5 pl-4 pr-2.5">
                  <span className="flex-1 text-[13px]">Cargá los datos de la semana</span>
                  <button type="button" onClick={() => router.push('/wizard')} className="bg-brand-gradient h-8 rounded-full px-3.5 text-xs font-semibold">
                    Asistente
                  </button>
                </div>
              )}
            </div>

            {/* Clientes por estado */}
            <div className="relative flex min-h-[340px] flex-col rounded-[1.6rem] border border-border bg-card p-5">
              <div className="card-notch">
                <button type="button" onClick={() => router.push('/clients')} aria-label="Ver todos los clientes" className={roundBtn}>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[15px] font-medium">Clientes por estado</p>
              <p className="mt-3 text-xs text-muted-foreground">Total en la agencia</p>
              <p className="text-4xl font-light">{countTotal}</p>
              <div className="flex flex-1 items-end gap-3 pt-4">
                {[
                  { label: 'Activos', n: countActive, bar: 'bg-gradient-to-b from-brand-sky to-brand-blue', pill: 'bg-foreground text-background' },
                  { label: 'Onboarding', n: countOnboarding, bar: 'bg-tint-red', pill: 'border border-border bg-card' },
                  { label: 'Pausados', n: countPaused, bar: 'bg-track', pill: 'border border-border bg-card' },
                ].map(b => (
                  <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', b.pill)}>{b.n}</span>
                    <div className={cn('w-full rounded-2xl', b.bar)} style={{ height: Math.max(22, Math.round((b.n / statusMax) * 150)) }} />
                    <span className="text-xs text-muted-foreground">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tipos de campaña */}
            <div className="relative flex min-h-[340px] flex-col rounded-[1.6rem] border border-border bg-card p-5">
              <p className="text-[15px] font-medium">Tipos de campaña</p>
              <div className="flex flex-1 items-center justify-center py-3">
                <div className="flex h-40 w-40 items-center justify-center rounded-full" style={{ background: donutBg }}>
                  <div className="flex h-[6.4rem] w-[6.4rem] flex-col items-center justify-center rounded-full bg-card text-center">
                    <span className="text-3xl font-light">{campaignTotal > 0 ? `${topCampaignPct}%` : '—'}</span>
                    <span className="max-w-[5.5rem] truncate text-[11px] text-muted-foreground">{campaignTally[0]?.[0] || 'Sin datos'}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between gap-2">
                {campaignTally.slice(0, 3).map(([name, n], i) => (
                  <div key={name} className="min-w-0">
                    <p className="text-xl font-light">{n}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i] }} />{name}
                    </p>
                  </div>
                ))}
                {campaignTally.length === 0 && <p className="text-xs text-muted-foreground">Asigná tipos de campaña a tus clientes para verlos acá.</p>}
              </div>
            </div>

            {/* Onboarding */}
            <div className="bg-brand-sky-gradient flex min-h-[340px] flex-col rounded-[1.6rem] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.07em]">Onboarding</p>
              <div className="flex-1" />
              <p className="text-5xl font-light leading-none">{countOnboarding}</p>
              <p className="mb-3 mt-1.5 text-[13px]">{countOnboarding === 1 ? 'cliente configurándose' : 'clientes configurándose'}</p>
              <div className="space-y-1.5">
                {onboardingClients.slice(0, 3).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClient(c.id)}
                    className="flex w-full items-center justify-between rounded-xl bg-white/40 px-3 py-2 text-left text-[13px] font-semibold transition-colors hover:bg-white/60"
                  >
                    <span className="truncate">{c.name}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CLIENTES */}
          <div className="flex items-center gap-2.5 pt-2">
            <h2 className="text-xl font-normal">Clientes</h2>
            <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{activeClients.length}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">· Elegí uno para ver sus métricas, campañas y calendario</span>
          </div>

          {/* Client cards — grid layout */}
          {layout === 'grid' && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {activeClients.map((client) => {
                const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                return (
                  <div
                    key={client.id}
                    className="group relative flex cursor-pointer flex-col gap-3.5 rounded-[1.5rem] border border-border bg-card p-5 transition-colors hover:border-primary/40"
                    onClick={() => handleSelectClient(client.id)}
                  >
                    <div className="card-notch">
                      <button
                        type="button"
                        aria-label={`Editar ${client.name}`}
                        className={roundBtn}
                        onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Eliminar ${client.name}`}
                        className={cn(roundBtn, 'hover:text-destructive hover:bg-destructive/10')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: client.id, name: client.name });
                          setConfirmText('');
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-full transition-transform group-hover:scale-105">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pr-28">
                      {client.logo_url ? (
                        <Avatar className="h-11 w-11 rounded-2xl">
                          <AvatarImage src={client.logo_url} alt={client.name} />
                          <AvatarFallback className={cn('rounded-2xl text-sm font-bold', tintForClient(client.name))}>
                            {initials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold', tintForClient(client.name))}>
                          {initials(client.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">{client.name}</p>
                        {client.industry && <p className="truncate text-xs text-muted-foreground">{client.industry}</p>}
                      </div>
                    </div>

                    {client.description && (
                      <p className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{client.description}</p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill(client.status))}>
                        {statusInfo.label}
                      </span>
                      {client.campaign_types?.slice(0, 3).map(t => (
                        <span key={t} className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Client cards — compact list layout */}
          {layout === 'list' && (
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
              <div className="divide-y divide-border">
                {activeClients.map((client) => {
                  const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                  return (
                    <div
                      key={client.id}
                      className="group flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                      onClick={() => handleSelectClient(client.id)}
                    >
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold', tintForClient(client.name))}>
                        {initials(client.name)}
                      </div>
                      <div className="w-44 min-w-0 shrink-0">
                        <p className="truncate text-sm font-semibold">{client.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{client.industry || '—'}</p>
                      </div>
                      <p className="hidden flex-1 truncate text-xs text-muted-foreground md:block">{client.description || ''}</p>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', statusPill(client.status))}>
                        {statusInfo.label}
                      </span>
                      <div className="hidden w-24 shrink-0 gap-1 sm:flex">
                        {client.campaign_types?.slice(0, 2).map(t => (
                          <span key={t} className="truncate rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label={`Editar ${client.name}`}
                          className={roundBtn}
                          onClick={(e) => { e.stopPropagation(); router.push(`/clients/${client.id}/edit`); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar ${client.name}`}
                          className={cn(roundBtn, 'hover:text-destructive hover:bg-destructive/10')}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ id: client.id, name: client.name });
                            setConfirmText('');
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paused or onboarding clients */}
          {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length} cliente{clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length !== 1 ? 's' : ''} inactivo{clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clients.filter(c => c.status !== 'active' && c.status !== 'onboarding').map((client) => {
                  const statusInfo = statusBadge[client.status] || statusBadge.onboarding;
                  return (
                    <div key={client.id} className="flex cursor-default items-center gap-3 rounded-2xl border border-dashed border-border p-4 opacity-70 transition-opacity hover:opacity-100">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{client.name}</p>
                        <span className={cn('mt-0.5 inline-block rounded-full px-2 py-0 text-[10px] font-semibold', statusPill(client.status))}>{statusInfo.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-[1.6rem] border border-border bg-card px-6 py-16 text-muted-foreground">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60 blur-[6px]" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 40%, transparent 70%)' }} />
          <div className="relative rounded-2xl bg-tint-blue p-4">
            <Building2 className="h-10 w-10 text-tint-blue-foreground" />
          </div>
          <p className="relative text-base font-semibold text-foreground">No hay clientes todavía</p>
          <p className="relative max-w-md text-center text-sm">Creá un cliente para empezar a cargar datos de campañas y ver métricas de marketing digital.</p>
          {isAdminOrTeam && (
            <button
              type="button"
              onClick={() => router.push('/clients/new')}
              className="bg-brand-gradient shadow-brand relative mt-2 inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> Crear cliente
            </button>
          )}
        </div>
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
