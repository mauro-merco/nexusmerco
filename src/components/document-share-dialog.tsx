'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Share2, UserCheck, UserPlus } from 'lucide-react';
import type { NexusDocument } from '@/lib/types';

function authHeaders() {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: string;
}

export function DocumentShareDialog({
  document,
  isOwner,
  onShared,
}: {
  document: NexusDocument | null;
  isOwner: boolean;
  onShared: () => void;
}) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!document) return;
    setLoading(true);
    const load = async () => {
      try {
        const [usersRes, sharesRes] = await Promise.all([
          fetch('/api/users'),
          fetch(`/api/documents/${document.id}/shares`, { headers: authHeaders() }),
        ]);
        const [usersJson, sharesJson] = await Promise.all([usersRes.json(), sharesRes.json()]);
        setUsers(usersJson.data || []);
        setSharedUserIds((sharesJson.data || []).map((s: { user_id: string }) => s.user_id));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [document?.id]);

  if (!document) return null;

  const filteredUsers = users.filter((u) => {
    if (u.id === document.owner_id) return false;
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const toggleShare = async (userId: string, shared: boolean) => {
    try {
      if (shared) {
        const res = await fetch(`/api/documents/${document.id}/shares?user_id=${userId}`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        if (!res.ok) return;
      } else {
        const res = await fetch(`/api/documents/${document.id}/shares`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ user_id: userId }),
        });
        if (!res.ok) return;
      }
      setSharedUserIds(prev => shared ? prev.filter(id => id !== userId) : [...prev, userId]);
      onShared();
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={!!document} onOpenChange={(open) => { if (!open) onShared(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> Compartir documento
          </DialogTitle>
          <DialogDescription>
            Permite que otros usuarios vean y editen este documento.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar usuario por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border-0 bg-muted/50 dark:bg-white/[0.05]"
        />

        <div className="max-h-72 overflow-y-auto space-y-1">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loading && filteredUsers.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No hay usuarios disponibles</p>
          )}
          {!loading && filteredUsers.map((u) => {
            const shared = sharedUserIds.includes(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-2xl px-2.5 py-2 hover:bg-muted/50 dark:hover:bg-white/[0.04]">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatar_url || undefined} alt={u.full_name} />
                    <AvatarFallback>{u.full_name?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <button
                  disabled={!isOwner}
                  onClick={() => toggleShare(u.id, shared)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium shrink-0 transition-colors disabled:opacity-50 ${
                    shared ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted/60 dark:bg-white/[0.06] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {shared ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                  {shared ? 'Compartido' : 'Compartir'}
                </button>
              </div>
            );
          })}
        </div>

        {!isOwner && (
          <p className="text-xs text-muted-foreground">
            Solo el propietario puede gestionar los permisos de este documento.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
