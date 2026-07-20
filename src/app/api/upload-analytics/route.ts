import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseAnalytics } from '@/lib/parse-analytics';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { client_id, month, week_start, csv_data_raw } = body;

    if (!client_id || !csv_data_raw) {
      return NextResponse.json({ error: 'Faltan campos: client_id, csv_data_raw' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const parsed = parseAnalytics(csv_data_raw);
    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos de tráfico en el CSV' }, { status: 400 });
    }

    const effectiveMonth = month || (parsed.dateRange.start ? parsed.dateRange.start.slice(0, 7) : '');
    const ws = week_start || null;

    const rows = parsed.rows.map(r => ({ ...r, client_id, month: effectiveMonth, week_start: ws }));
    if (ws) {
      await supabase.from('analytics_traffic').delete().eq('client_id', client_id).eq('month', effectiveMonth).eq('week_start', ws);
    } else {
      await supabase.from('analytics_traffic').delete().eq('client_id', client_id).eq('month', effectiveMonth).is('week_start', null);
    }
    const { error } = await supabase.from('analytics_traffic').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (err) {
    console.error('upload-analytics error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
