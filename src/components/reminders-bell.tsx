'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useReminders } from '@/lib/hooks/use-reminders';
import { useAuthStore } from '@/store/auth-store';
import { AlarmClock, Plus, Trash2, Check, Loader2, X } from 'lucide-react';
import type { Reminder } from '@/lib/types';

export function RemindersBell() {
  const { user } = useAuthStore();
  const { reminders, loading, createReminder, updateReminder, deleteReminder, checkDue, refetch } = useReminders(user?.id || null);
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(() => { checkDue(); }, 30000);
    return () => clearInterval(interval);
  }, [user?.id, checkDue]);

  useEffect(() => {
    if (open) { checkDue(); refetch(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pendingCount = reminders.filter(r => !r.done).length;

  const handleAdd = async () => {
    if (!title.trim() || !when) return;
    setSaving(true);
    try {
      await createReminder({ title: title.trim(), reminder_at: new Date(when).toISOString() });
      setTitle('');
      setWhen('');
      setShowAdd(false);
    } catch { /* */ } finally { setSaving(false); }
  };

  const isOverdue = (r: Reminder) => !r.done && new Date(r.reminder_at).getTime() < Date.now();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className={cn('group relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-all', open && 'bg-muted/60')}
        onClick={() => setOpen(!open)}
        aria-label="Recordatorios"
      >
        <span className="bg-gradient-tech pointer-events-none absolute -inset-1 rounded-xl opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-30" />
        <AlarmClock className={cn('relative h-4.5 w-4.5 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110', pendingCount > 0 ? 'text-amber-400' : 'text-muted-foreground group-hover:text-foreground')} />
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-amber-500 text-[9px] font-bold text-white flex items-center justify-center px-1">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 max-h-[440px] overflow-hidden rounded-xl border bg-popover shadow-xl z-50 flex flex-col animate-[transition-fade_0.2s_ease-out]">
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gradient-to-r from-amber-400/10 to-transparent">
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <AlarmClock className="h-3.5 w-3.5 text-amber-500" /> Recordatorios
              </span>
              <button onClick={() => setShowAdd(s => !s)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                {showAdd ? <><X className="h-3 w-3" /> Cerrar</> : <><Plus className="h-3 w-3" /> Nuevo</>}
              </button>
            </div>

            {showAdd && (
              <div className="space-y-2 p-3 border-b border-border/30 bg-muted/30">
                <Input placeholder="¿Qué tenés que recordar?" value={title} onChange={e => setTitle(e.target.value)} className="h-8 text-sm" autoFocus />
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={when}
                    onChange={e => setWhen(e.target.value)}
                    className="flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-xs"
                  />
                  <Button size="sm" className="h-8 shrink-0 gap-1" onClick={handleAdd} disabled={saving || !title.trim() || !when}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Guardar
                  </Button>
                </div>
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && reminders.length === 0 && (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Sin recordatorios
                </div>
              )}
              {reminders.map(r => (
                <div key={r.id} className={cn('flex items-start gap-2.5 px-3 py-2.5 border-b border-border/30 hover:bg-muted/40 transition-colors', r.done && 'opacity-50')}>
                  <button
                    onClick={() => updateReminder(r.id, { done: !r.done })}
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      r.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-muted-foreground/40 hover:border-emerald-500 hover:text-emerald-500',
                    )}
                    aria-label="Completar recordatorio"
                  >
                    {r.done && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs', r.done ? 'line-through text-muted-foreground' : 'font-semibold')}>{r.title}</p>
                    <p className={cn('text-[10px] mt-0.5', isOverdue(r) ? 'text-red-500 font-semibold' : 'text-muted-foreground/70')}>
                      {isOverdue(r) ? 'VENCIDO · ' : ''}
                      {new Date(r.reminder_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {r.description && <p className="text-[10px] text-muted-foreground/60 mt-0.5 line-clamp-1">{r.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground/60 hover:text-red-500 shrink-0" onClick={() => deleteReminder(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
