'use client';

import { useParams } from 'next/navigation';
import { CalendarClientView } from '@/components/calendar-client-view';

/** /calendarios/<cliente>/tareas — calendario interno de tareas (solo equipo). */
export default function ClientTasksCalendarPage() {
  const { clientId } = useParams<{ clientId: string }>();
  return <CalendarClientView clientId={clientId} view="tareas" />;
}
