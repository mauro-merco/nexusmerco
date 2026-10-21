import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { client_id, calendar_type = 'social', month, allowed_client_id, guest_enabled, allowed_user_ids } = await request.json();
    if (!client_id || !month || !['social', 'ads'].includes(calendar_type)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
    }
    if (!isStaff(user) || !canAccessClient(user, client_id)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }
    if (allowed_client_id && !canAccessClient(user, allowed_client_id)) {
      return NextResponse.json({ error: 'Sin permisos para el cliente permitido' }, { status: 403 });
    }

    const hasConfigUpdate = guest_enabled !== undefined || Array.isArray(allowed_user_ids) || allowed_client_id !== undefined;

    const { data: existing, error: existingError } = await supabase
      .from('calendar_share_links')
      .select('token, client_id, calendar_type, month, allowed_client_id, guest_enabled, allowed_user_ids, enabled')
      .eq('client_id', client_id)
      .eq('calendar_type', calendar_type)
      .eq('month', month)
      .maybeSingle();

    if (existingError && !(existingError.code === '42P01' || existingError.message?.includes('calendar_share_links'))) {
      throw existingError;
    }
    if (existingError && hasConfigUpdate) {
      return NextResponse.json({
        error: 'No se pudo guardar la configuración de invitados. Revisá que la tabla calendar_share_links exista en Supabase y que el schema cache esté actualizado.',
        details: `Detalle Supabase: ${existingError.code || 'sin_codigo'}: ${existingError.message}`,
      }, { status: 500 });
    }
    if (existing && !hasConfigUpdate) return NextResponse.json({ data: existing });

    const payload: Record<string, unknown> = {
      client_id,
      calendar_type,
      month,
      allowed_client_id: allowed_client_id || existing?.allowed_client_id || client_id,
      enabled: true,
      guest_enabled: guest_enabled !== undefined ? !!guest_enabled : (existing?.guest_enabled ?? true), // Default true
    };
    if (Array.isArray(allowed_user_ids)) payload.allowed_user_ids = allowed_user_ids;

    const { data, error } = await supabase
      .from('calendar_share_links')
      .upsert(payload, { onConflict: 'client_id,calendar_type,month' })
      .select('token, client_id, calendar_type, month, allowed_client_id, guest_enabled, allowed_user_ids, enabled')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('POST /api/calendar-links error:', err);
    return NextResponse.json({ error: 'Error al generar link' }, { status: 500 });
  }
}
