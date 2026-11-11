'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContentSkeleton } from '@/components/content-skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UnifiedCalendar } from '@/components/unified-calendar';
import { TasksCalendar } from '@/components/tasks-calendar';
import { NoAccess } from '@/components/no-access';
import { useAuthStore } from '@/store/auth-store';
import { useClients } from '@/lib/hooks/use-clients';
import { hasModuleAccess, getAllowedClientIds } from '@/lib/permissions';
import { calendarHref, replaceUrlQuery, type CalendarView } from '@/lib/calendar-routes';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarDays, ListTodo, Lock, Share2 } from 'lucide-react';

/**
 * Vista de calendario de un cliente con URL propia:
 *  /calendarios/<cliente>         → calendario de redes (se comparte con el cliente)
 *  /calendarios/<cliente>/tareas  → tareas (interno, solo equipo)
 * El mes, la vista (mes/agenda) y la idea abierta quedan en la URL.
 */
export function CalendarClientView({ clientId, view }: { clientId: string; view: CalendarView }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clients, loading } = useClients();

  const isClientUser = user?.role === 'client';
  const month = searchParams.get('month');
  const idea = searchParams.get('idea');
  const vista = searchParams.get('vista') === 'agenda' ? 'agenda' : 'month';

  // Las tareas son internas: un usuario cliente siempre cae en el calendario de redes.
  useEffect(() => {
    if (isClientUser && view === 'tareas') router.replace(calendarHref(clientId, { month }));
  }, [isClientUser, view, clientId, month, router]);

  if (!hasModuleAccess(user, 'calendarios')) {
    return <NoAccess message="No tienes permiso para acceder al calendario." />;
  }
  if (loading) return <ContentSkeleton variant="calendar" />;

  const allowed = getAllowedClientIds(user);
  const canSee = isClientUser ? user?.client_id === clientId : allowed === null || allowed.includes(clientId);
  const client = clients.find(c => c.id === clientId);

  if (!canSee || !client) {
    return <NoAccess message={!client ? 'No encontramos este cliente o no tenés acceso a su calendario.' : 'No tenés acceso al calendario de este cliente.'} />;
  }
  if (!client.social_calendar_enabled && !client.ads_calendar_enabled) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-dashed border-border bg-card py-20 text-center text-muted-foreground">
        <CalendarDays className="h-10 w-10 opacity-40" />
        <p className="text-sm font-medium text-foreground">Calendario no disponible</p>
        <p className="text-sm">El calendario no está habilitado para este cliente.</p>
      </div>
    );
  }

  const tabs: { key: CalendarView; label: string; hint: string; icon: typeof CalendarDays; hintIcon: typeof Share2 }[] = [
    { key: 'redes', label: 'Calendario de redes', hint: 'Se comparte con el cliente', icon: CalendarDays, hintIcon: Share2 },
    ...(!isClientUser ? [{ key: 'tareas' as const, label: 'Tareas', hint: 'Interno · solo equipo', icon: ListTodo, hintIcon: Lock }] : []),
  ];

  return (
    <div className="w-full min-w-0 space-y-6 py-6 md:py-10">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {!isClientUser && (
            <Link href="/calendarios" title="Volver a clientes"
              className="tm-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          )}
          <Avatar className="h-11 w-11 shrink-0 rounded-2xl">
            {client.logo_url && <AvatarImage src={client.logo_url} alt={client.name} className="object-contain" />}
            <AvatarFallback className="rounded-2xl bg-tint-blue text-base font-bold text-tint-blue-foreground">{client.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-medium tracking-tight md:text-4xl">{client.name}</h1>
            <p className="text-sm text-muted-foreground">{view === 'tareas' ? 'Tareas del cliente en el calendario · uso interno' : 'Calendario de publicaciones en redes'}</p>
          </div>
        </div>

        {tabs.length > 1 && (
          <nav className="no-scrollbar flex w-full gap-1 overflow-x-auto rounded-full border border-border bg-card p-1 md:w-auto">
            {tabs.map(t => {
              const on = view === t.key;
              const Icon = t.icon; const HintIcon = t.hintIcon;
              return (
                <Link key={t.key} href={calendarHref(clientId, { view: t.key, month })} scroll={false}
                  className={cn('flex shrink-0 flex-1 items-center gap-2 rounded-full px-4 py-1.5 transition-colors md:flex-none',
                    on ? 'bg-foreground text-background' : 'text-foreground/75 hover:bg-muted hover:text-foreground')}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex flex-col leading-tight">
                    <span className="whitespace-nowrap text-[13px] font-semibold">{t.label}</span>
                    <span className={cn('flex items-center gap-1 whitespace-nowrap text-[10.5px]', on ? 'text-background/80' : 'text-muted-foreground')}><HintIcon className="h-2.5 w-2.5" />{t.hint}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {view === 'tareas' ? (
        <TasksCalendar key={`tasks-${clientId}`} clientId={clientId} clientName={client.name} initialMonth={month}
          onMonthChange={m => replaceUrlQuery({ month: m })} />
      ) : (
        <UnifiedCalendar key={`cal-${clientId}`} clientId={clientId} clientName={client.name}
          initialMonth={month} initialIdeaId={idea} initialView={vista}
          onMonthChange={m => replaceUrlQuery({ month: m })}
          onViewChange={v => replaceUrlQuery({ vista: v === 'agenda' ? 'agenda' : null })}
          onIdeaChange={id => replaceUrlQuery({ idea: id })} />
      )}
    </div>
  );
}
