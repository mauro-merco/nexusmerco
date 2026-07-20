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

    let cQuery = supabase.from('meta_campaigns').select('*').eq('client_id', client_id);
    if (view === 'mensual') cQuery = cQuery.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') cQuery = cQuery.not('week_start', 'is', null);
    if (month) cQuery = cQuery.eq('month', month);
    const { data: campaigns, error: cErr } = await cQuery.order('spend', { ascending: false });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    let sQuery = supabase.from('meta_ad_sets').select('*').eq('client_id', client_id);
    if (view === 'mensual') sQuery = sQuery.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') sQuery = sQuery.not('week_start', 'is', null);
    if (month) sQuery = sQuery.eq('month', month);
    const { data: adSets, error: sErr } = await sQuery.order('spend', { ascending: false });
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    let aQuery = supabase.from('meta_ads').select('*').eq('client_id', client_id);
    if (view === 'mensual') aQuery = aQuery.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') aQuery = aQuery.not('week_start', 'is', null);
    if (month) aQuery = aQuery.eq('month', month);
    const { data: ads, error: aErr } = await aQuery.order('spend', { ascending: false }).limit(200);
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    return NextResponse.json({ data: { campaigns: campaigns || [], adSets: adSets || [], ads: ads || [] } });
  } catch (err) {
    console.error('meta-ads GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
