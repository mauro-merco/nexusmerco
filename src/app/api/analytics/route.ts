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

    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('analytics GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
