'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DateTimeField } from '@/components/task-fields';
import { Check, Loader2, Plus, ShoppingBag } from 'lucide-react';

export const ECOMMERCE_COLORS = [
  { label: 'Rojo', value: '#ef4444' }, { label: 'Naranja', value: '#f97316' }, { label: 'Amarillo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' }, { label: 'Cian', value: '#06b6d4' }, { label: 'Azul', value: '#3b82f6' },
  { label: 'Violeta', value: '#8b5cf6' }, { label: 'Rosa', value: '#ec4899' }, { label: 'Índigo', value: '#6366f1' },
];

export function EcommerceDateDialog({ open, onOpenChange, onCreate }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onCreate: (data: { name: string; color: string; start_date: string; end_date: string }) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setColor('#6366f1'); setStartDate(''); setEndDate(''); setError(''); };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const handleCreate = async () => {
    if (!name.trim() || !startDate || !endDate) { setError('Completá nombre y fechas'); return; }
    if (startDate > endDate) { setError('La fecha de inicio debe ser anterior o igual a la de fin'); return; }
    setSaving(true); setError('');
    try { await onCreate({ name: name.trim(), color, start_date: startDate, end_date: endDate }); reset(); onOpenChange(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-fit max-h-[92dvh] w-[min(94vw,480px)] max-w-none! flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none">
        <div className="flex items-center gap-3 bg-muted/20 px-5 py-4 pr-14">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: color + '26', color }}><ShoppingBag className="h-[18px] w-[18px]" /></span>
          <div>
            <DialogTitle className="text-base font-bold">Nueva fecha ecommerce</DialogTitle>
            <DialogDescription className="text-xs">Se marca en el calendario con el color que elijas</DialogDescription>
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre</Label>
            <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Black Friday, Cyber Monday..." className="h-10 rounded-xl border-0 bg-muted/35" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-2">
              {ECOMMERCE_COLORS.map(c => (
                <button key={c.value} type="button" title={c.label} onClick={() => setColor(c.value)}
                  className={cn('tm-press flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform hover:scale-110', color === c.value && 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background')}
                  style={{ backgroundColor: c.value }}>
                  {color === c.value && <Check className="tm-fade h-4 w-4" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="text-xs">Desde</Label><DateTimeField value={startDate} onChange={v => { setStartDate(v); if (!endDate || endDate < v) setEndDate(v); }} placeholder="Elegí inicio" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Hasta</Label><DateTimeField value={endDate} onChange={setEndDate} placeholder="Elegí fin" /></div>
          </div>
          {error && <p className="tm-pop text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 bg-muted/20 px-5 py-3">
          <DialogClose render={<Button variant="outline" className="tm-press rounded-lg" />}>Cancelar</DialogClose>
          <Button onClick={handleCreate} disabled={saving} className="tm-press gap-1.5 rounded-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear fecha
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
