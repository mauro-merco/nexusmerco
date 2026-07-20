import Papa from 'papaparse';

export interface MetaCampaignRow {
  campaign_name: string;
  delivery_status: string;
  budget_type: string;
  budget_amount: number;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
}

export interface MetaAdSetRow {
  ad_set_name: string;
  campaign_name: string;
  category: string;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
  budget: number;
  bid_strategy: string;
}

export interface MetaAdRow {
  ad_name: string;
  ad_set_name: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  cost_per_result: number;
  quality_ranking: string;
  engagement_ranking: string;
  conversion_ranking: string;
}

export interface MetaParsedResult {
  reportType: 'campaign' | 'ad_set' | 'ad' | 'unknown';
  dateRange: { start: string; end: string };
  campaigns: MetaCampaignRow[];
  adSets: MetaAdSetRow[];
  ads: MetaAdRow[];
}

function parseNum(val: string): number {
  if (!val || val === '--' || val === '-') return 0;
  const cleaned = val.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function getCol(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  const norm = keys[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
  return match ? row[match] : '';
}

function detectType(text: string): 'campaign' | 'ad_set' | 'ad' | 'unknown' {
  const t = text.slice(0, 2000);
  if (/Nombre\s*del\s*anuncio/i.test(t) || /Ad\s*name/i.test(t)) return 'ad';
  if (/Nombre\s*del\s*conjunto/i.test(t) || /Ad\s*set\s*name/i.test(t)) return 'ad_set';
  if (/Nombre\s*de\s*(la\s*)?campa/i.test(t) || /Campaign\s*name/i.test(t)) return 'campaign';
  return 'unknown';
}

function extractDateRange(rows: Array<Record<string, string>>): { start: string; end: string } {
  for (const row of rows) {
    const start = row['Inicio del informe'] || row['Report starts'] || '';
    const end = row['Fin del informe'] || row['Report ends'] || '';
    if (start && end) return { start, end };
  }
  return { start: '', end: '' };
}

function inferCategoryFromName(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('CELULAR') || upper.includes('TELEFONO') || upper.includes('SMARTPHONE')) return 'Celulares';
  if (upper.includes('TV') || upper.includes('TELEVISOR') || upper.includes('PANTALLA')) return 'TV';
  if (upper.includes('ELECTRO') || upper.includes('HELADERA') || upper.includes('COCINA') || upper.includes('LAVARROP')) return 'Electro';
  if (upper.includes('AUDIO') || upper.includes('SOUNDBAR') || upper.includes('PARLANTE')) return 'Audio';
  if (upper.includes('WEARABLE') || upper.includes('SMARTWATCH') || upper.includes('RELOJ') || upper.includes('FITNESS')) return 'Wearables';
  if (upper.includes('AIRE') || upper.includes('ACONDIC') || upper.includes('CLIMAT')) return 'Aires';
  if (upper.includes('MOTO') || upper.includes('TAIGA')) return 'Motos';
  if (upper.includes('INFORM') || upper.includes('NOTEBOOK') || upper.includes('MONITOR')) return 'Informática';
  if (upper.includes('ACCESORIO') || upper.includes('FUNDA') || upper.includes('KILLER')) return 'Accesorios';
  if (upper.includes('HOTSALE') || upper.includes('PROMO') || upper.includes('OFERTA') || upper.includes('CUOTA') || upper.includes('BNA')) return 'Promociones';
  if (upper.includes('DABA') || upper.includes('CATALOG') || upper.includes('TRAFICO') || upper.includes('RMK')) return 'General';
  return 'General';
}

export function parseMetaAds(text: string): MetaParsedResult {
  const reportType = detectType(text);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const dateRange = extractDateRange(result.data);

  const campaigns: MetaCampaignRow[] = [];
  const adSets: MetaAdSetRow[] = [];
  const ads: MetaAdRow[] = [];

  for (const row of result.data) {
    if (reportType === 'campaign') {
      const name = getCol(row, 'Nombre de la campaña', 'Campaign name');
      if (!name) continue;
      const spend = parseNum(getCol(row, 'Importe gastado (ARS)', 'Amount spent (ARS)', 'Importe gastado (USD)', 'Spend'));
      campaigns.push({
        campaign_name: name,
        delivery_status: getCol(row, 'Entrega de la campaña', 'Campaign delivery'),
        budget_type: getCol(row, 'Tipo de presupuesto', 'Budget type'),
        budget_amount: parseNum(getCol(row, 'Presupuesto del conjunto de anuncios', 'Budget')),
        spend,
        impressions: parseNum(getCol(row, 'Impresiones', 'Impressions')),
        reach: parseNum(getCol(row, 'Alcance', 'Reach')),
        results: parseNum(getCol(row, 'Resultados', 'Results')),
        cost_per_result: parseNum(getCol(row, 'Costo por resultados', 'Cost per result')),
      });
    }

    if (reportType === 'ad_set') {
      const name = getCol(row, 'Nombre del conjunto de anuncios', 'Ad set name');
      if (!name) continue;
      const agCampaign = getCol(row, 'Nombre de la campaña', 'Campaign name');
      adSets.push({
        ad_set_name: name,
        campaign_name: agCampaign,
        category: inferCategoryFromName(name),
        spend: parseNum(getCol(row, 'Importe gastado (ARS)', 'Amount spent (ARS)', 'Spend')),
        impressions: parseNum(getCol(row, 'Impresiones', 'Impressions')),
        reach: parseNum(getCol(row, 'Alcance', 'Reach')),
        results: parseNum(getCol(row, 'Resultados', 'Results')),
        cost_per_result: parseNum(getCol(row, 'Costo por resultados', 'Cost per result')),
        budget: parseNum(getCol(row, 'Presupuesto', 'Budget')),
        bid_strategy: getCol(row, 'Tipo de puja', 'Bid type', 'Estrategia de puja'),
      });
    }

    if (reportType === 'ad') {
      const name = getCol(row, 'Nombre del anuncio', 'Ad name');
      if (!name) continue;
      ads.push({
        ad_name: name,
        ad_set_name: getCol(row, 'Nombre del conjunto de anuncios', 'Ad set name'),
        campaign_name: getCol(row, 'Nombre de la campaña', 'Campaign name'),
        spend: parseNum(getCol(row, 'Importe gastado (ARS)', 'Amount spent (ARS)', 'Spend')),
        impressions: parseNum(getCol(row, 'Impresiones', 'Impressions')),
        reach: parseNum(getCol(row, 'Alcance', 'Reach')),
        results: parseNum(getCol(row, 'Resultados', 'Results')),
        cost_per_result: parseNum(getCol(row, 'Costo por resultados', 'Cost per result')),
        quality_ranking: getCol(row, 'Clasificación de calidad', 'Quality ranking'),
        engagement_ranking: getCol(row, 'Clasificación del porcentaje de interacción', 'Engagement rate ranking'),
        conversion_ranking: getCol(row, 'Clasificación del porcentaje de conversiones', 'Conversion rate ranking'),
      });
    }
  }

  return { reportType, dateRange, campaigns, adSets, ads };
}
