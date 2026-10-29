'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTaskClosure } from '@/lib/task-mutation';
import { EFFORT_LABELS, validateTaskClosure, type TaskClosure } from '@/lib/task-closure';

export function TaskClosureDialog() {
  const resolve = useTaskClosure(s => s.resolve);
  const [effort, setEffort] = useState('');
  const [minutes, setMinutes] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  function finish(value: TaskClosure | null) {
    useTaskClosure.setState({ resolve: null });
    resolve?.(value);
    setEffort(''); setMinutes(''); setSummary(''); setError(null);
  }
  return <Dialog open={!!resolve} onOpenChange={open => { if (!open) finish(null); }}>
    <DialogContent className="sm:max-w-md">
      <DialogTitle>Cerremos esta tarea</DialogTitle>
      <DialogDescription>Registrá el esfuerzo y el resultado para que el equipo pueda consultar cómo terminó.</DialogDescription>
      <form className="space-y-4" onSubmit={e => {
        e.preventDefault();
        const value = { closure_effort: effort, actual_minutes: minutes === '' ? null : Number(minutes), closure_summary: summary.trim() };
        const message = validateTaskClosure(value);
        if (message) { setError(message); return; }
        finish(value as TaskClosure);
      }}>
        <label className="block text-sm space-y-2"><span>1. ¿Cuánto esfuerzo llevó? *</span><select required className="w-full rounded-xl bg-muted p-3" value={effort} onChange={e => setEffort(e.target.value)}><option value="">Elegí un nivel</option>{Object.entries(EFFORT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="block text-sm space-y-2"><span>2. Tiempo real en minutos (opcional)</span><input className="w-full rounded-xl bg-muted p-3" type="number" min="1" step="1" value={minutes} onChange={e => setMinutes(e.target.value)} /></label>
        <label className="block text-sm space-y-2"><span>3. ¿Qué se hizo y qué debe saber el equipo? *</span><textarea required maxLength={10000} className="w-full rounded-xl bg-muted p-3" rows={4} value={summary} onChange={e => setSummary(e.target.value)} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => finish(null)}>Cancelar</Button><Button type="submit">Confirmar cierre</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
