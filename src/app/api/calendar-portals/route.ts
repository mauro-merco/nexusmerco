import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function POST(request: Request) {
  try {
    const db = getAdminClient();
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    if (!isStaff(user) || typeof body.client_id !== 'string' || !canAccessClient(user, body.client_id)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const { data: existing, error: readError } = await db.from('calendar_client_portals').select('*').eq('client_id', body.client_id).maybeSingle();
    if (readError) throw readError;
    if (!body.configure) return NextResponse.json({ data: existing }, { headers: { 'Cache-Control': 'no-store' } });
    const ids = body.guest_enabled && Array.isArray(body.allowed_user_ids) ? [...new Set(body.allowed_user_ids)] : [];
    if (ids.length) {
      const { data: users, error } = await db.from('users').select('id').eq('app_id', 'nexus').eq('role', 'client').in('id', ids);
      if (error || users?.length !== ids.length) return NextResponse.json({ error: 'Invitados inválidos' }, { status: 400 });
    }
    const payload = { client_id: body.client_id, allowed_client_id: body.client_id, guest_enabled: !!body.guest_enabled, allowed_user_ids: ids, enabled: body.enabled !== false };
    const { data, error } = await db.from('calendar_client_portals').upsert(payload, { onConflict: 'client_id' }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Calendar portal configuration:', error);
    return NextResponse.json({ error: 'No se pudo abrir el portal. Requiere la migracion 00084_client_calendar_portal.sql.' }, { status: 503 });
  }
}
