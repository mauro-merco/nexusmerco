'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { SALA_COLORS, SALA_KIND_CONFIG } from '@/lib/sala-config';
import type { Sala, SalaKind, SalaVisibility, User } from '@/lib/types';
import { Check, Loader2, Lock, Search, Users2, Globe2 } from 'lucide-react';

const EMOJIS = ['📣', '💬', '☕', '🚀', '🎯', '💡', '🔥', '🎨', '📊', '🤝', '📌', '🧠', '🍕', '🎉', '👀', '🛠️'];

interface SalaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Sala | null;
  onSave: (data: {
    name: string;
    description: string;
    kind: SalaKind;
    visibility: SalaVisibility;
    emoji: string;
    color: string;
    member_ids?: string[];
  }) => Promise<unknown>;
}

export function SalaDialog({ open, onOpenChange, initial, onSave }: SalaDialogProps) {
  const { user, token } = useAuthStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<SalaKind>('chat');
  const [visibility, setVisibility] = useState<SalaVisibility>('publica');
  const [emoji, setEmoji] = useState('💬');
  const [color, setColor] = useState('cyan');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setDescription(initial?.description || '');
    setKind(initial?.kind || 'chat');
    setVisibility(initial?.visibility || 'publica');
    setEmoji(initial?.emoji || (initial?.kind === 'boletin' ? '📣' : '💬'));
    setColor(initial?.color || 'cyan');
    setMemberIds((initial?.members || []).map(m => m.user_id).filter(id => id !== user?.id));
    setError(null);
    setSearch('');
  }, [open, initial, user?.id]);

  useEffect(() => {
    if (!open || !token) return;
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(json => setUsers((json.data || []).filter((u: User) => u.id !== user?.id)))
      .catch(() => setUsers([]));
  }, [open, token, user?.id]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term)
    );
  }, [users, search]);

  const toggleMember = (id: string) => {
    setMemberIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Poné un nombre a la sala'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        kind,
        visibility,
        emoji,
        color,
        member_ids: visibility === 'privada' ? memberIds : undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          {kind === 'boletin' ? <SalaKindIcon kind={kind} /> : <SalaKindIcon kind={kind} />}
          {initial ? 'Editar sala' : 'Nueva sala'}
        </DialogTitle>
        <DialogDescription>
          Los boletines los publica el equipo y todos participan. Las salas de chat son conversaciones abiertas.
        </DialogDescription>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SALA_KIND_CONFIG) as SalaKind[]).map(k => {
            const cfg = SALA_KIND_CONFIG[k];
            const Icon = cfg.icon;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setEmoji(k === 'boletin' ? '📣' : '💬');
                  setColor(k === 'boletin' ? 'amber' : 'cyan');
                }}
                className={cn(
                  'flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                  kind === k ? cn(cfg.bgColorClass, cfg.colorClass, cfg.borderClass) : 'border-border text-muted-foreground hover:bg-muted/40'
                )}
              >
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {cfg.label}</span>
                <span className="text-[10px] font-normal opacity-80">{cfg.description}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={kind === 'boletin' ? 'Ej: Anuncios de la semana' : 'Ej: Diseño y creatividad'}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="¿De qué se habla en esta sala?"
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            maxLength={280}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Visibilidad</Label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'publica' as const, label: 'Pública', desc: 'Todo el equipo puede entrar', icon: Globe2 },
              { id: 'privada' as const, label: 'Privada', desc: 'Solo invitados', icon: Lock },
            ]).map(({ id, label, desc, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setVisibility(id)}
                className={cn(
                  'flex items-start gap-2 rounded-xl border px-3 py-2 text-left transition-colors',
                  visibility === id ? 'border-primary/50 bg-primary/5 text-foreground' : 'border-border text-muted-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-xs font-semibold">{label}</span>
                  <span className="block text-[10px] opacity-80">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Ícono</Label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border text-base transition-colors',
                    emoji === e ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted/60'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SALA_COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-all',
                    c.dotClass,
                    color === c.id ? c.ringClass : 'ring-transparent'
                  )}
                >
                  {color === c.id && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibility === 'privada' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5"><Users2 className="h-3.5 w-3.5" /> Invitados ({memberIds.length})</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-7 w-36 rounded-md border border-input bg-transparent pl-7 pr-2 text-xs"
                />
              </div>
            </div>
            <div className="sidebar-scroll max-h-40 space-y-1 overflow-y-auto rounded-lg border p-1.5">
              {filteredUsers.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">Sin usuarios</p>}
              {filteredUsers.map(u => {
                const selected = memberIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleMember(u.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
                      selected ? 'bg-primary/10' : 'hover:bg-muted/60'
                    )}
                  >
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-bold">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-medium">{u.full_name}</span>
                      <span className="block truncate text-[9.5px] text-muted-foreground">{u.email}</span>
                    </span>
                    <span className={cn('flex h-4 w-4 items-center justify-center rounded border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="cta" disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {initial ? 'Guardar cambios' : 'Crear sala'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SalaKindIcon({ kind }: { kind: SalaKind }) {
  const Icon = SALA_KIND_CONFIG[kind].icon;
  return <Icon className="h-5 w-5" />;
}
