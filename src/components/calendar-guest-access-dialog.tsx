'use client';

import { useEffect, useState } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/ui/dialog';

type ClientUser = {
  id: string;
  email: string;
  full_name: string | null;
};

type ClientOption = {
  id: string;
  name: string;
};

type CalendarShareConfig = {
  token: string | null;
  allowed_client_id?: string;
  guest_enabled: boolean;
  allowed_user_ids: string[];
};

interface CalendarGuestAccessDialogProps {
  clientId: string;
  calendarType: 'social' | 'ads';
  month: string;
  config: CalendarShareConfig | null;
  onConfigChange: (config: CalendarShareConfig) => void;
}

export function CalendarGuestAccessDialog({ clientId, calendarType, month, config, onConfigChange }: CalendarGuestAccessDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [allowedClientId, setAllowedClientId] = useState(clientId);
  const [guestEnabled, setGuestEnabled] = useState(false);
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const initialClientId = config?.allowed_client_id || clientId;
    setAllowedClientId(initialClientId);
    setGuestEnabled(!!config?.guest_enabled);
    setAllowedUserIds(config?.allowed_user_ids || []);
    setLoading(true);
    setError('');
    Promise.all([fetch('/api/clients').then(r => r.json()), fetch(`/api/users?client_id=${initialClientId}`).then(r => r.json())])
      .then(([clientsJson, usersJson]) => {
        setClients(clientsJson.data || []);
        setUsers(usersJson.data || []);
      })
      .catch(() => setError('No se pudieron cargar los clientes'))
      .finally(() => setLoading(false));
  }, [open, clientId, config]);

  useEffect(() => {
    if (!open) return;
    const initialClientId = config?.allowed_client_id || clientId;
    setLoading(true);
    if (allowedClientId !== initialClientId) setAllowedUserIds([]);
    fetch(`/api/users?client_id=${allowedClientId}`)
      .then(r => r.json())
      .then(json => setUsers(json.data || []))
      .catch(() => setError('No se pudieron cargar los usuarios cliente'))
      .finally(() => setLoading(false));
  }, [allowedClientId, open]);

  const toggleUser = (userId: string) => {
    setAllowedUserIds(current => current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/calendar-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          calendar_type: calendarType,
          month,
          allowed_client_id: allowedClientId,
          guest_enabled: guestEnabled,
          allowed_user_ids: guestEnabled ? allowedUserIds : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'No se pudo guardar'); return; }
      onConfigChange({
        token: json.data?.token || config?.token || null,
        allowed_client_id: json.data?.allowed_client_id || allowedClientId,
        guest_enabled: !!json.data?.guest_enabled,
        allowed_user_ids: json.data?.allowed_user_ids || [],
      });
      setOpen(false);
    } catch {
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = config?.guest_enabled ? config.allowed_user_ids.length : 0;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Settings className="h-3.5 w-3.5" /> Invitados{enabledCount ? ` (${enabledCount})` : ''}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Acceso de invitados</DialogTitle>
          <DialogDescription>Definí qué cliente y qué usuarios pueden entrar al link de {month}.</DialogDescription>

          <div className="space-y-4 py-2">
            <label className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium">
              <Checkbox checked={guestEnabled} onCheckedChange={(checked) => setGuestEnabled(checked === true)} />
              Habilitar invitado
            </label>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente autorizado</label>
              <select
                value={allowedClientId}
                disabled={!guestEnabled}
                onChange={(event) => setAllowedClientId(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : users.length === 0 ? (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay usuarios asociados al cliente seleccionado.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {users.map(user => (
                  <label key={user.id} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
                    <Checkbox
                      checked={allowedUserIds.includes(user.id)}
                      disabled={!guestEnabled}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{user.full_name || user.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="cta" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Guardar acceso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
