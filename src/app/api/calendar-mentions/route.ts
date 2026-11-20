import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser } from '@/lib/api-security';
import { calendarMentionUsers } from '@/lib/calendar-mention-users';

export async function GET(request: Request) {
  try {
    const db = getAdminClient();
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const query = new URL(request.url).searchParams;
    let clientId = query.get('client_id');
    let month = query.get('month') || undefined;
    if (query.get('idea_id')) {
      const { data, error } = await db.from('social_ideas').select('client_id, publish_date').eq('id', query.get('idea_id')).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Idea no encontrada' }, { status: 404 });
      clientId = data.client_id; month = data.publish_date?.slice(0, 7);
    }
    if (!clientId || !canAccessClient(user, clientId)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    return NextResponse.json({ data: await calendarMentionUsers(db, clientId, undefined, month) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Calendar mention users:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las cuentas cliente' }, { status: 500 });
  }
}
