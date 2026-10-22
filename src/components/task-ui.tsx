'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Loader2, Minus, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './task-motion.css';

/* ---------- Scroller: sin barras nativas, flechitas minimalistas + hint ---------- */

export function Scroller({ children, axis = 'y', className, innerClassName, hint = true }: {
  children: ReactNode; axis?: 'x' | 'y'; className?: string; innerClassName?: string; hint?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ back: false, fwd: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = axis === 'y'
      ? { back: el.scrollTop > 4, fwd: el.scrollTop + el.clientHeight < el.scrollHeight - 4 }
      : { back: el.scrollLeft > 4, fwd: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 };
    setS(p => (p.back === next.back && p.fwd === next.fwd ? p : next));
  }, [axis]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    Array.from(el.children).forEach(c => ro.observe(c));
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true, subtree: true });
    return () => { ro.disconnect(); mo.disconnect(); };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const d = (axis === 'y' ? el.clientHeight : el.clientWidth) * 0.7 * dir;
    el.scrollBy(axis === 'y' ? { top: d, behavior: 'smooth' } : { left: d, behavior: 'smooth' });
  };

  const pill = 'absolute z-20 flex items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition-all duration-200 hover:text-foreground tm-press';

  return (
    <div className={cn('relative h-full min-h-0', className)}>
      <div ref={ref} onScroll={update}
        className={cn('tm-noscroll h-full', axis === 'y' ? 'overflow-y-auto' : 'overflow-x-auto', innerClassName)}>
        {children}
      </div>
      {axis === 'y' ? (
        <>
          <button type="button" aria-label="Subir" onClick={() => go(-1)}
            className={cn(pill, 'left-1/2 top-1 h-5 w-8 -translate-x-1/2', s.back ? 'opacity-100' : 'pointer-events-none -translate-y-1 opacity-0')}>
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Bajar" onClick={() => go(1)}
            className={cn(pill, 'bottom-1 left-1/2 h-5 -translate-x-1/2 gap-1 px-2.5', s.fwd ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0')}>
            {hint && <span className="text-[9px] font-medium uppercase tracking-wider">scrollear</span>}
            <ChevronDown className="tm-bounce h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <button type="button" aria-label="Anterior" onClick={() => go(-1)}
            className={cn(pill, 'left-1 top-5 h-8 w-6', s.back ? 'opacity-100' : 'pointer-events-none -translate-x-1 opacity-0')}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Siguiente" onClick={() => go(1)}
            className={cn(pill, 'right-1 top-5 h-8 w-6', s.fwd ? 'opacity-100' : 'pointer-events-none translate-x-1 opacity-0')}>
            <ChevronRight className="tm-nudge h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Popover (posición fija: no lo recorta ningún scroll) ---------- */

export function Popover({ trigger, children, width, className }: {
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  width?: number; className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; minWidth: number } | null>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen(v => !v), []);

  useLayoutEffect(() => {
    if (!open || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const w = width ?? r.width;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
    const below = window.innerHeight - r.bottom;
    setPos(below < 280 && r.top > below
      ? { bottom: window.innerHeight - r.top + 6, left, minWidth: r.width }
      : { top: r.bottom + 6, left, minWidth: r.width });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', k, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('keydown', k, true); window.removeEventListener('resize', close); };
  }, [open, close]);

  return (
    <div ref={wrap} className="relative">
      {trigger({ open, toggle })}
      {open && pos && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={close} />
          <div style={{ ...pos, width }} className={cn('tm-pop fixed z-[101] max-h-[min(420px,70vh)] overflow-auto rounded-2xl bg-popover p-1.5 shadow-xl tm-noscroll', className)}>
            {typeof children === 'function' ? children(close) : children}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Menu (dropdown de opciones, con grupos opcionales) ---------- */

export type MenuOption = { key: string; label: string; icon?: LucideIcon; colorClass?: string; bgClass?: string; dot?: string; group?: string; hint?: string };

export function Menu({ value, options, onChange, disabled, loading, className, placeholder }: {
  value: string; options: MenuOption[]; onChange: (k: string) => void;
  disabled?: boolean; loading?: boolean; className?: string; placeholder?: string;
}) {
  const cur = options.find(o => o.key === value) || options[0];
  const CurIcon = cur.icon;
  return (
    <Popover
      trigger={({ open, toggle }) => (
        <button type="button" disabled={disabled} onClick={toggle}
          className={cn('tm-press flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:brightness-95', cur.bgClass || 'bg-background/70', cur.colorClass, className)}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : CurIcon ? <CurIcon className="h-4 w-4 shrink-0" /> : cur.dot ? <span className={cn('h-2 w-2 rounded-full', cur.dot)} /> : null}
          <span className="flex-1 truncate text-left">{value === '' && placeholder ? placeholder : cur.label}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      )}>
      {close => options.map((o, i) => {
        const I = o.icon;
        const showGroup = o.group && o.group !== options[i - 1]?.group;
        return (
          <div key={o.key || 'none'}>
            {showGroup && <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{o.group}</p>}
            <button type="button" onClick={() => { close(); onChange(o.key); }}
              className={cn('tm-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium hover:bg-muted/60', o.colorClass, o.key === value && 'bg-muted/50')}>
              {I ? <I className="h-4 w-4 shrink-0" /> : o.dot ? <span className={cn('h-2 w-2 shrink-0 rounded-full', o.dot)} /> : null}
              <span className="flex-1 whitespace-nowrap">{o.label}</span>
              {o.hint && <span className="text-[10px] font-normal text-muted-foreground">{o.hint}</span>}
              {o.key === value && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        );
      })}
    </Popover>
  );
}

/* ---------- Collapse / Switch / Stepper ---------- */

export function Collapse({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange, label, tone = 'bg-primary' }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; tone?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="tm-press flex w-full items-center gap-3 text-left">
      <span className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200', checked ? tone : 'bg-muted-foreground/25')}>
        <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-out', checked && 'translate-x-4')} />
      </span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
    </button>
  );
}

export function Stepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const n = Number(value) || 0;
  const btn = 'tm-press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground';
  return (
    <div className="flex items-center rounded-xl bg-background/70 p-0.5">
      <button type="button" className={btn} onClick={() => onChange(String(Math.max(0, n - 1)))}><Minus className="h-3.5 w-3.5" /></button>
      <input type="number" min="0" value={value === '' ? '' : n} placeholder="0" onChange={e => onChange(e.target.value)}
        className="tm-noscroll w-full min-w-0 bg-transparent text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
      <button type="button" className={btn} onClick={() => onChange(String(n + 1))}><Plus className="h-3.5 w-3.5" /></button>
    </div>
  );
}
