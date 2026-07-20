'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { AggregatedMetrics } from '@/lib/data-helper';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopPerformersProps {
  metrics: AggregatedMetrics;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-AR').format(value);
}

export function TopPerformers({ metrics }: TopPerformersProps) {
  const googleCampaigns = metrics.topCampaigns
    .filter(c => c.platform === 'Google Ads')
    .slice(0, 10);

  const metaCampaigns = metrics.topCampaigns
    .filter(c => c.platform === 'Meta Ads')
    .slice(0, 10);

  const allCampaigns = metrics.topCampaigns.slice(0, 15);

  function getRoasVariant(roas: number): { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string } {
    if (roas >= 5) return { variant: 'default', label: 'Excelente' };
    if (roas >= 3) return { variant: 'secondary', label: 'Bueno' };
    if (roas >= 2) return { variant: 'outline', label: 'Regular' };
    return { variant: 'destructive', label: 'Bajo' };
  }

  const CampaignTable = ({ campaigns, platform }: { campaigns: typeof allCampaigns; platform: string }) => (
    <div className="rounded-md border border-border/50 dark:border-gray-800">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-muted-foreground">#</TableHead>
            <TableHead className="text-muted-foreground">Campaña</TableHead>
            <TableHead className="text-right text-muted-foreground">ROAS</TableHead>
            <TableHead className="text-right text-muted-foreground">Inversión</TableHead>
            <TableHead className="text-right text-muted-foreground">Ingresos</TableHead>
            <TableHead className="text-right text-muted-foreground">Conv.</TableHead>
            <TableHead className="text-right text-muted-foreground hidden md:table-cell">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                No hay datos de {platform} disponibles
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((campaign, index) => {
              const badge = getRoasVariant(campaign.roas);
              return (
                <TableRow key={`${campaign.name}-${index}`} className="hover:bg-muted/30 dark:hover:bg-gray-800/50">
                  <TableCell className="font-medium text-muted-foreground text-xs">{index + 1}</TableCell>
                  <TableCell className="font-medium max-w-[220px] truncate text-foreground" title={campaign.name}>
                    {campaign.name}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-bold',
                    campaign.roas >= 2 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {campaign.roas.toFixed(2)}x
                  </TableCell>
                  <TableCell className="text-right text-foreground">{formatCurrency(campaign.spend)}</TableCell>
                  <TableCell className="text-right font-medium text-foreground">{formatCurrency(campaign.revenue)}</TableCell>
                  <TableCell className="text-right text-foreground">{formatNumber(campaign.conversions)}</TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    <Badge variant={badge.variant} className="text-xs">
                      {badge.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur dark:bg-gray-900/50 dark:border-gray-800/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg text-foreground">Top Performers — Bajada Táctica</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">Campañas con mejor rendimiento ordenadas por ROAS</p>
      </CardHeader>
      <CardContent>
        {/* Platform summaries */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 dark:bg-blue-500/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-foreground">Google Ads</h4>
              <Badge variant="outline" className="text-xs">{googleCampaigns.length} campañas</Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inversión Total:</span>
                <span className="font-medium text-foreground">{formatCurrency(metrics.platforms.google.spend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ROAS Promedio:</span>
                <span className={cn(
                  'font-bold',
                  metrics.platforms.google.roas >= 2 ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {metrics.platforms.google.roas.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversiones:</span>
                <span className="font-medium text-foreground">{formatNumber(metrics.platforms.google.conversions)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20 dark:bg-purple-500/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm text-foreground">Meta Ads</h4>
              <Badge variant="outline" className="text-xs">{metaCampaigns.length} campañas</Badge>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Inversión Total:</span>
                <span className="font-medium text-foreground">{formatCurrency(metrics.platforms.meta.spend)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ROAS Promedio:</span>
                <span className={cn(
                  'font-bold',
                  metrics.platforms.meta.roas >= 2 ? 'text-emerald-500' : 'text-red-500'
                )}>
                  {metrics.platforms.meta.roas.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversiones:</span>
                <span className="font-medium text-foreground">{formatNumber(metrics.platforms.meta.conversions)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 dark:bg-gray-800">
            <TabsTrigger value="all" className="text-xs sm:text-sm">Todas</TabsTrigger>
            <TabsTrigger value="google" className="text-xs sm:text-sm">Google Ads</TabsTrigger>
            <TabsTrigger value="meta" className="text-xs sm:text-sm">Meta Ads</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <CampaignTable campaigns={allCampaigns} platform="todas las plataformas" />
          </TabsContent>

          <TabsContent value="google" className="mt-4">
            <CampaignTable campaigns={googleCampaigns} platform="Google Ads" />
          </TabsContent>

          <TabsContent value="meta" className="mt-4">
            <CampaignTable campaigns={metaCampaigns} platform="Meta Ads" />
          </TabsContent>
        </Tabs>

        {/* Insight */}
        {allCampaigns.length > 0 && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Mejor campaña:</strong> &ldquo;{allCampaigns[0].name}&rdquo; con ROAS de {allCampaigns[0].roas.toFixed(2)}x,
                  generando {formatCurrency(allCampaigns[0].revenue)} con {formatCurrency(allCampaigns[0].spend)} de inversión.
                </p>
                {allCampaigns.length > 1 && allCampaigns[allCampaigns.length - 1].roas < 1 && (
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    {allCampaigns.filter(c => c.roas < 1).length} campañas con ROAS menor a 1x — revisar segmentación.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
