/**
 * Rutas propias del calendario de clientes. Cada vista tiene su URL:
 *  /calendarios                         → listado de clientes
 *  /calendarios/<cliente>               → calendario de redes (el que se comparte)
 *  /calendarios/<cliente>/tareas        → calendario interno de tareas
 * Query: ?month=AAAA-MM · ?vista=agenda · ?idea=<id>
 */
export type CalendarView = 'redes' | 'tareas';

export function calendarHref(
  clientId: string,
  opts: { view?: CalendarView | string | null; month?: string | null; idea?: string | null; vista?: string | null } = {},
): string {
  const base = `/calendarios/${clientId}${opts.view === 'tareas' ? '/tareas' : ''}`;
  const params = new URLSearchParams();
  if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) params.set('month', opts.month);
  if (opts.vista === 'agenda') params.set('vista', 'agenda');
  if (opts.idea && opts.view !== 'tareas') params.set('idea', opts.idea);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Actualiza la query de la URL actual sin navegar (para que cada estado tenga link propio). */
export function replaceUrlQuery(patch: Record<string, string | null | undefined>) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, '', next);
  }
}
