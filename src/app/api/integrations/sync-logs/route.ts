import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, safeError } from '@/lib/api-security';

const supabase = getAdminClient();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');
    if (!clientId) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });

    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!canAccessClient(user, clientId)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { data, error } = await supabase
      .from('integration_sync_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
