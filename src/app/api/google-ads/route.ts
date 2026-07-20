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

    let query = supabase.from('ga_campaigns').select('*').eq('client_id', client_id);
    if (view === 'mensual') query = query.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') query = query.not('week_start', 'is', null);
    if (month) query = query.eq('month', month);
    const { data: campaigns, error: cErr } = await query.order('cost', { ascending: false });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    let kwQuery = supabase.from('ga_search_keywords').select('*').eq('client_id', client_id);
    if (view === 'mensual') kwQuery = kwQuery.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') kwQuery = kwQuery.not('week_start', 'is', null);
    if (month) kwQuery = kwQuery.eq('month', month);
    const { data: keywords, error: kErr } = await kwQuery.order('impressions', { ascending: false }).limit(500);
    if (kErr) return NextResponse.json({ error: kErr.message }, { status: 500 });

    let agQuery = supabase.from('ga_asset_groups').select('*').eq('client_id', client_id);
    if (view === 'mensual') agQuery = agQuery.is('week_start', null);
    if (view === 'semanal' || view === 'acumulado') agQuery = agQuery.not('week_start', 'is', null);
    if (month) agQuery = agQuery.eq('month', month);
    const { data: assetGroups, error: aErr } = await agQuery.order('cost', { ascending: false });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    return NextResponse.json({ data: { campaigns: campaigns || [], keywords: keywords || [], assetGroups: assetGroups || [] } });
  } catch (err) {
    console.error('google-ads GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
