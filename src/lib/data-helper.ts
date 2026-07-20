/**
 * Data Helper - Utilidades para parsear y agregar datos de CSVs
 * Maneja la lectura desde Supabase (base de datos) y file system (desarrollo)
 */

import { parseCSV, type ParsedMetrics, type GcParsed } from './csv-parser';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase no configurado');
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AggregatedMetrics {
  totalRevenue: number;
  totalSpend: number;
  totalOrders: number;
  avgRoas: number;
  avgCpa: number;
  avgCr: number;
  platforms: {
    google: { spend: number; revenue: number; conversions: number; roas: number };
    meta: { spend: number; revenue: number; conversions: number; roas: number };
    analytics: { sessions: number; conversions: number; revenue: number };
  };
  topCampaigns: Array<{
    name: string;
    platform: string;
    roas: number;
    spend: number;
    revenue: number;
    conversions: number;
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
    conversions: number;
    conversionRate: number;
  }>;
  gcData?: GcParsed;
}

/**
 * Lee todos los datos de un cliente desde Supabase
 * Combina datos de weekly_inputs, campaign_metrics, ga4_traffic y gc_metrics
 */
export async function loadClientCSVs(clientId: string): Promise<ParsedMetrics[]> {
  const parsedFiles: ParsedMetrics[] = [];

  try {
    const supabase = getSupabaseAdmin();

    // 1. Cargar datos de weekly_inputs (agregados semanales)
    const { data: weeklyData } = await supabase
      .from('weekly_inputs')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start_date', { ascending: false });

    // 2. Cargar campaign_metrics (campañas individuales)
    const { data: campaignData } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start_date', { ascending: false });

    // 3. Cargar ga4_traffic (fuentes de tráfico)
    const { data: ga4Data } = await supabase
      .from('ga4_traffic')
      .select('*')
      .eq('client_id', clientId)
      .order('week_start_date', { ascending: false });

    // 4. Cargar gc_metrics (gestión comercial)
    const { data: gcData } = await supabase
      .from('gc_metrics')
      .select('*, gc_daily(*)')
      .eq('client_id', clientId)
      .order('month', { ascending: false });

    // Convertir weekly_inputs a ParsedMetrics
    if (weeklyData) {
      for (const week of weeklyData) {
        // Google Ads
        if (week.google_ads_spend > 0) {
          parsedFiles.push({
            source: 'google_ads_campaign',
            dateRange: {
              start: week.week_start_date,
              end: week.week_start_date,
            },
            campaigns: [],
            totals: {
              impressions: week.google_ads_impressions || 0,
              clicks: week.google_ads_clicks || 0,
              cost: week.google_ads_spend || 0,
              conversions: week.google_ads_conversions || 0,
              revenue: week.google_ads_revenue || 0,
              ctr: 0,
              cpc: 0,
              roas: week.google_ads_spend > 0 ? week.google_ads_revenue / week.google_ads_spend : 0,
            },
            rows: [],
          });
        }

        // Meta Ads
        if (week.meta_ads_spend > 0) {
          parsedFiles.push({
            source: 'meta_ads_campaign',
            dateRange: {
              start: week.week_start_date,
              end: week.week_start_date,
            },
            campaigns: [],
            totals: {
              impressions: week.meta_ads_impressions || 0,
              clicks: week.meta_ads_clicks || 0,
              cost: week.meta_ads_spend || 0,
              conversions: week.meta_ads_conversions || 0,
              revenue: week.meta_ads_revenue || 0,
              ctr: 0,
              cpc: 0,
              roas: week.meta_ads_spend > 0 ? week.meta_ads_revenue / week.meta_ads_spend : 0,
            },
            rows: [],
          });
        }
      }
    }

    // Convertir campaign_metrics a campañas
    if (campaignData) {
      const campaignsByWeek = campaignData.reduce((acc, c) => {
        const key = `${c.platform}_${c.week_start_date}`;
        if (!acc[key]) {
          acc[key] = {
            source: c.platform === 'google_ads' ? 'google_ads_campaign' : 'meta_ads_campaign',
            dateRange: { start: c.week_start_date, end: c.week_start_date },
            campaigns: [],
            totals: { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 },
            rows: [],
          };
        }
        acc[key].campaigns.push({
          name: c.campaign_name,
          type: c.campaign_type || '',
          impressions: c.impressions || 0,
          clicks: c.clicks || 0,
          cost: c.cost || 0,
          conversions: c.conversions || 0,
          revenue: c.revenue || 0,
          ctr: c.ctr || 0,
          cpc: c.cpc || 0,
          roas: c.roas || 0,
        });
        return acc;
      }, {} as Record<string, ParsedMetrics>);

      parsedFiles.push(...Object.values(campaignsByWeek) as ParsedMetrics[]);
    }

    // Convertir ga4_traffic a ParsedMetrics
    if (ga4Data) {
      const trafficByWeek = ga4Data.reduce((acc, t: any) => {
        const key = t.week_start_date;
        if (!acc[key]) {
          acc[key] = {
            source: 'google_analytics',
            dateRange: { start: t.week_start_date, end: t.week_start_date },
            campaigns: [],
            totals: { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 },
            rows: [],
            meta: { traffic: [] },
          };
        }
        acc[key].meta!.traffic!.push({
          source: t.source,
          sessions: t.sessions || 0,
          events: t.events || 0,
          revenue: t.revenue || 0,
        });
        acc[key].totals.clicks += t.sessions || 0;
        acc[key].totals.conversions += t.events || 0;
        acc[key].totals.revenue += t.revenue || 0;
        return acc;
      }, {} as Record<string, ParsedMetrics>);

      parsedFiles.push(...Object.values(trafficByWeek) as ParsedMetrics[]);
    }

    // Convertir gc_metrics a ParsedMetrics
    if (gcData) {
      for (const gc of gcData) {
        const daily = (gc.gc_daily || []).map((d: any) => ({
          dia: d.dia?.toString() || '0',
          facturacion: d.facturacion || 0,
          visitas: d.visitas || 0,
          ordenes: d.ordenes || 0,
          cr: (d.cr || 0) * 100,
          ticketPromedio: d.ticket_promedio || 0,
          inversion: d.inversion || 0,
          relacion: (d.relacion || 0) * 100,
          cpa: d.cpa || 0,
          roas: d.roas || 0,
          cpv: d.cpv || 0,
        }));

        parsedFiles.push({
          source: 'gc_management',
          dateRange: { start: '', end: '' },
          campaigns: [],
          totals: { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 },
          rows: [],
          meta: {
            gc: {
              month: gc.month,
              projections: {
                facturacion: gc.proy_facturacion || 0,
                fullbaiRevenue: gc.proy_fullbai_revenue || 0,
                visitas: gc.proy_visitas || 0,
                ordenes: gc.proy_ordenes || 0,
                cr: (gc.proy_cr || 0) * 100,
                ticketPromedio: gc.proy_ticket_promedio || 0,
                inversionTotal: gc.proy_inversion_total || 0,
                invGoogle: gc.proy_inv_google || 0,
                invMeta: gc.proy_inv_meta || 0,
                invTikTok: gc.proy_inv_tiktok || 0,
                relacion: (gc.proy_relacion || 0) * 100,
                cpa: gc.proy_cpa || 0,
                roasTiendas: gc.proy_roas_tiendas || 0,
                roasFullbai: gc.proy_roas_fullbai || 0,
                cpv: gc.proy_cpv || 0,
              },
              daily,
            },
          },
        });
      }
    }

    return parsedFiles;
  } catch (err) {
    console.error(`Error loading data for client ${clientId}:`, err);
    return [];
  }
}

/**
 * Filtra datos por rango de fechas
 */
export function filterByDateRange(
  parsedFiles: ParsedMetrics[],
  dateRange: DateRange
): ParsedMetrics[] {
  return parsedFiles.filter((file) => {
    if (!file.dateRange.start || !file.dateRange.end) return true; // Incluir si no tiene fecha

    const fileStart = new Date(file.dateRange.start);
    const fileEnd = new Date(file.dateRange.end);

    // Verificar si hay overlap con el rango solicitado
    return fileStart <= dateRange.end && fileEnd >= dateRange.start;
  });
}

/**
 * Agrega métricas de múltiples archivos parseados
 */
export function aggregateMetrics(parsedFiles: ParsedMetrics[]): AggregatedMetrics {
  const result: AggregatedMetrics = {
    totalRevenue: 0,
    totalSpend: 0,
    totalOrders: 0,
    avgRoas: 0,
    avgCpa: 0,
    avgCr: 0,
    platforms: {
      google: { spend: 0, revenue: 0, conversions: 0, roas: 0 },
      meta: { spend: 0, revenue: 0, conversions: 0, roas: 0 },
      analytics: { sessions: 0, conversions: 0, revenue: 0 },
    },
    topCampaigns: [],
    trafficSources: [],
  };

  const allCampaigns: AggregatedMetrics['topCampaigns'] = [];

  for (const file of parsedFiles) {
    // Gestión Comercial
    if (file.source === 'gc_management' && file.meta?.gc) {
      result.gcData = file.meta.gc;
      result.totalRevenue += file.meta.gc.projections.facturacion;
      result.totalSpend += file.meta.gc.projections.inversionTotal;
      result.totalOrders += file.meta.gc.projections.ordenes;
      continue;
    }

    // Google Ads
    if (file.source.startsWith('google_ads')) {
      result.platforms.google.spend += file.totals.cost;
      result.platforms.google.revenue += file.totals.revenue;
      result.platforms.google.conversions += file.totals.conversions;

      for (const campaign of file.campaigns) {
        allCampaigns.push({
          name: campaign.name,
          platform: 'Google Ads',
          roas: campaign.roas,
          spend: campaign.cost,
          revenue: campaign.revenue,
          conversions: campaign.conversions,
        });
      }
    }

    // Meta Ads
    if (file.source.startsWith('meta_ads')) {
      result.platforms.meta.spend += file.totals.cost;
      result.platforms.meta.revenue += file.totals.revenue;
      result.platforms.meta.conversions += file.totals.conversions;

      for (const campaign of file.campaigns) {
        allCampaigns.push({
          name: campaign.name,
          platform: 'Meta Ads',
          roas: campaign.roas,
          spend: campaign.cost,
          revenue: campaign.revenue,
          conversions: campaign.conversions,
        });
      }
    }

    // Google Analytics
    if (file.source === 'google_analytics' && file.meta?.traffic) {
      for (const source of file.meta.traffic) {
        result.platforms.analytics.sessions += source.sessions;
        result.platforms.analytics.conversions += source.events;
        result.platforms.analytics.revenue += source.revenue;

        result.trafficSources.push({
          source: source.source,
          sessions: source.sessions,
          conversions: source.events,
          conversionRate: source.sessions > 0 ? (source.events / source.sessions) * 100 : 0,
        });
      }
    }
  }

  // Calcular ROAS por plataforma
  result.platforms.google.roas =
    result.platforms.google.spend > 0
      ? result.platforms.google.revenue / result.platforms.google.spend
      : 0;
  result.platforms.meta.roas =
    result.platforms.meta.spend > 0
      ? result.platforms.meta.revenue / result.platforms.meta.spend
      : 0;

  // Top campañas por ROAS
  result.topCampaigns = allCampaigns
    .filter((c) => c.roas > 0)
    .sort((a, b) => b.roas - a.roas)
    .slice(0, 10);

  // Calcular promedios
  const totalConversions =
    result.platforms.google.conversions + result.platforms.meta.conversions;
  result.avgRoas =
    result.totalSpend > 0 ? result.totalRevenue / result.totalSpend : 0;
  result.avgCpa =
    totalConversions > 0 ? result.totalSpend / totalConversions : 0;
  result.avgCr =
    result.platforms.analytics.sessions > 0
      ? (result.platforms.analytics.conversions / result.platforms.analytics.sessions) * 100
      : 0;

  return result;
}

/**
 * Obtiene métricas agregadas para un cliente en un rango de fechas
 */
export async function getClientMetrics(
  clientId: string,
  dateRange?: DateRange
): Promise<AggregatedMetrics> {
  const allFiles = await loadClientCSVs(clientId);

  const filteredFiles = dateRange
    ? filterByDateRange(allFiles, dateRange)
    : allFiles;

  return aggregateMetrics(filteredFiles);
}

/**
 * Compara métricas entre dos períodos
 */
export function compareMetrics(
  current: AggregatedMetrics,
  previous: AggregatedMetrics
): {
  revenueChange: number;
  spendChange: number;
  roasChange: number;
  ordersChange: number;
} {
  return {
    revenueChange:
      previous.totalRevenue > 0
        ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
        : 0,
    spendChange:
      previous.totalSpend > 0
        ? ((current.totalSpend - previous.totalSpend) / previous.totalSpend) * 100
        : 0,
    roasChange:
      previous.avgRoas > 0
        ? ((current.avgRoas - previous.avgRoas) / previous.avgRoas) * 100
        : 0,
    ordersChange:
      previous.totalOrders > 0
        ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100
        : 0,
  };
}
