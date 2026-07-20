import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { client_id, week_start_date, platform } = await request.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    if (!client_id || !week_start_date) {
      return NextResponse.json({ error: 'Faltan client_id y week_start_date' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (!platform || platform === 'all') {
      const { error: ufErr } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (ufErr) console.error('uploaded_files delete error:', ufErr);

      const { error: ga4Err } = await supabase
        .from('ga4_traffic')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (ga4Err) console.error('ga4 delete error:', ga4Err);

      const { error: cmErr } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (cmErr) console.error('cm delete error:', cmErr);

      const { error: wiErr } = await supabase
        .from('weekly_inputs')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (wiErr) return NextResponse.json({ error: wiErr.message }, { status: 500 });

      return NextResponse.json({ success: true, message: 'Semana eliminada completamente' });
    }

    if (platform === 'google_ads' || platform === 'meta_ads') {
      const { error: ufErr } = await supabase
        .from('uploaded_files')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date)
        .like('source_type', `${platform}%`);
      if (ufErr) console.error('uploaded_files delete error:', ufErr);
      const { error: cmErr } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date)
        .eq('platform', platform);
      if (cmErr) console.error('cm delete error:', cmErr);

      const prefix = platform === 'google_ads' ? 'google_ads_' : 'meta_ads_';
      const zeroFields: Record<string, number> = {};
      for (const field of ['spend', 'impressions', 'clicks', 'conversions', 'revenue']) {
        zeroFields[`${prefix}${field}`] = 0;
      }

      const { error: wiErr } = await supabase
        .from('weekly_inputs')
        .update(zeroFields)
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (wiErr) console.error('wi update error:', wiErr);

      return NextResponse.json({
        success: true,
        message: `Datos de ${platform === 'google_ads' ? 'Google Ads' : 'Meta Ads'} eliminados`
      });
    }

    if (platform === 'ga4') {
      const { error: ga4Err } = await supabase
        .from('ga4_traffic')
        .delete()
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (ga4Err) return NextResponse.json({ error: ga4Err.message }, { status: 500 });

      const { error: wiErr } = await supabase
        .from('weekly_inputs')
        .update({ total_visits: 0, total_orders: 0, total_revenue: 0 })
        .eq('client_id', client_id)
        .eq('week_start_date', week_start_date);
      if (wiErr) console.error('wi update error:', wiErr);

      return NextResponse.json({ success: true, message: 'Datos de GA4 eliminados' });
    }

    if (platform === 'gc') {
      const month = week_start_date ? week_start_date.slice(0, 7) : '';
      if (!month) return NextResponse.json({ error: 'Semana no válida' }, { status: 400 });

      const { data: gcRows, error: gcFindErr } = await supabase
        .from('gc_metrics')
        .select('id')
        .eq('client_id', client_id)
        .eq('month', month);
      if (gcFindErr) return NextResponse.json({ error: gcFindErr.message }, { status: 500 });

      const gcIds = gcRows?.map(r => r.id) || [];
      if (gcIds.length > 0) {
        const { error: gdErr } = await supabase
          .from('gc_daily')
          .delete()
          .in('gc_metrics_id', gcIds);
        if (gdErr) console.error('gc_daily delete error:', gdErr);

        const { error: gmErr } = await supabase
          .from('gc_metrics')
          .delete()
          .in('id', gcIds);
        if (gmErr) return NextResponse.json({ error: gmErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Datos de Gestión Comercial eliminados' });
    }

    return NextResponse.json({ error: 'Platform no válido' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
