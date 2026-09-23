import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { client_id, calendar_type = 'social', month, allowed_client_id } = await request.json();
    if (!client_id || !month || !['social', 'ads'].includes(calendar_type)) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Mes inválido' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('calendar_share_links')
      .upsert({
        client_id,
        calendar_type,
        month,
        allowed_client_id: allowed_client_id || client_id,
        enabled: true,
      }, { onConflict: 'client_id,calendar_type,month' })
      .select('token, client_id, calendar_type, month, allowed_client_id, enabled')
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('POST /api/calendar-links error:', err);
    return NextResponse.json({ error: 'Error al generar link' }, { status: 500 });
  }
}
