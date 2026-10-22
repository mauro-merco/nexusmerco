'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MarkdownBody } from '@/lib/markdown';
import { Popover, Menu, type MenuOption } from '@/components/task-ui';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TASK_STATUSES, TASK_PRIORITIES, TASK_TYPE_CATEGORIES } from '@/lib/task-config';
import { DEPARTMENT_CATEGORIES, DEPARTMENT_CONFIG } from '@/lib/department-config';
import type { TaskDepartment } from '@/lib/types';
import {
  Bold, Italic, List, ListOrdered, Heading2, Link2, FileText, CalendarDays, ChevronLeft, ChevronRight, X, Eye, Pencil,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ---------- opciones compartidas ---------- */

export const STATUS_OPTIONS: MenuOption[] = TASK_STATUSES.map(k => {
  const s = TASK_STATUS_CONFIG[k];
  return { key: k, label: s.label, icon: s.icon, colorClass: s.colorClass, bgClass: s.bgColorClass };
});
export const PRIORITY_OPTIONS: MenuOption[] = TASK_PRIORITIES.map(k => {
  const p = TASK_PRIORITY_CONFIG[k];
  return { key: k, label: p.label, dot: p.dotColor, colorClass: p.colorClass };
});
export const TYPE_OPTIONS: MenuOption[] = [
  { key: '', label: 'Sin tipo' },
  ...TASK_TYPE_CATEGORIES.flatMap(c => c.types.map(t => ({ key: t.id, label: t.label, icon: c.icon, colorClass: c.colorClass, group: c.label }))),
];

const pad = (n: number) => String(n).padStart(2, '0');
export function parseDT(v: string): Date | null {
  if (!v) return null;
  const [d, t = ''] = v.split('T');
  const [y, m, da] = d.split('-').map(Number);
  if (!y || !m || !da) return null;
  const [h = 0, mi = 0] = t.split(':').map(Number);
  return new Date(y, m - 1, da, h || 0, mi || 0);
}
export function fmtDT(d: Date, withTime: boolean) {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base}T${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}
export const isoIn = (days: number) => { const x = new Date(); x.setDate(x.getDate() + days); return fmtDT(x, false); };

/* ---------- Module ---------- */

export function Module({ icon: Icon, title, tone = 'text-muted-foreground', toneBg = 'bg-muted/60', right, children, className }: {
  icon: LucideIcon; title: string; tone?: string; toneBg?: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn('tm-rise rounded-2xl bg-muted/25 p-4', className)}>
      <header className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', toneBg)}><Icon className={cn('h-3.5 w-3.5', tone)} /></span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">{title}</h3>
        {right && <div className="ml-auto">{right}</div>}
      </header>
      {children}
    </section>
  );
}

/* ---------- Departamento: dropdown agrupado con SLA ---------- */

const DEPT_OPTIONS: MenuOption[] = [
  { key: '', label: 'Sin departamento' },
  ...Object.entries(DEPARTMENT_CATEGORIES).flatMap(([cat, depts]) =>
    depts.map(d => {
      const c = DEPARTMENT_CONFIG[d];
      return { key: d, label: c.label, icon: c.icon, colorClass: c.textColorClass, group: cat, hint: `${c.slaHours}h` };
    })),
];

export function DepartmentMenu({ value, onChange }: { value: TaskDepartment | null; onChange: (d: TaskDepartment | null) => void }) {
  return <Menu value={value || ''} options={DEPT_OPTIONS} onChange={k => onChange((k || null) as TaskDepartment | null)} placeholder="Elegí un departamento" />;
}

/* ---------- Fecha / hora: calendario + hora visual ---------- */

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function DatePanel({ value, onChange, withTime, close }: { value: string; onChange: (v: string) => void; withTime: boolean; close: () => void }) {
  const cur = parseDT(value);
  const today = new Date();
  const [view, setView] = useState(() => { const b = cur || today; return new Date(b.getFullYear(), b.getMonth(), 1); });
  const set = (d: Date) => onChange(fmtDT(d, withTime));

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), 1 - offset + i));
  }, [view]);

  const pickDay = (d: Date) => {
    const n = new Date(d);
    n.setHours(cur ? cur.getHours() : withTime ? 9 : 0, cur ? cur.getMinutes() : 0, 0, 0);
    set(n);
  };
  const setTime = (h: number | null, m: number | null) => {
    const n = cur ? new Date(cur) : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0);
    if (h !== null) n.setHours(h);
    if (m !== null) n.setMinutes(m);
    set(n);
  };
  const quick = (days: number) => { const n = new Date(); n.setDate(n.getDate() + days); setView(new Date(n.getFullYear(), n.getMonth(), 1)); pickDay(n); };

  const nav = 'tm-press rounded-lg p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground';
  const chip = 'tm-press rounded-lg px-2 py-1 text-[11px] font-medium';

  return (
    <div className="w-[300px] space-y-3 p-2">
      <div className="flex items-center gap-1.5">
        {[['Hoy', 0], ['Mañana', 1], ['+1 sem', 7]].map(([l, d]) => (
          <button key={l as string} type="button" onClick={() => quick(d as number)} className={cn(chip, 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground')}>{l}</button>
        ))}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <button type="button" className={nav} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold capitalize">{view.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</span>
          <button type="button" className={nav} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {DAYS.map(d => <span key={d} className="py-1 text-[10px] font-semibold text-muted-foreground">{d}</span>)}
          {cells.map(d => {
            const inMonth = d.getMonth() === view.getMonth();
            const sel = cur && sameDay(d, cur);
            const isToday = sameDay(d, today);
            return (
              <button key={d.toISOString()} type="button" onClick={() => pickDay(d)}
                className={cn('tm-press h-8 rounded-lg text-xs transition-colors',
                  sel ? 'bg-primary font-bold text-primary-foreground' : inMonth ? 'text-foreground hover:bg-muted/70' : 'text-muted-foreground/40 hover:bg-muted/40',
                  isToday && !sel && 'font-bold text-primary ring-1 ring-primary/40')}>
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {withTime && (
        <div className="space-y-2 rounded-xl bg-muted/30 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Hora</p>
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }, (_, h) => (
              <button key={h} type="button" onClick={() => setTime(h, null)}
                className={cn(chip, 'px-0 text-center', cur && cur.getHours() === h ? 'bg-primary font-bold text-primary-foreground' : 'bg-background/70 text-foreground/80 hover:bg-background')}>{pad(h)}</button>
            ))}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Minutos</p>
          <div className="grid grid-cols-6 gap-1">
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
              <button key={m} type="button" onClick={() => setTime(null, m)}
                className={cn(chip, 'px-0 text-center', cur && cur.getMinutes() === m ? 'bg-primary font-bold text-primary-foreground' : 'bg-background/70 text-foreground/80 hover:bg-background')}>{pad(m)}</button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => { onChange(''); close(); }} className={cn(chip, 'text-muted-foreground hover:text-red-500')}>Limpiar</button>
        <button type="button" onClick={close} className={cn(chip, 'bg-primary px-3 py-1.5 text-primary-foreground')}>Listo</button>
      </div>
    </div>
  );
}

export function DateTimeField({ value, onChange, withTime = false, placeholder = 'Elegí una fecha' }: {
  value: string; onChange: (v: string) => void; withTime?: boolean; placeholder?: string;
}) {
  const d = parseDT(value);
  return (
    <Popover width={316}
      trigger={({ toggle }) => (
        <div className="relative">
          <button type="button" onClick={toggle} className="tm-press flex w-full items-center gap-2 rounded-xl bg-background/70 px-3 py-2 text-left text-sm hover:brightness-95">
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            {d ? (
              <span className="flex-1 truncate font-semibold">
                {d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                {withTime && <span className="font-medium text-muted-foreground"> · {pad(d.getHours())}:{pad(d.getMinutes())}</span>}
              </span>
            ) : <span className="flex-1 text-muted-foreground">{placeholder}</span>}
          </button>
          {d && <button type="button" title="Quitar" onClick={() => onChange('')} className="tm-press absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}>
      {close => <DatePanel value={value} onChange={onChange} withTime={withTime} close={close} />}
    </Popover>
  );
}

/* ---------- Editor de descripción (Markdown con vista previa) ---------- */

export function DescriptionEditor({ value, onChange, className, placeholder, title }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; title?: ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const apply = (fn: (v: string, s: number, e: number) => [string, number, number]) => {
    const el = ref.current; if (!el) return;
    const [next, a, b] = fn(value, el.selectionStart, el.selectionEnd);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(a, b); });
  };
  const wrap = (before: string, after = before, ph = 'texto') => apply((v, s, e) => {
    const sel = v.slice(s, e) || ph;
    return [v.slice(0, s) + before + sel + after + v.slice(e), s + before.length, s + before.length + sel.length];
  });
  const prefix = (p: string) => apply((v, s, e) => {
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    return [v.slice(0, ls) + p + v.slice(ls), s + p.length, e + p.length];
  });

  const tools: [LucideIcon, string, () => void][] = [
    [Heading2, 'Título', () => prefix('## ')],
    [Bold, 'Negrita', () => wrap('**')],
    [Italic, 'Cursiva', () => wrap('*')],
    [List, 'Lista', () => prefix('- ')],
    [ListOrdered, 'Lista numerada', () => prefix('1. ')],
    [Link2, 'Link', () => wrap('[', '](https://)')],
  ];

  return (
    <section className={cn('tm-rise flex flex-col rounded-2xl bg-muted/25 p-4', className)}>
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15"><FileText className="h-3.5 w-3.5 text-blue-600" /></span>
        {title ?? <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Descripción</h3>}
        <div className="ml-auto flex items-center gap-2">
          {!preview && (
            <div className="tm-fade flex items-center gap-0.5 rounded-xl bg-background/70 p-0.5">
              {tools.map(([I, t, fn]) => (
                <button key={t} type="button" title={t} onClick={fn} className="tm-press rounded-lg p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"><I className="h-3.5 w-3.5" /></button>
              ))}
            </div>
          )}
          <div className="flex rounded-xl bg-background/70 p-0.5 text-[11px] font-medium">
            {([[false, Pencil, 'Escribir'], [true, Eye, 'Vista previa']] as [boolean, LucideIcon, string][]).map(([p, I, l]) => (
              <button key={l} type="button" onClick={() => setPreview(p)}
                className={cn('tm-press flex items-center gap-1 rounded-lg px-2.5 py-1.5', preview === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <I className="h-3 w-3" /> {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      {preview ? (
        <div className="tm-fade tm-noscroll min-h-[340px] flex-1 overflow-y-auto rounded-xl bg-background/70 p-4">
          {value.trim() ? <MarkdownBody text={value} className="text-[15px] leading-relaxed text-foreground/90" /> : <p className="text-sm italic text-muted-foreground">Nada para mostrar todavía</p>}
        </div>
      ) : (
        <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'Describí la tarea: objetivo, medidas, referencias, entregables...'}
          className="tm-noscroll min-h-[340px] w-full flex-1 resize-none rounded-xl bg-background/70 p-4 text-[15px] leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-primary/30" />
      )}
      <p className="mt-2 text-right text-[10px] text-muted-foreground">{value.length} caracteres · Markdown: **negrita**, *cursiva*, listas, ## títulos</p>
    </section>
  );
}
