'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export function CalendarPortalShare({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<{ token: string; enabled: boolean; guest_enabled: boolean; allowed_user_ids: string[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [guests, setGuests] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    setConfig(null);
    setReady(false);
    fetch('/api/calendar-portals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId }) })
      .then(async r => { const json = await r.json(); if (!r.ok) throw new Error(json.error); if (active) { setConfig(json.data); setReady(true); } })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [clientId]);

  async function configure() {
    setOpen(true); setError(''); setBusy(true);
    setIds(config?.allowed_user_ids || []); setGuests(!!config?.guest_enabled); setEnabled(config?.enabled ?? true);
    try {
      const res = await fetch('/api/users?role=client');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los invitados');
      setUsers(json.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar'); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/calendar-portals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: clientId, configure: true, enabled, guest_enabled: guests, allowed_user_ids: ids }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setConfig(json.data); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }
  const url = config && typeof window !== 'undefined' ? `${window.location.origin}/c/${config.token}` : '';
  return <section className="space-y-2 rounded-2xl border border-border bg-tint-blue p-3">
    <p className="text-sm font-semibold">Portal del cliente</p>
    <p className="text-xs text-muted-foreground">Un solo enlace para todos los meses y calendarios habilitados. Requiere una cuenta autorizada. No cambia los enlaces mensuales.</p>
    {config && <><input aria-label="Enlace universal del cliente" readOnly value={url} className="w-full rounded-full border bg-card px-3 py-2 text-xs" />
      <p className="text-xs">{config.enabled ? 'Todos los meses' : 'Acceso desactivado'}</p></>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" disabled={!ready || busy} onClick={configure}>{!ready && !error ? 'Cargando portal...' : config ? 'Configurar portal' : 'Crear portal'}</Button>
      {config?.enabled && <Button size="sm" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError('No se pudo copiar el enlace'); } }}>{copied ? 'Copiado' : 'Copiar portal'}</Button>}
    </div>
    {error && !open && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="sm:max-w-lg">
      <DialogTitle>Portal del cliente · Todos los meses</DialogTitle>
      <DialogDescription>Los usuarios asignados a este cliente pueden entrar con su cuenta. Podés autorizar otras cuentas cliente como invitados. Este permiso es independiente del mes compartido.</DialogDescription>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={enabled} onCheckedChange={v => setEnabled(v === true)} /> Habilitar portal</label>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={guests} onCheckedChange={v => setGuests(v === true)} /> Permitir invitados seleccionados</label>
      <div className="max-h-64 space-y-2 overflow-y-auto">{users.map(u => <label key={u.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm"><Checkbox disabled={!guests || busy} checked={ids.includes(u.id)} onCheckedChange={v => setIds(current => v === true ? [...current, u.id] : current.filter(id => id !== u.id))} /><span className="min-w-0 break-words">{u.full_name || u.email}<span className="block text-xs text-muted-foreground">{u.email}</span></span></label>)}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={busy} onClick={save}>{busy ? 'Cargando...' : 'Guardar acceso al portal'}</Button>
    </DialogContent></Dialog>
  </section>;
}
