import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, safeError } from '@/lib/api-security';

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
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!canAccessClient(user, client_id)) return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });

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

    let dailyQuery = supabase.from('ga_daily_metrics').select('*').eq('client_id', client_id);
    if (month) dailyQuery = dailyQuery.gte('date', `${month}-01`).lt('date', nextMonth(month));
    const { data: daily, error: dErr } = await dailyQuery.order('date', { ascending: true });
    if (dErr && dErr.code !== '42P01') return NextResponse.json({ error: dErr.message }, { status: 500 });

    let segmentQuery = supabase.from('ga_segments').select('*').eq('client_id', client_id);
    if (month) segmentQuery = segmentQuery.eq('month', month);
    const { data: segments, error: sErr } = await segmentQuery.order('cost', { ascending: false });
    if (sErr && sErr.code !== '42P01') return NextResponse.json({ error: sErr.message }, { status: 500 });

    return NextResponse.json({ data: { campaigns: campaigns || [], keywords: keywords || [], assetGroups: assetGroups || [], daily: daily || [], segments: segments || [] } });
  } catch (err) {
    console.error('google-ads GET error:', err);
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

function nextMonth(month: string) {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
