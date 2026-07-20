import Papa from 'papaparse';

export type CsvSource = 'google_ads_campaign' | 'google_ads_adgroup' | 'google_ads_ad' | 'google_ads_keyword' | 'google_ads_resource' | 'meta_ads_campaign' | 'meta_ads_adset' | 'meta_ads_ad' | 'google_analytics' | 'gc_management' | 'unknown';

export interface ParsedMetrics {
  source: CsvSource;
  clientName?: string;
  dateRange: { start: string; end: string };
  campaigns: Array<{
    name: string;
    type: string;
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
  }>;
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
  };
  rows: Array<Record<string, string>>;
  meta?: {
    adSets?: Array<{ name: string; impressions: number; spend: number; results: number; }>;
    traffic?: Array<{ source: string; sessions: number; events: number; revenue: number; }>;
    gc?: GcParsed;
  };
}

export interface GcParsed {
  month: string;
  projections: {
    facturacion: number;
    fullbaiRevenue: number;
    visitas: number;
    ordenes: number;
    cr: number;
    ticketPromedio: number;
    inversionTotal: number;
    invGoogle: number;
    invMeta: number;
    invTikTok: number;
    relacion: number;
    cpa: number;
    roasTiendas: number;
    roasFullbai: number;
    cpv: number;
  };
  daily: Array<{
    dia: string;
    facturacion: number;
    visitas: number;
    ordenes: number;
    cr: number;
    ticketPromedio: number;
    inversion: number;
    relacion: number;
    cpa: number;
    roas: number;
    cpv: number;
  }>;
}

function parseSpanishNumber(value: string): number {
  if (!value || value === '--' || value === '' || value === '-') return 0;
  let cleaned = value.replace(/\./g, '').replace(',', '.');
  cleaned = cleaned.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDateRange(text: string): { start: string; end: string } {
  const match = text.match(/(\d{1,2}) de (\w+) de (\d{4}) - (\d{1,2}) de (\w+) de (\d{4})/);
  if (match) {
    const months: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
      julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
    };
    return {
      start: `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}`,
      end: `${match[6]}-${months[match[5].toLowerCase()]}-${match[4].padStart(2, '0')}`,
    };
  }
  const metaMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (metaMatch) {
    return { start: metaMatch[1], end: metaMatch[1] };
  }
  return { start: '', end: '' };
}

function detectSource(text: string): CsvSource {
  const t = text.slice(0, 5000);

  // Google Ads (Spanish)
  if (/Informe\s*de\s*campa/i.test(t)) return 'google_ads_campaign';
  if (/Informe\s*de\s*grupos?\s*de\s*anuncios/i.test(t)) return 'google_ads_adgroup';
  if (/Informe\s*de\s*anuncio/i.test(t) && !/Informe\s*de\s*grupos?\s*de\s*anuncios/i.test(t)) return 'google_ads_ad';
  if (/Informe\s*de\s*palabras\s*clave/i.test(t)) return 'google_ads_keyword';
  if (/Informe\s*de\s*grupos\s*de\s*recursos/i.test(t)) return 'google_ads_resource';
  // Google Ads (English)
  if (/Campaign\s*report/i.test(t)) return 'google_ads_campaign';
  if (/Ad\s*group\s*report/i.test(t)) return 'google_ads_adgroup';
  if (/Ad\s*report/i.test(t) && !/Ad\s*group\s*report/i.test(t)) return 'google_ads_ad';
  if (/Keyword\s*report/i.test(t)) return 'google_ads_keyword';
  if (/Asset\s*group\s*report/i.test(t) || /Resource\s*report/i.test(t)) return 'google_ads_resource';

  // GA4 (Spanish)
  if (/Adquisici[oó]n\s*de\s*tr[aá]fico/i.test(t) || /Fuente\/medio/i.test(t)) return 'google_analytics';
  // GA4 (English)
  if (/Traffic\s*acquisition/i.test(t) || /Source\/medium/i.test(t)) return 'google_analytics';

  // GC (Spanish)
  if (/Proyecci[oó]n\s*Facturaci[oó]n/i.test(t) || /Gesti[oó]n\s*Comercial/i.test(t) || /Objetivo\s*Facturaci[oó]n/i.test(t)) return 'gc_management';

  // Meta Ads (Spanish)
  if (/Nombre\s*de\s*(la\s*)?campa/i.test(t)) return 'meta_ads_campaign';
  if (/Nombre\s*del\s*conjunto/i.test(t)) return 'meta_ads_adset';
  if (/Nombre\s*del\s*anuncio/i.test(t)) return 'meta_ads_ad';
  // Meta Ads (English)
  if (/Campaign\s*name/i.test(t) && !/report/i.test(t)) return 'meta_ads_campaign';
  if (/Ad\s*set\s*name/i.test(t)) return 'meta_ads_adset';
  if (/Ad\s*name/i.test(t) && !/ad\s*group/i.test(t) && !/report/i.test(t)) return 'meta_ads_ad';

  return 'unknown';
}

function getHeaderRow(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  return '';
}

function parseGoogleAdsGeneric(text: string, subType: CsvSource): ParsedMetrics {
  const lines = text.split('\n').filter(l => l.trim());
  const dateRange = parseDateRange(lines[1] || '');

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const campaigns: ParsedMetrics['campaigns'] = [];
  let totals = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 };

  const nameKey = subType === 'google_ads_adgroup' ? 'Grupo de anuncios' :
    subType === 'google_ads_keyword' ? 'Palabra clave' :
    subType === 'google_ads_resource' ? 'Grupo de recursos' :
    subType === 'google_ads_ad' ? 'Anuncio' : 'Campaña';

  // English fallback name keys
  const nameKeyEn = subType === 'google_ads_adgroup' ? 'Ad group' :
    subType === 'google_ads_keyword' ? 'Keyword' :
    subType === 'google_ads_resource' ? 'Asset group' :
    subType === 'google_ads_ad' ? 'Ad' : 'Campaign';

  for (const row of result.data) {
    const name = row[nameKey] || row[nameKeyEn] || row['Campaña'] || row['Campaign'] || '';
    if (!name || name.startsWith('Total:') || name.startsWith('Total')) continue;

    const impressions = parseSpanishNumber(getHeaderRow(row, 'Impr.', 'Impressions', 'Impr') || '0');
    const clicks = parseSpanishNumber(getHeaderRow(row, 'Clics', 'Clicks') || '0');
    const cost = parseSpanishNumber(getHeaderRow(row, 'Costo', 'Coste', 'Cost') || '0');
    const conversions = parseSpanishNumber(getHeaderRow(row, 'Conversiones', 'Conversions') || '0');
    const revenue = parseSpanishNumber(getHeaderRow(row, 'Valor de conv.', 'Conv. value', 'Conversion value') || '0');
    const ctr = parseSpanishNumber((getHeaderRow(row, 'CTR', 'Click-through rate (CTR)', 'Click-through rate', 'Clic-through rate') || '0').replace('%', ''));
    const cpc = parseSpanishNumber(getHeaderRow(row, 'Prom. CPC', 'CPC medio', 'Avg. CPC', 'Avg CPC') || '0');
    const roas = parseSpanishNumber(getHeaderRow(row, 'Valor de conv./costo', 'Valor conv./coste', 'Conv. value / cost', 'Conversion value / cost') || '0');

    campaigns.push({
      name, type: row['Tipo de campaña'] || row['Campaign type'] || '',
      impressions, clicks, cost, conversions, revenue, ctr, cpc, roas,
    });

    totals.impressions += impressions;
    totals.clicks += clicks;
    totals.cost += cost;
    totals.conversions += conversions;
    totals.revenue += revenue;
  }

  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  totals.roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  return { source: subType, dateRange, campaigns, totals, rows: result.data };
}

function parseMetaAds(text: string, subType: CsvSource): ParsedMetrics {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true, skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const campaigns: ParsedMetrics['campaigns'] = [];
  let totals = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 };
  let dateRange = { start: '', end: '' };

  const nameKey = subType === 'meta_ads_adset' ? 'Nombre del conjunto de anuncios' :
    subType === 'meta_ads_ad' ? 'Nombre del anuncio' : 'Nombre de la campaña';
  const nameKeyEn = subType === 'meta_ads_adset' ? 'Ad set name' :
    subType === 'meta_ads_ad' ? 'Ad name' : 'Campaign name';

  const resultKey = 'Resultados';
  const resultKeyEn = 'Results';

  for (const row of result.data) {
    if (!dateRange.start) {
      dateRange = {
        start: row['Inicio del informe'] || row['Report starts'] || '',
        end: row['Fin del informe'] || row['Report ends'] || '',
      };
    }
    const name = row[nameKey] || row[nameKeyEn] || '';
    if (!name) continue;

    const resultados = parseSpanishNumber(getHeaderRow(row, resultKey, resultKeyEn) || '0');
    const spend = parseSpanishNumber(getHeaderRow(row, 'Importe gastado (USD)', 'Amount spent (USD)', 'Spend') || '0');
    const impressions = parseSpanishNumber(getHeaderRow(row, 'Impresiones', 'Impressions') || '0');
    const reach = parseSpanishNumber(getHeaderRow(row, 'Alcance', 'Reach') || '0');

    let conversions = 0;
    const indicator = row['Indicador de resultado'] || row['Result indicator'] || '';
    if (indicator.includes('purchase') || indicator.includes('conversion')) {
      conversions = resultados;
    }
    const revenue = 0;

    campaigns.push({
      name, type: subType,
      impressions, clicks: reach, cost: spend,
      conversions, revenue, ctr: 0, cpc: 0, roas: 0,
    });

    totals.impressions += impressions;
    totals.clicks += reach;
    totals.cost += spend;
    totals.conversions += conversions;
    totals.revenue += revenue;
  }

  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.cpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;
  totals.roas = totals.cost > 0 ? totals.revenue / totals.cost : 0;

  return { source: subType, dateRange, campaigns, totals, rows: result.data };
}

function parseGoogleAnalytics(text: string): ParsedMetrics {
  const cleanLines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
  const result = Papa.parse<Record<string, string>>(cleanLines.join('\n'), {
    header: true, skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const traffic: Array<{ source: string; sessions: number; events: number; revenue: number; }> = [];
  const campaigns: ParsedMetrics['campaigns'] = [];
  const totals = { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 };

  for (const row of result.data) {
    const source = getHeaderRow(row,
      'Fuente/medio de la sesión', 'Fuente/medio', 'Session source/medium',
      'Source / medium', 'Source/medium'
    );
    if (!source) continue;

    const sessions = parseFloat(getHeaderRow(row, 'Sesiones', 'Sessions') || '0') || 0;
    const events = parseFloat(getHeaderRow(row, 'Eventos clave', 'Key events') || '0') || 0;
    const revenue = parseFloat(getHeaderRow(row, 'Total de ingresos', 'Total revenue') || '0') || 0;
    const users = parseFloat(getHeaderRow(row, 'Usuarios', 'Users total', 'Users') || '0') || 0;

    traffic.push({ source, sessions, events, revenue });

    campaigns.push({
      name: source, type: 'traffic_source',
      impressions: users, clicks: sessions, cost: 0,
      conversions: events, revenue, ctr: 0, cpc: 0, roas: 0,
    });

    totals.clicks += sessions;
    totals.conversions += events;
    totals.revenue += revenue;
    totals.impressions += users;
  }

  return {
    source: 'google_analytics', dateRange: { start: '', end: '' },
    campaigns, totals, rows: result.data,
    meta: { traffic },
  };
}

const DAY_NAMES = /^[",\s]*(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)[,\s]/i;

function parseGC(text: string): ParsedMetrics {
  const result = Papa.parse<Record<string, string>>(text, {
    header: false, skipEmptyLines: true,
  });
  const rows = result.data;

  // Extract month from date strings like "1 de abril" found in the CSV
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthNamesShort = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const monthPattern = new RegExp(`\\d+\\s+de\\s+(${monthNames.join('|')})`, 'i');
  const monthDateMatch = text.match(monthPattern);
  const monthFullMatch = text.match(new RegExp(`(${monthNames.join('|')})\\s*(?:de\\s*)?(\\d{4})`, 'i'));
  const monthShortMatch = text.match(new RegExp(`(${monthNamesShort.join('|')})\\s*(\\d{4})`, 'i'));
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = monthFullMatch?.[2] || monthShortMatch?.[2] || yearMatch?.[1] || String(new Date().getFullYear());
  // Fallback: first line often contains "Gestión Comercial - Abril 2026"
  const firstLine = text.split('\n')[0] || '';
  const firstLineMonthMatch = firstLine.match(new RegExp(`(${monthNames.join('|')})`, 'i'));
  const month = monthDateMatch
    ? monthDateMatch[1].charAt(0).toUpperCase() + monthDateMatch[1].slice(1).toLowerCase()
    : monthFullMatch
    ? monthFullMatch[1].charAt(0).toUpperCase() + monthFullMatch[1].slice(1).toLowerCase()
    : monthShortMatch
    ? `${monthNames[monthNamesShort.indexOf(monthShortMatch[1].toUpperCase())]}`
    : firstLineMonthMatch
    ? firstLineMonthMatch[1].charAt(0).toUpperCase() + firstLineMonthMatch[1].slice(1).toLowerCase()
    : '';

  // Derive date range from month name
  const monthIndex = monthNames.findIndex(m => m.toLowerCase() === month.toLowerCase());
  const dateRange: { start: string; end: string } = { start: '', end: '' };
  if (monthIndex >= 0 && year) {
    const startDay = '01';
    const endDay = String(new Date(Number(year), monthIndex + 1, 0).getDate()).padStart(2, '0');
    dateRange.start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${startDay}`;
    dateRange.end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${endDay}`;
  }

  // --- Projections ---
  // Scan multiple row pairs in case labels are on different rows
  const projections = {
    facturacion: 0, fullbaiRevenue: 0, visitas: 0, ordenes: 0, cr: 0,
    ticketPromedio: 0, inversionTotal: 0, invGoogle: 0, invMeta: 0,
    invTikTok: 0, relacion: 0, cpa: 0, roasTiendas: 0, roasFullbai: 0, cpv: 0,
  };

  // Map field keys to array of possible label substrings (order matters: more specific first)
  const labelMap: [keyof typeof projections, string[]][] = [
    ['facturacion',      ['Facturación']],
    ['visitas',          ['Visitas']],
    ['ordenes',          ['Órdenes', 'Ordenes']],
    ['ticketPromedio',   ['Ticket']],
    ['inversionTotal',   ['Inversión Total', 'Inversion Total', 'Inv. Total']],
    ['invGoogle',        ['Inv. Google', 'Real Google', 'Google Ads', 'Google']],
    ['invMeta',          ['Inv. Meta', 'Real Meta', 'Meta Ads', 'Meta']],
    ['invTikTok',        ['Inv. Tik Tok', 'Inv. TikTok', 'Inv. Tiktok', 'Tik Tok', 'Real TikTok', 'TikTok']],
    ['fullbaiRevenue',   ['Fullbai Revenue', 'Fullbai Ingresos', 'Revenue Fullbai', 'Fullbai']],
    ['roasTiendas',      ['ROAS Tiendas', 'ROAS Tienda', 'Roas Tiendas', 'Retorno Tiendas', 'Tiendas']],
    ['roasFullbai',      ['ROAS Fullbai', 'Roas Fullbai', 'ROAS FB']],
    ['cpa',              ['CPA', 'Cpa', 'Costo Adquisición', 'Coste Adquisición', 'Coste por Conversión']],
    ['cr',               ['CR', '% Conversión', 'Tasa Conversión', 'Tasa de Conversión', 'Conversion Rate', 'Conversión', 'Conv.']],
    ['relacion',         ['Relación Inv/Fact', 'Relación', 'Relacion', 'Inv/Fact', 'Inv / Fact', 'Gastos', 'Eficiencia']],
    ['cpv',              ['CPV', 'Cpv', 'Costo Visita', 'Coste Visita', 'Costo por Visita', 'Coste por Visita']],
  ];

  // Try label row at index 0 with value row at index 1, then 2/3, then 4/5
  for (let ri = 0; ri <= 4; ri += 2) {
    const labelR = rows[ri] ? Object.values(rows[ri]).map(v => (v || '').trim()) : [];
    const valR = rows[ri + 1] ? Object.values(rows[ri + 1]).map(v => (v || '').trim()) : [];
    if (labelR.length === 0 || valR.length === 0) continue;

    for (const [field, labels] of labelMap) {
      if (projections[field] !== 0) continue;
      for (const label of labels) {
        const idx = labelR.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
        if (idx >= 0 && valR[idx]) {
          projections[field] = parseSpanishNumber(valR[idx]);
          break;
        }
      }
    }
  }

  // Also try labels and values on the SAME row (alternating label-value pairs)
  for (let ri = 0; ri <= 5; ri++) {
    const vals = Object.values(rows[ri] || {}).map(v => (v || '').trim());
    if (vals.length < 2) continue;
    for (const [field, labels] of labelMap) {
      if (projections[field] !== 0) continue;
      for (const label of labels) {
        const idx = vals.findIndex(l => l.toLowerCase().includes(label.toLowerCase()));
        if (idx >= 0 && idx + 1 < vals.length && vals[idx + 1]) {
          projections[field] = parseSpanishNumber(vals[idx + 1]);
          break;
        }
      }
    }
  }

  // --- Daily data (find rows containing a Spanish day name) ---
  const daily: GcParsed['daily'] = [];
  // Regex to find a day name anywhere in a row (not just at start)
  const DAY_IN_ROW = /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)$/i;

  for (const row of rows) {
    const rowVals = Object.values(row).map(v => (v || '').trim());
    // Find the day name column dynamically
    const dayIdx = rowVals.findIndex(v => DAY_IN_ROW.test(v));
    if (dayIdx < 0) continue;

    // Expected layout relative to dayIdx:
    // [+0] = day name
    // [+1] = date string (e.g. "1 de abril")
    // [+2] = Facturación Share %
    // [+3] = Facturación Target (projected)
    // [+4] = Facturación Real (actual) ← USE THIS
    // [+5] = Facturación var %
    // [+6] = Visitas Target
    // [+7] = Visitas Real
    // [+8] = Órdenes Target
    // [+9] = Órdenes Real ← USE THIS
    // [+10]= CR Target
    // [+11]= CR Real
    // [+12]= Ticket Target
    // [+13]= Ticket Real
    // [+14]= PXU Target
    // [+15]= Items Target
    // [+16]= Items (cuenta)
    // [+17]= Items Real
    // [+18]= Inversión Share %
    // [+19]= Inversión Target
    // [+20]= Inversión Total ← USE THIS
    // [+21]= Real Google
    // [+22]= Real Meta
    // [+23]= TikTok Real
    // [+24]= var %

    const getVal = (offset: number) => parseSpanishNumber(rowVals[dayIdx + offset] || '0');
    const fact = getVal(4);
    const inv = getVal(20);

    daily.push({
      dia: rowVals[dayIdx + 1] || '',
      facturacion: fact,
      visitas: getVal(7),
      ordenes: getVal(9),
      cr: getVal(11),
      ticketPromedio: getVal(13),
      inversion: inv,
      relacion: fact > 0 ? (inv / fact) * 100 : 0,
      cpa: 0,
      roas: inv > 0 ? fact / inv : 0,
      cpv: 0,
    });
  }

  return {
    source: 'gc_management',
    dateRange,
    campaigns: [],
    totals: { impressions: 0, clicks: 0, cost: 0, conversions: 0, revenue: 0, ctr: 0, cpc: 0, roas: 0 },
    rows: result.data,
    meta: {
      gc: {
        month,
        projections: {
          facturacion: projections.facturacion || daily.reduce((s, d) => s + d.facturacion, 0),
          fullbaiRevenue: projections.fullbaiRevenue || 0,
          visitas: projections.visitas || daily.reduce((s, d) => s + d.visitas, 0),
          ordenes: projections.ordenes || daily.reduce((s, d) => s + d.ordenes, 0),
          cr: projections.cr || 0,
          ticketPromedio: projections.ticketPromedio || 0,
          inversionTotal: projections.inversionTotal || daily.reduce((s, d) => s + d.inversion, 0),
          invGoogle: projections.invGoogle || 0,
          invMeta: projections.invMeta || 0,
          invTikTok: projections.invTikTok || 0,
          relacion: projections.relacion || 0,
          cpa: projections.cpa || 0,
          roasTiendas: projections.roasTiendas || 0,
          roasFullbai: projections.roasFullbai || 0,
          cpv: projections.cpv || 0,
        },
        daily,
      },
    },
  };
}

export function parseCSV(text: string): ParsedMetrics {
  const source = detectSource(text);

  switch (source) {
    case 'google_ads_campaign':
    case 'google_ads_adgroup':
    case 'google_ads_ad':
    case 'google_ads_keyword':
    case 'google_ads_resource':
      return parseGoogleAdsGeneric(text, source);
    case 'meta_ads_campaign':
    case 'meta_ads_adset':
    case 'meta_ads_ad':
      return parseMetaAds(text, source);
    case 'google_analytics':
      return parseGoogleAnalytics(text);
    case 'gc_management':
      return parseGC(text);
    default:
      throw new Error('Formato de CSV no reconocido. Formatos aceptados: Google Ads, Meta Ads, Google Analytics, Gestión Comercial.');
  }
}
