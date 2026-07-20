import Papa from 'papaparse';

export interface AnalyticsTrafficRow {
  source_medium: string;
  sessions: number;
  engaged_sessions: number;
  engagement_rate: number;
  avg_engagement_time: number;
  events_per_session: number;
  total_events: number;
  key_events: number;
  key_event_rate: number;
  total_revenue: number;
}

export interface AnalyticsParsedResult {
  dateRange: { start: string; end: string };
  property: string;
  rows: AnalyticsTrafficRow[];
}

function parseMetaLines(text: string): { start: string; end: string; property: string } {
  const lines = text.split('\n');
  let start = '', end = '', property = '';
  for (const line of lines) {
    if (line.startsWith('# Fecha de inicio:')) {
      const m = line.match(/:?\s*(\d{8})/);
      if (m) {
        const d = m[1];
        start = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      }
    }
    if (line.startsWith('# Fecha de finalización:')) {
      const m = line.match(/:?\s*(\d{8})/);
      if (m) {
        const d = m[1];
        end = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      }
    }
    if (line.startsWith('# Propiedad:')) {
      property = line.replace('# Propiedad:', '').trim();
    }
  }
  return { start, end, property };
}

function parseNum(val: string): number {
  if (!val || val === '--' || val === '-') return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
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

export function parseAnalytics(text: string): AnalyticsParsedResult {
  const { start, end, property } = parseMetaLines(text);
  const dateRange = { start, end };

  const cleanLines = text.split('\n').filter(l => !l.startsWith('#') && l.trim());
  const result = Papa.parse<Record<string, string>>(cleanLines.join('\n'), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: AnalyticsTrafficRow[] = [];
  for (const row of result.data) {
    const source = getCol(row, 'Fuente/medio de la sesión', 'Session source/medium', 'Source / medium', 'Source/medium');
    if (!source) continue;
    rows.push({
      source_medium: source,
      sessions: parseNum(getCol(row, 'Sesiones', 'Sessions')),
      engaged_sessions: parseNum(getCol(row, 'Sesiones con interacción', 'Engaged sessions')),
      engagement_rate: parseNum(getCol(row, 'Porcentaje de interacciones', 'Engagement rate')),
      avg_engagement_time: parseNum(getCol(row, 'Tiempo de interacción medio por sesión', 'Average engagement time')),
      events_per_session: parseNum(getCol(row, 'Eventos por sesión', 'Events per session')),
      total_events: parseNum(getCol(row, 'Número de eventos', 'Number of events', 'Events')),
      key_events: parseNum(getCol(row, 'Eventos clave', 'Key events')),
      key_event_rate: parseNum(getCol(row, 'Tasa de evento clave de sesión', 'Key event rate')),
      total_revenue: parseNum(getCol(row, 'Total de ingresos', 'Total revenue')),
    });
  }

  return { dateRange, property, rows };
}
