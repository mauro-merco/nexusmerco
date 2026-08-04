'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { UserRole, ModuleId } from '@/lib/types';
import { ALL_MODULES, DEFAULT_MODULES } from '@/lib/types';
import { AiUsagePanel } from '@/components/ai-usage-panel';
import {
  Loader2, Check, Plus, Trash2, Users, UserCog, Shield, Eye, EyeOff, X,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  visible_modules: ModuleId[];
}

const MODULE_LABELS: Record<ModuleId, string> = {
  dashboard: 'Centro de Control',
  wizard: 'Asistente Semanal',
  tareas: 'Tareas',
  analysis: 'Análisis',
  integrations: 'Integraciones',
  insights: 'Insights IA',
  calendarios: 'Calendario de clientes',
  documentos: 'Documentos',
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  operador: 'Operador',
  client: 'Cliente',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-500/15 text-purple-500',
  operador: 'bg-blue-500/15 text-blue-500',
  client: 'bg-green-500/15 text-green-500',
};

export default function SettingsPage() {
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-8">
      <div>
        <h1 className="text-lg font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Gestioná tu perfil y los usuarios de la plataforma.</p>
      </div>

      <Tabs defaultValue={isAdmin ? 'users' : 'profile'}>
        <TabsList>
          <TabsTrigger value="profile">Mi perfil</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>}
          <TabsTrigger value="ai">Uso IA</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}

        <TabsContent value="ai">
          <AiUsagePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
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
        body: JSON.stringify({ userId: user.id, full_name: fullName.trim(), email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');
      useAuthStore.setState({
        user: { ...user, full_name: json.data.full_name || fullName, email: json.data.email || email },
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
    <div className="max-w-lg space-y-6 mt-4">
      <div className="rounded-xl border p-4 space-y-4">
        <div className="space-y-1.5">
          <Label>Nombre completo</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre y apellido" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
        </div>
        {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> :
             saved ? <Check className="h-3.5 w-3.5 mr-1" /> : null}
            {saved ? 'Guardado' : 'Guardar'}
          </Button>
        </div>
      </div>

      <TwoFactorAuthSection />
    </div>
  );
}

function TwoFactorAuthSection() {
  const { user } = useAuthStore();
  const [step, setStep] = useState<'idle' | 'setup' | 'verify'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const { data: { session } } = await getSupabase().auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al generar QR');
      setQrCode(json.data.qrCode);
      setSecret(json.data.secret);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const { data: { session } } = await getSupabase().auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ token: code }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Código inválido');
      useAuthStore.setState({
        user: { ...user!, totp_enabled: true },
      });
      setSuccess('2FA activado correctamente');
      setStep('idle');
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!confirm('¿Desactivar 2FA? Vas a necesitar tu código 2FA o contraseña para confirmar.')) return;
    setLoading(true);
    setError('');
    const disableCode = prompt('Ingresá tu código 2FA para desactivar (o cancelá para usar contraseña)');
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const { data: { session } } = await getSupabase().auth.getSession();
      const token = session?.access_token || '';

      const body: Record<string, string> = {};
      if (disableCode) {
        body.token = disableCode;
      } else {
        const pass = prompt('Ingresá tu contraseña');
        if (!pass) { setLoading(false); return; }
        body.password = pass;
      }

      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      useAuthStore.setState({
        user: { ...user!, totp_enabled: false },
      });
      setSuccess('2FA desactivado');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = user?.totp_enabled;

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Autenticación en dos pasos (2FA)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEnabled
              ? '2FA está activo. Usás Google Authenticator para iniciar sesión.'
              : 'Aumentá la seguridad de tu cuenta con Google Authenticator.'}
          </p>
        </div>
        {!isEnabled && step === 'idle' && (
          <Button size="sm" onClick={handleSetup} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Activar'}
          </Button>
        )}
        {isEnabled && (
          <Button size="sm" variant="outline" onClick={handleDisable} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Desactivar'}
          </Button>
        )}
      </div>

      {step === 'setup' && loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {step === 'verify' && qrCode && (
        <div className="space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="Código QR para Google Authenticator" className="w-48 h-48" />
          </div>
          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground">
              Escaneá este QR con <strong>Google Authenticator</strong>
            </p>
            <p className="text-[10px] text-muted-foreground/60">
              No podés escanearlo? Usá esta clave: <code className="bg-muted px-1 rounded text-[10px]">{secret}</code>
            </p>
          </div>
          <div className="flex items-center gap-2 max-w-xs mx-auto">
            <Input
              placeholder="Código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerify(); }}
            />
            <Button size="sm" onClick={handleVerify} disabled={code.length !== 6 || loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verificar'}
            </Button>
          </div>
        </div>
      )}

      {success && <div className="rounded-lg bg-green-500/10 p-3 text-xs text-green-500">{success}</div>}
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
    </div>
  );
}

function UsersTab() {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      setUsers((json.data || []).map((u: ManagedUser) => ({
        ...u,
        visible_modules: u.visible_modules || [],
      })));
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleUpdateUser = useCallback(async (id: string, updates: Partial<ManagedUser>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      setEditingId(null);
    } else {
      const json = await res.json();
      alert(json.error || 'Error al actualizar');
    }
  }, [token]);

  const handleDeleteUser = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id));
  }, [token]);

  const handleCreateUser = useCallback((newUser: ManagedUser) => {
    setUsers(prev => [...prev, newUser]);
    setShowCreate(false);
  }, []);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{users.length} usuario{users.length !== 1 ? 's' : ''}</span>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" /> Crear usuario
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <UserRow
              key={u.id}
              user={u}
              isEditing={editingId === u.id}
              onEdit={() => setEditingId(u.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={handleUpdateUser}
              onDelete={handleDeleteUser}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateUserDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onCreate={handleCreateUser}
        />
      )}
    </div>
  );
}

function UserRow({
  user: u,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  user: ManagedUser;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (id: string, updates: Partial<ManagedUser>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editRole, setEditRole] = useState<UserRole>(u.role);
  const [editModules, setEditModules] = useState<ModuleId[]>(u.visible_modules);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(u.id, { role: editRole, visible_modules: editModules });
    setSaving(false);
  };

  const toggleModule = (m: ModuleId) => {
    setEditModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const applyRoleDefaults = (role: UserRole) => {
    setEditRole(role);
    setEditModules(DEFAULT_MODULES[role]);
  };

  if (isEditing) {
    return (
      <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">{u.full_name}</span>
            <span className="text-xs text-muted-foreground">{u.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs" onClick={onCancelEdit}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Rol</Label>
          <div className="flex gap-2">
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
              <button key={r} onClick={() => applyRoleDefaults(r)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  editRole === r ? 'border-current bg-current/10 ' + ROLE_COLORS[r] : 'border-border text-muted-foreground',
                )}>
                <Shield className="h-3 w-3 inline mr-1" />
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Módulos visibles en sidebar</Label>
            <button onClick={() => setEditModules(DEFAULT_MODULES[editRole])}
              className="text-[10px] text-muted-foreground hover:text-foreground">
              Restaurar defaults
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_MODULES.map(m => (
              <label key={m} className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors',
                editModules.includes(m) ? 'border-primary/50 bg-primary/5' : 'border-border text-muted-foreground',
              )}>
                <Checkbox checked={editModules.includes(m)} onCheckedChange={() => toggleModule(m)} />
                {MODULE_LABELS[m]}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/30 transition-colors group">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0 text-xs font-semibold">
        {u.full_name?.charAt(0) || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{u.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
      </div>
      <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0', ROLE_COLORS[u.role])}>
        {ROLE_LABELS[u.role]}
      </span>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
          <UserCog className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
          onClick={() => onDelete(u.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (user: ManagedUser) => void;
}) {
  const { token } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('operador');
  const [modules, setModules] = useState<ModuleId[]>(DEFAULT_MODULES.operador);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleModule = (m: ModuleId) => {
    setModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const applyRoleDefaults = (r: UserRole) => {
    setRole(r);
    setModules(DEFAULT_MODULES[r]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Completá todos los campos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let t = token;
      if (!t) {
        const { getSupabase } = await import('@/lib/supabase');
        const { data: { session } } = await getSupabase().auth.getSession();
        t = session?.access_token || '';
      }
      if (!t) {
        throw new Error('No hay sesión activa. Cerrá sesión y volvé a iniciar.');
      }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` },
        body: JSON.stringify({
          full_name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
          visible_modules: modules,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = json.debug ? ` | debug: ${JSON.stringify(json.debug)}` : '';
        throw new Error(`[${res.status}] ${json.error || 'Error al crear usuario'}${detail}`);
      }
      onCreate(json.data);
      setName(''); setEmail(''); setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-background rounded-xl border shadow-xl w-full max-w-md p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Crear usuario</h2>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nombre completo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@mercodigital.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Contraseña</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Rol</Label>
            <div className="flex gap-2">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <button key={r} onClick={() => applyRoleDefaults(r)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    role === r ? 'border-current bg-current/10 ' + ROLE_COLORS[r] : 'border-border text-muted-foreground',
                  )}>
                  <Shield className="h-3 w-3 inline mr-1" />
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Módulos visibles en sidebar</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_MODULES.map(m => (
                <label key={m} className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-colors',
                  modules.includes(m) ? 'border-primary/50 bg-primary/5' : 'border-border text-muted-foreground',
                )}>
                  <Checkbox checked={modules.includes(m)} onCheckedChange={() => toggleModule(m)} />
                  {MODULE_LABELS[m]}
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving || !name.trim() || !email.trim() || !password.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Crear
          </Button>
        </div>
      </div>
    </div>
  );
}
