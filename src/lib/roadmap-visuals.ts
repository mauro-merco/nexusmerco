import { Sun, BadgeCheck, ContactRound, PackageCheck, Unplug, Workflow, UsersRound, MessagesSquare, ShieldCheck, ChartNoAxesCombined, Lightbulb, ScanSearch, CalendarDays, Rocket, CircleCheck, CircleX } from 'lucide-react';
import type { RoadmapStatus } from './roadmap';

const blue = 'bg-tint-blue text-tint-blue-foreground';
const sky = 'bg-tint-sky text-tint-sky-foreground';
const green = 'bg-tint-teal text-tint-teal-foreground';
const amber = 'bg-tint-amber text-tint-amber-foreground';

// Match meaning rather than list position so sorting and new proposals keep their identity.
const themes = [
  { match: /mi d[ií]a/i, icon: Sun, label: 'Trabajo personal', tint: amber, line: 'bg-amber-400' },
  { match: /aprobaci/i, icon: BadgeCheck, label: 'Aprobaciones', tint: green, line: 'bg-emerald-400' },
  { match: /ficha|cliente/i, icon: ContactRound, label: 'Clientes', tint: sky, line: 'bg-sky-400' },
  { match: /entregable/i, icon: PackageCheck, label: 'Entregas', tint: blue, line: 'bg-brand-blue' },
  { match: /bloqueo|dependencia/i, icon: Unplug, label: 'Flujo de trabajo', tint: amber, line: 'bg-amber-400' },
  { match: /plantilla|recurrencia|automatiza/i, icon: Workflow, label: 'Automatización', tint: sky, line: 'bg-sky-400' },
  { match: /capacidad|equipo/i, icon: UsersRound, label: 'Equipo', tint: blue, line: 'bg-brand-blue' },
  { match: /comentario|resoluci/i, icon: MessagesSquare, label: 'Colaboración', tint: green, line: 'bg-emerald-400' },
  { match: /confiabilidad|consistencia/i, icon: ShieldCheck, label: 'Calidad', tint: blue, line: 'bg-brand-blue' },
  { match: /reporte|informe|m[eé]trica/i, icon: ChartNoAxesCombined, label: 'Resultados', tint: sky, line: 'bg-sky-400' },
];

export function roadmapTheme(title: string) {
  // Reports can mention clients too; prefer their more specific theme.
  return (/reporte|informe|m[eé]trica/i.test(title) ? themes[9] : themes.find(theme => theme.match.test(title)))
    ?? { icon: Lightbulb, label: 'Mejora de producto', tint: blue, line: 'bg-brand-blue' };
}

export const ROADMAP_STATUS_VISUALS: Record<RoadmapStatus, { icon: typeof Lightbulb; tint: string }> = {
  propuesta: { icon: Lightbulb, tint: blue },
  en_evaluacion: { icon: ScanSearch, tint: amber },
  planificada: { icon: CalendarDays, tint: sky },
  en_curso: { icon: Rocket, tint: blue },
  completada: { icon: CircleCheck, tint: green },
  descartada: { icon: CircleX, tint: 'bg-tint-red text-tint-red-foreground' },
};
