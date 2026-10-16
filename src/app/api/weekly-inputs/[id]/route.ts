import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { data: wi, error: fetchError } = await supabase
      .from('weekly_inputs')
      .select('client_id, week_start_date')
      .eq('id', id)
      .single();

    if (fetchError || !wi) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    if (!canAccessClient(user, wi.client_id)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }

    const { error: ga4Error } = await supabase
      .from('ga4_traffic')
      .delete()
      .eq('client_id', wi.client_id)
      .eq('week_start_date', wi.week_start_date);

    if (ga4Error) console.error('Error deleting ga4_traffic:', ga4Error);

    const { error: wiError } = await supabase
      .from('weekly_inputs')
      .delete()
      .eq('id', id);

    if (wiError) {
      return NextResponse.json({ error: wiError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
