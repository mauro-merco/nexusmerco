'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { Camera, LogOut, Settings, User, Loader2, X } from 'lucide-react';
import Link from 'next/link';

export function ProfileMenu() {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, avatar_url: URL.createObjectURL(file) }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        useAuthStore.setState({ user: { ...user, avatar_url: json.data.avatar_url || user.avatar_url } });
      }
    } catch { /* */ } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, full_name: fullName }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        useAuthStore.setState({ user: { ...user, full_name: json.data.full_name || fullName } });
        setEditing(false);
      }
    } catch { /* */ } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const initials = (user.full_name || user.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full p-0.5 hover:bg-muted/50 transition-colors"
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.full_name}
            className="h-8 w-8 rounded-full object-cover border-2 border-border" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-popover shadow-xl z-50 overflow-hidden">
            {/* Profile header */}
            <div className="px-3 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name}
                      className="h-12 w-12 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-7 text-xs" />
                  ) : (
                    <p className="text-sm font-semibold truncate">{user.full_name}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {editing ? (
                <div className="px-3 py-2 flex gap-2">
                  <Button size="sm" className="h-7 text-[10px] flex-1" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Guardar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setEditing(false); setFullName(user.full_name); }}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditing(true); setFullName(user.full_name); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" /> Editar perfil
                </button>
              )}
              <Link href="/settings" onClick={() => setOpen(false)}>
                <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors">
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Configuración
                </button>
              </Link>
              <button
                onClick={() => { setOpen(false); logout(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
