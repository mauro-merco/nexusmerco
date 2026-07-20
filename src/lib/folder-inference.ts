const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
};

const MONTH_NAMES = Object.keys(MONTHS);

export interface InferredFile {
  relativePath: string;
  filename: string;
  clientName: string;
  sourceType: string;
  periodicity: 'mensual' | 'semanal';
  dateFrom: string | null;
  dateTo: string | null;
  month: string;
}

function findMonthInText(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of MONTH_NAMES) {
    if (lower.includes(m)) return m;
  }
  return null;
}

function monthToNumber(month: string): string {
  return MONTHS[month.toLowerCase()] || '01';
}

function parseWeekFolder(folder: string, year: string): { from: string | null; to: string | null } {
  const match = folder.match(/(\d{1,2})-([a-zñé]+)-al-(\d{1,2})-([a-zñé]+)/i);
  if (!match) return { from: null, to: null };
  const fromDay = match[1].padStart(2, '0');
  const fromMon = monthToNumber(match[2]);
  const toDay = match[3].padStart(2, '0');
  const toMon = monthToNumber(match[4]);
  return {
    from: `${year}-${fromMon}-${fromDay}`,
    to: `${year}-${toMon}-${toDay}`,
  };
}

function inferDateFromPath(relativePath: string, filename: string): { from: string | null; to: string | null; month: string } {
  const parts = relativePath.replace(/\\/g, '/').split('/');
  const monthName = findMonthInText(filename) || findMonthInText(relativePath);
  const monthNum = monthName ? monthToNumber(monthName) : null;
  const yearMatch = filename.match(/\b(20\d{2})\b/) || relativePath.match(/\b(20\d{2})\b/);
  const year = yearMatch ? yearMatch[1] : '2026';

  // Check for week folder pattern: {day}-{month}-al-{day}-{month}
  for (const part of parts) {
    const parsed = parseWeekFolder(part, year);
    if (parsed.from) return { ...parsed, month: monthName || '' };
  }

  // Monthly: use the month name to build a range
  if (monthNum) {
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    return {
      from: `${year}-${monthNum}-01`,
      to: `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`,
      month: monthName || '',
    };
  }

  return { from: null, to: null, month: '' };
}

function inferSourceType(relativePath: string, filename: string): string {
  const path = relativePath.replace(/\\/g, '/').toLowerCase();

  // GC files at root or gestion-comercial folder
  if (/gesti[óo]n\s*comercial/i.test(filename) || path.includes('gestion-comercial')) return 'gc_management';

  // Analytics / GA4
  if (path.includes('analytics') || /adquisici[óo]n.*tr[aá]fico/i.test(filename) || /traffic.*acquisition/i.test(filename)) return 'google_analytics';

  // Google Ads
  if (path.includes('google-ads')) {
    if (/campaña/i.test(filename) || /campa/i.test(filename) || /campaign/i.test(filename)) return 'google_ads_campaign';
    if (/grupo.*anuncios/i.test(filename) || /ad\s*group/i.test(filename)) return 'google_ads_adgroup';
    if (/anuncio/i.test(filename) && !/grupo/i.test(filename) && !/recursos/i.test(filename)) return 'google_ads_ad';
    if (/palabras.*clave/i.test(filename) || /keyword/i.test(filename)) return 'google_ads_keyword';
    if (/recursos/i.test(filename) || /asset\s*group/i.test(filename) || /resource/i.test(filename)) return 'google_ads_resource';
    return 'google_ads_campaign';
  }

  // Meta Ads
  if (path.includes('meta')) {
    if (/campañas/i.test(filename) || /campañas/i.test(filename) || /campaign/i.test(filename)) return 'meta_ads_campaign';
    if (/conjuntos/i.test(filename) || /ad\s*set/i.test(filename)) return 'meta_ads_adset';
    if (/anuncios/i.test(filename) || /anuncios/i.test(filename) || /ad\s*name/i.test(filename)) return 'meta_ads_ad';
    return 'meta_ads_campaign';
  }

  return 'unknown';
}

function inferPeriodicity(relativePath: string): 'mensual' | 'semanal' {
  const path = relativePath.replace(/\\/g, '/').toLowerCase();
  if (path.includes('/semanal/') || path.includes('semana')) return 'semanal';
  return 'mensual';
}

export function inferFileMetadata(file: { relativePath: string; filename: string }): InferredFile {
  const pathParts = file.relativePath.replace(/\\/g, '/').split('/');
  const clientName = pathParts[0] || '';

  const { from, to, month } = inferDateFromPath(file.relativePath, file.filename);

  return {
    relativePath: file.relativePath,
    filename: file.filename,
    clientName,
    sourceType: inferSourceType(file.relativePath, file.filename),
    periodicity: inferPeriodicity(file.relativePath),
    dateFrom: from,
    dateTo: to,
    month,
  };
}

export function normalizeSource(source: string): string {
  if (source.startsWith('google_ads')) return 'google_ads';
  if (source.startsWith('meta_ads')) return 'meta_ads';
  if (source === 'google_analytics') return 'google_analytics';
  if (source === 'gc_management') return 'gc_management';
  return source;
}
