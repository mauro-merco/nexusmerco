'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Menu } from '@base-ui/react/menu';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { IDEA_STATUS_ORDER, STATUS_CONFIG, ideaName } from '@/lib/social-config';
import type { SocialIdea, IdeaStatus } from '@/lib/types';

export type IdeaAction = 'duplicate' | 'delete' | IdeaStatus;
export const CalendarIdeaActionsContext = createContext<((idea: SocialIdea, action: IdeaAction) => Promise<void>) | null>(null);

export function CalendarIdeaActions({ idea, onOpen, children }: { idea: SocialIdea; onOpen: () => void; children: ReactNode }) {
  const action = useContext(CalendarIdeaActionsContext);
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  if (!action) return children;
  const run = async (value: IdeaAction) => {
    if (busy || (value === 'delete' && !window.confirm(`¿Eliminar "${ideaName(idea)}"? Esta acción no se puede deshacer.`))) return;
    setBusy(true);
    setError('');
    try { await action(idea, value); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el cambio'); }
    finally { setBusy(false); }
  };
  return <div className="relative min-w-0 pr-9" onClick={e => e.stopPropagation()} onContextMenu={e => {
    e.preventDefault(); e.stopPropagation(); setPoint({ x: e.clientX, y: e.clientY }); setOpen(true);
  }} onKeyDown={e => {
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); e.stopPropagation(); setPoint(null); setOpen(true); }
  }}>
    {children}
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger ref={trigger} disabled={busy} aria-label={`Opciones de ${ideaName(idea)}`} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setPoint(null); }} className="absolute right-0 top-0 flex min-h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary md:min-h-7" ><MoreHorizontal className="h-4 w-4" /></Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner anchor={point ? { getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0) } : trigger} sideOffset={5} collisionPadding={8} className="z-[150] outline-none">
          <Menu.Popup className="max-h-[min(70dvh,var(--available-height))] w-64 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl outline-none" onClick={e => e.stopPropagation()}>
            <p className="truncate px-2 py-1.5 text-xs font-semibold text-muted-foreground">{ideaName(idea)}</p>
            <DropdownMenuItem onClick={onOpen}><Pencil /> Abrir / editar</DropdownMenuItem>
            <DropdownMenuItem disabled={busy} onClick={() => void run('duplicate')}><Copy /> Duplicar como borrador</DropdownMenuItem>
            <DropdownMenuSeparator />
            {IDEA_STATUS_ORDER.map(status => <DropdownMenuItem key={status} disabled={busy || status === idea.status} onClick={() => void run(status)}><span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[status].dotColor}`} />{STATUS_CONFIG[status].label}{status === idea.status ? ' (actual)' : ''}</DropdownMenuItem>)}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" disabled={busy} onClick={() => void run('delete')}><Trash2 /> Eliminar</DropdownMenuItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
    {busy && <p role="status" className="px-1 text-xs text-muted-foreground">Guardando...</p>}
    {error && <p role="alert" className="px-1 text-xs text-destructive">{error}</p>}
  </div>;
}
