'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentSkeleton } from '@/components/content-skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NoAccess } from '@/components/no-access';
import { useAuthStore } from '@/store/auth-store';
import { useClients } from '@/lib/hooks/use-clients';
import { hasModuleAccess, getAllowedClientIds } from '@/lib/permissions';
import { calendarHref } from '@/lib/calendar-routes';
import { Building2, Search, CalendarDays, ListTodo, ChevronRight, X } from 'lucide-react';

/** /calendarios — listado de clientes con calendario. Cada cliente abre su propia URL. */
export default function CalendariosPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, loading } = useClients();
  const [search, setSearch] = useState('');

  const isClientUser = user?.role === 'client';
  const legacyClient = searchParams.get('client');

  // Links viejos (/calendarios?client=…&type=…&month=…&idea=…) → URL nueva de cada vista.
  // Un usuario cliente va directo a su calendario.
  useEffect(() => {
    if (legacyClient) {
      router.replace(calendarHref(legacyClient, {
        view: searchParams.get('type') === 'tareas' ? 'tareas' : 'redes',
        month: searchParams.get('month'),
        idea: searchParams.get('idea'),
      }));
    } else if (isClientUser && user?.client_id) {
      router.replace(calendarHref(user.client_id));
    }
  }, [legacyClient, isClientUser, user?.client_id, searchParams, router]);

  const calendarClients = useMemo(() => {
    const allowed = getAllowedClientIds(user);
    return clients
      .filter(c => (c.social_calendar_enabled || c.ads_calendar_enabled) && (allowed === null || allowed.includes(c.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, user]);
  const filtered = calendarClients.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (!hasModuleAccess(user, 'calendarios')) {
    return <NoAccess message="No tienes permiso para acceder al calendario." />;
  }
  if (loading || legacyClient || isClientUser) return <ContentSkeleton variant="cards" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Calendario de clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">Elegí un cliente para ver su calendario de redes o sus tareas. Cada vista tiene su propio link.</p>
        </div>
        <div className="relative min-w-0 md:w-80">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clientes…"
            className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
          {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-dashed border-border bg-card py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">{search ? 'Ningún cliente coincide con la búsqueda' : 'No hay clientes con calendario habilitado'}</p>
          {search && <button type="button" onClick={() => setSearch('')} className="text-xs text-primary hover:underline">Limpiar búsqueda</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(client => (
            <div key={client.id} className="group relative flex flex-col gap-4 rounded-[1.4rem] border border-border bg-card p-4 transition-shadow hover:shadow-[0_6px_24px_rgba(20,20,43,.08)]">
              <Link href={calendarHref(client.id)} className="flex items-center gap-3">
                <span className="absolute inset-0 rounded-[1.4rem]" aria-hidden="true" />
                <Avatar className="h-11 w-11 shrink-0 rounded-2xl">
                  {client.logo_url && <AvatarImage src={client.logo_url} alt={client.name} className="object-contain" />}
                  <AvatarFallback className="rounded-2xl bg-tint-blue text-base font-bold text-tint-blue-foreground">{client.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{client.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{client.industry || 'Calendario de publicaciones'}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
              <div className="relative flex flex-wrap gap-1.5">
                <Link href={calendarHref(client.id)}
                  className="tm-press inline-flex items-center gap-1.5 rounded-full bg-tint-blue px-3 py-1.5 text-xs font-semibold text-tint-blue-foreground hover:brightness-95">
                  <CalendarDays className="h-3.5 w-3.5" /> Calendario de redes
                </Link>
                <Link href={calendarHref(client.id, { view: 'tareas' })}
                  className="tm-press inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:bg-muted">
                  <ListTodo className="h-3.5 w-3.5" /> Tareas
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
