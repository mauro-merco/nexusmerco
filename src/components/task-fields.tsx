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

export function Module({ icon: Icon, title, tone = 'text-muted-foreground', toneBg = 'bg-muted/60', right, children, className, stickyHeader = false }: {
  icon: LucideIcon; title: string; tone?: string; toneBg?: string; right?: ReactNode; children: ReactNode; className?: string; stickyHeader?: boolean;
}) {
  return (
    <section className={cn('tm-rise rounded-2xl bg-muted/25 p-4', className)}>
      <header className={cn('mb-3 flex items-center gap-2', stickyHeader && 'sticky top-0 z-20 rounded-xl bg-background p-2 shadow-sm')}>
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

// Keep persisted Markdown so existing descriptions and public task views still work.
export function descriptionMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent || '').replace(/\\/g, '\\\\').replace(/([*_[\]`~])/g, '\\$1').replace(/^(\s*)(#{1,3}|>|[-+]|\d+[.)])(?=\s)/gm, '$1\\$2');
  if (!(node instanceof HTMLElement)) return '';
  const text = Array.from(node.childNodes).map(descriptionMarkdown).join('');
  const tag = node.tagName;
  if (tag === 'BR') return '\n';
  const wrap = (value: string, marker: string) => value.split('\n').map(line => line.replace(/^(\s*)(.*?)(\s*)$/, (_, before, body, after) => body ? `${before}${marker}${body}${marker}${after}` : line)).join('\n');
  if (tag === 'S' || tag === 'STRIKE') return `~~${text}~~`;
  if (tag === 'PRE') return `\n\n\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
  if (tag === 'CODE') return `\`${text}\``;
  if (tag === 'A') {
    const href = node.getAttribute('href') || '';
    return /^(https?:\/\/|mailto:|\/|#)/i.test(href) ? `[${text}](${href.replace(/\s/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')})` : text;
  }
  if (tag === 'LI') return `${node.parentElement?.tagName === 'OL' ? `${Array.from(node.parentElement.children).indexOf(node) + 1}.` : '-'} ${text.trim()}\n`;
  if (tag === 'UL' || tag === 'OL') return `\n\n${text}\n`;
  const heading = /^H([1-3])$/.exec(tag)?.[1];
  if (heading) return `\n\n${'#'.repeat(Number(heading))} ${text}\n\n`;
  if (tag === 'BLOCKQUOTE' || node.classList.contains('border-l-2')) return `\n\n${text.split('\n').map(line => `> ${line}`).join('\n')}\n\n`;
  if (tag === 'P' || (tag === 'SPAN' && node.classList.contains('block'))) return `\n\n${text}\n\n`;
  if (tag === 'DIV') return `\n${text}`;
  let formatted = text;
  if (tag === 'EM' || tag === 'I' || node.style.fontStyle === 'italic') formatted = wrap(formatted, '*');
  if (tag === 'STRONG' || tag === 'B' || node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) formatted = wrap(formatted, '**');
  return formatted;
}

/* ---------- Editor de descripción visual ---------- */

export function DescriptionEditor({ value, onChange, className, placeholder, title, actions }: {
  value: string; onChange: (v: string) => void; className?: string; placeholder?: string; title?: ReactNode; actions?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  // The browser owns the editable DOM; React must not replace it on each input.
  const [initialContent] = useState(() => <MarkdownBody text={value} editable />);
  const [preview, setPreview] = useState(false);
  const rememberSelection = () => {
    const current = window.getSelection();
    if (current?.rangeCount && ref.current?.contains(current.anchorNode) && ref.current.contains(current.focusNode)) selection.current = current.getRangeAt(0).cloneRange();
  };
  const sync = () => { if (ref.current) onChange(Array.from(ref.current.childNodes).map(descriptionMarkdown).join('').trim()); };
  const apply = (command: string, argument?: string) => {
    const el = ref.current; if (!el) return;
    el.focus({ preventScroll: true });
    if (selection.current && el.contains(selection.current.commonAncestorContainer)) {
      const current = window.getSelection();
      current?.removeAllRanges(); current?.addRange(selection.current);
    }
    if (command === 'formatBlock') argument = document.queryCommandValue('formatBlock').toLowerCase() === 'h2' ? 'p' : 'h2';
    document.execCommand(command, false, argument);
    rememberSelection(); sync();
  };

  const tools: [LucideIcon, string, string, string?][] = [
    [Heading2, 'Título', 'formatBlock', 'h2'],
    [Bold, 'Negrita', 'bold'],
    [Italic, 'Cursiva', 'italic'],
    [List, 'Lista', 'insertUnorderedList'],
    [ListOrdered, 'Lista numerada', 'insertOrderedList'],
    [Link2, 'Link', 'createLink'],
  ];

  return (
    <section className={cn('tm-rise flex flex-col rounded-2xl bg-muted/25 p-4', className)}>
      <header className="sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-background p-2 shadow-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15"><FileText className="h-3.5 w-3.5 text-blue-600" /></span>
        {title ?? <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Descripción</h3>}
        {actions}
        <div className="ml-auto flex items-center gap-2">
          {!preview && (
            <div className="tm-fade flex items-center gap-0.5 rounded-xl bg-background/70 p-0.5">
              {tools.map(([I, t, command, argument]) => (
                <button key={t} type="button" title={t} aria-label={t} onMouseDown={e => e.preventDefault()} onClick={() => {
                  if (command !== 'createLink') { apply(command, argument); return; }
                  rememberSelection();
                  const url = window.prompt('URL del enlace', 'https://');
                  if (url && /^(https?:\/\/|mailto:)/i.test(url.trim())) apply(command, url.trim());
                }} className="tm-press rounded-lg p-1.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground"><I className="h-3.5 w-3.5" /></button>
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
      ) : null}
      <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Descripción"
        data-placeholder={placeholder || 'Describí la tarea: objetivo, medidas, referencias, entregables...'}
        onInput={() => { rememberSelection(); sync(); }} onSelect={rememberSelection} onMouseUp={rememberSelection} onKeyUp={rememberSelection} onBlur={rememberSelection}
        onClick={e => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); }}
        onDrop={e => e.preventDefault()}
        onPaste={e => { e.preventDefault(); rememberSelection(); apply('insertText', e.clipboardData.getData('text/plain')); }}
        className={cn('tm-noscroll min-h-[340px] w-full flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl bg-background/70 p-4 text-[15px] leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-primary/30 [&_h2]:text-lg [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]', preview && 'hidden')}>
        {initialContent}
      </div>
      <p className="mt-2 text-right text-[10px] text-muted-foreground">{value.length} caracteres · Formato visual · Ctrl+Z / Cmd+Z para deshacer</p>
    </section>
  );
}
