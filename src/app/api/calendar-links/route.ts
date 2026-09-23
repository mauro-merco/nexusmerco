import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function getLegacyClientToken(supabase: ReturnType<typeof getAdmin>, clientId: string, calendarType: string, month: string) {
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('share_token')
    .eq('id', clientId)
    .single();

  if (clientError) throw clientError;
  const token = client?.share_token || crypto.randomUUID();

  if (!client?.share_token) {
    const { error: updateError } = await supabase
      .from('clients')
      .update({ share_token: token })
      .eq('id', clientId);
    if (updateError) throw updateError;
  }

  return {
    token,
    client_id: clientId,
    calendar_type: calendarType,
    month,
    allowed_client_id: clientId,
    guest_enabled: true,
    allowed_user_ids: [],
    enabled: true,
    legacy: true,
  };
}

export async function POST(request: Request) {
  try {
    const { client_id, calendar_type = 'social', month, allowed_client_id, guest_enabled, allowed_user_ids } = await request.json();
    if (!client_id || !month || !['social', 'ads'].includes(calendar_type)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
    }

    const supabase = getAdmin();
    const payload: Record<string, unknown> = {
      client_id,
      calendar_type,
      month,
      allowed_client_id: allowed_client_id || client_id,
      enabled: true,
    };
    if (guest_enabled !== undefined) payload.guest_enabled = !!guest_enabled;
    if (Array.isArray(allowed_user_ids)) payload.allowed_user_ids = allowed_user_ids;

    const { data, error } = await supabase
      .from('calendar_share_links')
      .upsert(payload, { onConflict: 'client_id,calendar_type,month' })
      .select('token, client_id, calendar_type, month, allowed_client_id, guest_enabled, allowed_user_ids, enabled')
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === '42703' || error.message?.includes('calendar_share_links')) {
        const legacy = await getLegacyClientToken(supabase, client_id, calendar_type, month);
        return NextResponse.json({ data: legacy });
      }
      throw error;
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('POST /api/calendar-links error:', err);
    return NextResponse.json({ error: 'Error al generar link' }, { status: 500 });
  }
}
