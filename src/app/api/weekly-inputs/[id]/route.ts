import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: wi, error: fetchError } = await supabase
      .from('weekly_inputs')
      .select('client_id, week_start_date')
      .eq('id', id)
      .single();

    if (fetchError || !wi) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
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
