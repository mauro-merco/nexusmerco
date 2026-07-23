'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          full_name: fullName.trim(),
          email: email.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');

      const updated = json.data;
      useAuthStore.setState({
        user: {
          ...user,
          full_name: updated.full_name || fullName,
          email: updated.email || email,
        },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-8">
      <div>
        <h1 className="text-lg font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Actualizá tu nombre y datos de contacto.</p>
      </div>

      <div className="space-y-4 rounded-xl border p-4">
        <div className="space-y-1.5">
          <Label>Nombre completo</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre y apellido"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> :
             saved ? <Check className="h-3.5 w-3.5 mr-1" /> : null}
            {saved ? 'Guardado' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
