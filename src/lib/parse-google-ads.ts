import Papa from 'papaparse';

export interface GaCampaignRow {
  campaign_name: string;
  campaign_type: string;
  campaign_status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
  roas: number;
  cpc: number;
  ctr: number;
}

export interface GaKeywordRow {
  keyword: string;
  match_type: string;
  campaign_name: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
  cpc: number;
}

export interface GaAssetGroupRow {
  asset_group_name: string;
  campaign_name: string;
  category: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conv_value: number;
}

export interface GaParsedResult {
  reportType: 'campaign' | 'keyword' | 'asset_group' | 'unknown';
  dateRange: { start: string; end: string };
  campaigns: GaCampaignRow[];
  keywords: GaKeywordRow[];
  assetGroups: GaAssetGroupRow[];
}

function getCol(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  const norm = keys[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const match = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === norm);
  return match ? row[match] : '';
}

function parseNum(val: string): number {
  if (!val || val === '--' || val === '' || val === '-') return 0;
  const cleaned = val
    .replace(/[^0-9.,-]/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function detectType(text: string): 'campaign' | 'keyword' | 'asset_group' | 'unknown' {
  const t = text.slice(0, 2000);
  if (/Informe\s*de\s*campa/i.test(t) || /Campaign\s*report/i.test(t)) return 'campaign';
  if (/palabras\s*clave/i.test(t) || /Keyword\s*report/i.test(t)) return 'keyword';
  if (/grupos?\s*de\s*recursos/i.test(t) || /Asset\s*group\s*report/i.test(t)) return 'asset_group';
  return 'unknown';
}

function extractDateRange(line: string): { start: string; end: string } {
  const match = line.match(/(\d{1,2})\s*de\s*(\w+)\s*de\s*(\d{4})\s*-\s*(\d{1,2})\s*de\s*(\w+)\s*de\s*(\d{4})/i);
  if (match) {
    const months: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };
    const sm = months[match[2].toLowerCase()] || '01';
    const em = months[match[5].toLowerCase()] || '01';
    return {
      start: `${match[3]}-${sm}-${match[1].padStart(2, '0')}`,
      end: `${match[6]}-${em}-${match[4].padStart(2, '0')}`,
    };
  }
  return { start: '', end: '' };
}

function inferMonthFromDateRange(dateRange: { start: string; end: string }): string {
  if (dateRange.start) return dateRange.start.slice(0, 7);
  return '';
}

function extractCategory(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('TECNOLOG') || upper.includes('CELULAR') || upper.includes('TECH')) return 'Tecnología';
  if (upper.includes('ELECTRO') || upper.includes('HELADERA') || upper.includes('COCINA')) return 'Electro';
  if (upper.includes('MOTO') || upper.includes('TAIGA')) return 'Motos';
  if (upper.includes('AIRE') || upper.includes('ACONDIC') || upper.includes('CLIMAT')) return 'Aires';
  if (upper.includes('AUDIO') || upper.includes('SOUNDBAR') || upper.includes('TV')) return 'Audio & TV';
  if (upper.includes('WEARABLE') || upper.includes('SMARTWATCH') || upper.includes('RELOJ')) return 'Wearables';
  if (upper.includes('INFORM') || upper.includes('MONITOR') || upper.includes('NOTEBOOK') || upper.includes('LAPTOP')) return 'Informática';
  if (upper.includes('MADRE') || upper.includes('HOTSALE') || upper.includes('PROMO') || upper.includes('OFERTA')) return 'Promociones';
  if (upper.includes('ACCESORIO') || upper.includes('FUNDA')) return 'Accesorios';
  return 'General';
}

export function parseGoogleAds(text: string): GaParsedResult {
  const reportType = detectType(text);
  const lines = text.split('\n').filter(l => l.trim());
  const dateRange = extractDateRange(lines[1] || '');
  const month = inferMonthFromDateRange(dateRange);

  const campaigns: GaCampaignRow[] = [];
  const keywords: GaKeywordRow[] = [];
  const assetGroups: GaAssetGroupRow[] = [];

  if (reportType === 'unknown') return { reportType, dateRange, campaigns, keywords, assetGroups };

  const csvLines = lines.slice(2).join('\n');
  const result = Papa.parse<Record<string, string>>(csvLines, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  for (const row of result.data) {
    const campaign = getCol(row, 'Campaña', 'Campaign');
 
     if (reportType === 'campaign') {
       const name = getCol(row, 'Campaña', 'Campaign');
       if (!name || name.trim().startsWith('Total') || name.trim().startsWith('--') || name.trim() === '') continue;
      const impressions = parseNum(row['Impr.'] || '0');
      const clicks = parseNum(row['Clics'] || '0');
      const cost = parseNum(row['Costo'] || '0');
      const conversions = parseNum(row['Conversiones'] || '0');
      const conv_value = parseNum(row['Valor de conv.'] || '0');
      const rawRoas = parseNum(row['Valor de conv./costo'] || '0');
      const cpc = parseNum(row['Prom. CPC'] || '0');
      const interactions = parseNum(row['Interacciones'] || '0');

      campaigns.push({
        campaign_name: name,
        campaign_type: getCol(row, 'Tipo de campaña', 'Campaign type'),
        campaign_status: getCol(row, 'Estado de la campaña', 'Campaign status'),
        impressions,
        clicks,
        cost,
        conversions,
        conv_value,
        roas: rawRoas > 0 ? rawRoas : (cost > 0 ? conv_value / cost : 0),
        cpc: cpc > 0 ? cpc : (clicks > 0 ? cost / clicks : 0),
        ctr: impressions > 0 ? (interactions / impressions) * 100 : 0,
      });
    }

    if (reportType === 'keyword') {
      const kw = row['Palabra clave'] || row['Keyword'] || '';
      if (!kw) continue;
      keywords.push({
        keyword: kw,
        match_type: getCol(row, 'Tipo de concordancia', 'Match type'),
        campaign_name: campaign,
        ad_group_name: getCol(row, 'Grupo de anuncios', 'Ad group'),
        impressions: parseNum(row['Impr.'] || '0'),
        clicks: parseNum(row['Clics'] || '0'),
        cost: parseNum(row['Costo'] || '0'),
        conversions: parseNum(row['Conversiones'] || '0'),
        conv_value: parseNum(row['Valor de conv.'] || '0'),
        cpc: parseNum(row['Prom. CPC'] || '0'),
      });
    }

    if (reportType === 'asset_group') {
      const ag = getCol(row, 'Grupo de recursos', 'Asset group');
      if (!ag) continue;
      const agCampaign = getCol(row, 'Campaña', 'Campaign');
      const searchThemes = getCol(row, 'Temas de búsqueda', 'Search themes');
      const category = extractCategory(ag + ' ' + searchThemes);
      assetGroups.push({
        asset_group_name: ag,
        campaign_name: agCampaign,
        category,
        impressions: parseNum(row['Impr.'] || '0'),
        clicks: parseNum(row['Interacciones'] || '0'),
        cost: parseNum(row['Costo'] || '0'),
        conversions: parseNum(row['Conversiones'] || '0'),
        conv_value: parseNum(row['Valor de conv.'] || '0'),
      });
    }
  }

  return { reportType, dateRange, campaigns, keywords, assetGroups };
}
