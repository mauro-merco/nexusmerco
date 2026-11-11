'use client';

import { useParams } from 'next/navigation';
import { CalendarClientView } from '@/components/calendar-client-view';

/** /calendarios/<cliente> — calendario de redes (el que se comparte con el cliente). */
export default function ClientSocialCalendarPage() {
  const { clientId } = useParams<{ clientId: string }>();
  return <CalendarClientView clientId={clientId} view="redes" />;
}
