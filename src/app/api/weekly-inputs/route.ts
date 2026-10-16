import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const weekStart = searchParams.get('week_start');

    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (clientId && !canAccessClient(user, clientId)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }

    let query = supabase.from('weekly_inputs').select('*').order('week_start_date', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    else if (Array.isArray(user.allowed_client_ids)) query = query.in('client_id', user.allowed_client_ids.length ? user.allowed_client_ids : ['__none__']);
    else if (!isStaff(user)) query = query.eq('client_id', user.client_id || '__none__');
    if (weekStart) query = query.eq('week_start_date', weekStart);
    if (!clientId && !weekStart) query = query.limit(50);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
