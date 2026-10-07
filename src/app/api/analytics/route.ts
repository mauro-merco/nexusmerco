import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const client_id = searchParams.get('client_id');
    const month = searchParams.get('month');
    const view = searchParams.get('view');

    if (!client_id) {
      return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase.from('analytics_traffic').select('*').eq('client_id', client_id);
    if (month) query = query.eq('month', month);
    if (view === 'mensual') query = query.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') query = query.not('week_start', 'is', null);
    const { data, error } = await query.order('sessions', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let dailyQuery = supabase.from('analytics_daily_metrics').select('*').eq('client_id', client_id);
    if (month) dailyQuery = dailyQuery.gte('date', `${month}-01`).lt('date', nextMonth(month));
    const { data: daily, error: dailyError } = await dailyQuery.order('date', { ascending: true });
    if (dailyError && dailyError.code !== '42P01') return NextResponse.json({ error: dailyError.message }, { status: 500 });

    return NextResponse.json({ data: data || [], daily: daily || [] });
  } catch (err) {
    console.error('analytics GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
