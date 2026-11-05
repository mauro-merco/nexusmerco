'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { hasModuleAccess } from '@/lib/permissions';
import { NoAccess } from '@/components/no-access';
import { Button } from '@/components/ui/button';
import { SalaDialog } from '@/components/sala-dialog';
import { SalaRoomView } from '@/components/sala-room-view';
import { SalaParticipationPanel } from '@/components/sala-participation-panel';
import { useSalas } from '@/lib/hooks/use-salas';
import { SALA_KIND_CONFIG, salaEmojiGradient } from '@/lib/sala-config';
import { cn } from '@/lib/utils';
import type { Sala } from '@/lib/types';
import {
  Eye,
  Loader2,
  Lock,
  MessagesSquare,
  Plus,
  Search,
  Sparkles,
  Users2,
} from 'lucide-react';

export default function SalasPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const { rooms, loading, error, refresh: refreshRooms, createSala, updateSala, deleteSala, join, leave } = useSalas();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Sala | null>(null);
  const [activeTab, setActiveTab] = useState<'salas' | 'participacion'>('salas');
  const [participationSala, setParticipationSala] = useState<Sala | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isStaff = user?.role === 'admin' || user?.role === 'operador';

  useEffect(() => {
    if (!user) return;
    const requested = searchParams.get('sala');
    if (requested) {
      setSelectedId(requested);
      setMobileOpen(true);
      setActiveTab('salas');
    }
  }, [searchParams, user]);

  useEffect(() => {
    if (loading) return;
    if (rooms.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rooms.some(r => r.id === selectedId)) {
      setSelectedId(rooms[0].id);
    }
  }, [rooms, loading, selectedId]);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedId) || null, [rooms, selectedId]);

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rooms;
    return rooms.filter(r =>
      r.name.toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term)
    );
  }, [rooms, search]);

  const boletines = filteredRooms.filter(r => r.kind === 'boletin');
  const chats = filteredRooms.filter(r => r.kind === 'chat');
  const totalUnread = rooms.reduce((acc, r) => acc + (r.unread || 0), 0);

  const selectRoom = (id: string) => {
    setSelectedId(id);
    setMobileOpen(true);
    setActiveTab('salas');
  };

  const openParticipation = (sala: Sala | null) => {
    setParticipationSala(sala);
    setActiveTab('participacion');
  };

  const handleCreate = async (data: Parameters<typeof createSala>[0]) => {
    setActionError(null);
    const created = await createSala(data);
    setSelectedId(created.id);
    setMobileOpen(true);
  };

  const handleEdit = async (data: Parameters<typeof updateSala>[1]) => {
    if (!editingRoom) return;
    setActionError(null);
    await updateSala(editingRoom.id, data);
    setEditingRoom(null);
  };

  const handleDelete = useCallback(async (sala: Sala) => {
    if (!window.confirm(`¿Eliminar la sala «${sala.name}»? Se borran sus mensajes y no se puede deshacer.`)) return;
    setActionError(null);
    try {
      await deleteSala(sala.id);
      if (selectedId === sala.id) setSelectedId(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  }, [deleteSala, selectedId]);

  if (!hasModuleAccess(user, 'salas')) {
    return <NoAccess message="No tienes permiso para acceder a las salas." />;
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[540px] flex-col gap-3 md:h-[calc(100dvh-6rem)]">
      {/* Page header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-tech glow-tech flex h-10 w-10 items-center justify-center rounded-2xl">
            <MessagesSquare className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-gradient-tech text-xl font-bold leading-tight sm:text-2xl">Salas</h1>
            <p className="text-[11px] text-muted-foreground">
              Boletines y conversaciones de todo el equipo
              {totalUnread > 0 && <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{totalUnread} sin leer</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isStaff && (
            <Button variant="cta" size="cta" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva sala
            </Button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1 border-b" role="tablist" aria-label="Secciones de Salas">
        <button type="button" role="tab" aria-selected={activeTab === 'salas'} onClick={() => setActiveTab('salas')}
          className={cn('px-4 py-2 text-xs font-semibold transition-colors', activeTab === 'salas' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
          Salas
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'participacion'} onClick={() => openParticipation(null)}
          className={cn('flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors', activeTab === 'participacion' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground')}>
          <Eye className="h-3.5 w-3.5" /> Mi participación
        </button>
      </div>

      {(error || actionError) && (
        <div className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
          {actionError || error}
        </div>
      )}

      {/* App shell */}
      {activeTab === 'salas' ? <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Room list */}
        <aside className={cn(
          'flex w-full shrink-0 flex-col border-r bg-muted/10 lg:w-72',
          mobileOpen && 'hidden lg:flex'
        )}>
          <div className="shrink-0 border-b p-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar salas…"
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-2 text-[11px] outline-none focus:border-primary/40"
              />
            </div>
          </div>

          <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-2">
            {loading && rooms.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando salas…
              </div>
            )}
            {!loading && filteredRooms.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <MessagesSquare className="h-7 w-7 opacity-30" />
                <p className="text-[11px]">{search ? 'Sin resultados' : 'Todavía no hay salas'}</p>
              </div>
            )}

            {boletines.length > 0 && (
              <RoomSection
                label="Boletines"
                icon={SALA_KIND_CONFIG.boletin.icon}
                rooms={boletines}
                selectedId={selectedId}
                onSelect={selectRoom}
              />
            )}
            {chats.length > 0 && (
              <RoomSection
                label="Salas de chat"
                icon={SALA_KIND_CONFIG.chat.icon}
                rooms={chats}
                selectedId={selectedId}
                onSelect={selectRoom}
              />
            )}
          </div>

          <div className="shrink-0 border-t bg-background/50 px-2.5 py-2">
            <p className="text-[9.5px] leading-relaxed text-muted-foreground">
              {isStaff
                ? 'Creá boletines para anuncios y salas para conversar.'
                : 'Entrá a una sala para leer, reaccionar, marcar visto y responder.'}
            </p>
          </div>
        </aside>

        {/* Room content */}
        <section className={cn('min-w-0 flex-1 flex-col', mobileOpen ? 'flex' : 'hidden lg:flex')}>
          {selectedRoom ? (
            <SalaRoomView
              key={selectedRoom.id}
              salaId={selectedRoom.id}
              room={selectedRoom}
              me={user}
              onBack={() => setMobileOpen(false)}
              onEdit={(sala) => setEditingRoom(sala)}
              onJoin={join}
              onLeave={leave}
              onDelete={handleDelete}
              onParticipation={openParticipation}
              onLoaded={refreshRooms}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <span className="bg-gradient-tech flex h-14 w-14 items-center justify-center rounded-2xl">
                <Sparkles className="h-7 w-7 text-white" />
              </span>
              <div>
                <p className="text-sm font-bold">Elegí una sala</p>
                <p className="mt-1 max-w-xs text-[11px] text-muted-foreground">
                  Los boletines son anuncios del equipo. Las salas de chat son conversaciones abiertas para todos.
                </p>
              </div>
              {isStaff && (
                <Button variant="cta" size="cta" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" /> Crear la primera sala
                </Button>
              )}
            </div>
          )}
        </section>

      </div> : (
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto rounded-2xl border bg-card p-4 shadow-sm sm:p-6" role="tabpanel">
          <div className="mx-auto max-w-3xl">
            <p className="mb-4 text-xs text-muted-foreground">Cada mensaje, respuesta, boletín, reacción y visto queda registrado en tu perfil.</p>
            {user && <SalaParticipationPanel key={participationSala?.id || 'todas'} userId={user.id} salaId={participationSala?.id || null}
              title={participationSala ? `Participación en «${participationSala.name}»` : 'Mi participación en las salas'} />}
          </div>
        </div>
      )}

      {/* Create dialog */}
      <SalaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
      />

      {/* Edit dialog */}
      <SalaDialog
        open={!!editingRoom}
        onOpenChange={(open) => { if (!open) setEditingRoom(null); }}
        initial={editingRoom}
        onSave={handleEdit}
      />

    </div>
  );
}

function RoomSection({
  label,
  icon: Icon,
  rooms,
  selectedId,
  onSelect,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  rooms: Sala[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-2 pb-1.5">
        <p className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" />
          {label}
        </p>
        <span className="text-[9px] font-semibold text-muted-foreground/70">{rooms.length}</span>
      </div>
      <div className="space-y-0.5">
        {rooms.map(room => {
          const active = room.id === selectedId;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                active
                  ? 'border border-primary/25 bg-gradient-tech-soft'
                  : 'border border-transparent hover:bg-muted/60'
              )}
            >
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-base shadow-sm',
                salaEmojiGradient(room.color)
              )}>
                {room.emoji || (room.kind === 'boletin' ? '📣' : '💬')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className={cn('truncate text-xs', room.unread ? 'font-bold' : 'font-semibold')}>{room.name}</span>
                  {room.visibility === 'privada' && <Lock className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />}
                </span>
                <span className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
                  <Users2 className="h-2.5 w-2.5" />
                  {room.member_count || 0}
                  <span className="truncate">
                    {room.last_message
                      ? `· ${room.last_message.author?.full_name?.split(' ')[0] || 'Alguien'}: ${room.last_message.content}`
                      : room.joined ? '· Sin mensajes' : '· Unirte para participar'}
                  </span>
                </span>
              </span>
              {!!room.unread && (
                <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[8.5px] font-bold text-primary-foreground">
                  {room.unread > 99 ? '99+' : room.unread}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
