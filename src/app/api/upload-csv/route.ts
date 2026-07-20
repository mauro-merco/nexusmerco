import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { parseCSV } from '@/lib/csv-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase no está configurado. Revisa las variables de entorno.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { client_id, week_start_date, date_from, date_to, source_type, csv_data_raw, created_by, filename } = body;

    const effective_from = date_from || week_start_date;
    const effective_to = date_to || week_start_date;

    if (!client_id || !effective_from) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: client_id, week_start_date (o date_from)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let parsed = null;
    let effectiveSource = source_type || 'unknown';
    if (csv_data_raw) {
      try {
        parsed = parseCSV(csv_data_raw);
        if (!source_type) effectiveSource = parsed?.source || 'unknown';
      } catch (e) {
        return NextResponse.json(
          { error: 'Error parseando CSV: ' + (e instanceof Error ? e.message : 'formato inválido') },
          { status: 400 }
        );
      }
    }

    const upsertData: Record<string, unknown> = {
      client_id,
      week_start_date: effective_from,
      status: 'completed',
    };

    if (created_by) upsertData.created_by = created_by;

    if (parsed) {
      const t = parsed.totals;
      if (effectiveSource.startsWith('google_ads')) {
        upsertData.google_ads_spend = t.cost;
        upsertData.google_ads_impressions = t.impressions;
        upsertData.google_ads_clicks = t.clicks;
        upsertData.google_ads_conversions = t.conversions;
        upsertData.google_ads_revenue = t.revenue;
      }
      if (effectiveSource.startsWith('meta_ads')) {
        upsertData.meta_ads_spend = t.cost;
        upsertData.meta_ads_impressions = t.impressions;
        upsertData.meta_ads_clicks = t.clicks;
        upsertData.meta_ads_conversions = t.conversions;
        upsertData.meta_ads_revenue = t.revenue;
      }
      if (effectiveSource === 'google_analytics') {
        upsertData.total_visits = t.clicks;
        upsertData.total_orders = t.conversions;
        upsertData.total_revenue = t.revenue;
      }
    }

    const { data: wiData, error: wiError } = await supabase
      .from('weekly_inputs')
      .upsert(upsertData, { onConflict: 'client_id, week_start_date' })
      .select()
      .single();

    if (wiError) {
      return NextResponse.json(
        { error: 'Error al guardar en weekly_inputs: ' + wiError.message },
        { status: 500 }
      );
    }

    // Track individual file upload with raw CSV content
    try {
      const gcMeta = parsed?.meta?.gc;
      await supabase.from('uploaded_files').insert({
        client_id,
        filename: filename || 'unknown.csv',
        source_type: effectiveSource,
        week_start_date: effectiveSource !== 'gc_management' ? effective_from : null,
        date_from: effectiveSource !== 'gc_management' ? effective_from : null,
        date_to: effectiveSource !== 'gc_management' ? effective_to : null,
        month: gcMeta?.month || null,
        row_count: parsed?.campaigns?.length || parsed?.meta?.traffic?.length || gcMeta?.daily?.length || 0,
        file_size: csv_data_raw?.length || 0,
        raw_content: csv_data_raw || '',
        summary: {
          spend: parsed?.totals?.cost || 0,
          impressions: parsed?.totals?.impressions || 0,
          clicks: parsed?.totals?.clicks || 0,
          conversions: parsed?.totals?.conversions || 0,
          revenue: parsed?.totals?.revenue || 0,
        },
        created_by: created_by || null,
      });
    } catch (ufe) {
      console.error('Error tracking uploaded file:', ufe);
    }

    if (parsed && parsed.campaigns.length > 0 && (effectiveSource.startsWith('google_ads') || effectiveSource.startsWith('meta_ads'))) {
      const campaignRows = parsed.campaigns.map((c) => ({
        weekly_input_id: wiData.id,
        client_id,
        week_start_date: effective_from,
        platform: effectiveSource.startsWith('google_ads') ? 'google_ads' : 'meta_ads',
        campaign_name: c.name,
        campaign_type: c.type,
        impressions: c.impressions,
        clicks: c.clicks,
        cost: c.cost,
        conversions: c.conversions,
        revenue: c.revenue,
        ctr: c.ctr / 100,
        cpc: c.cpc,
        roas: c.roas,
      }));

      const { error: cmError } = await supabase
        .from('campaign_metrics')
        .insert(campaignRows);

      if (cmError) {
        console.error('Error saving campaign_metrics:', cmError);
      }
    }

    if (parsed?.meta?.traffic && effectiveSource === 'google_analytics') {
      const trafficRows = parsed.meta.traffic.map((t) => ({
        client_id,
        week_start_date: effective_from,
        source: t.source,
        sessions: t.sessions,
        events: t.events,
        revenue: t.revenue,
      }));

      const { error: ga4Error } = await supabase
        .from('ga4_traffic')
        .insert(trafficRows);

      if (ga4Error) {
        console.error('Error saving ga4_traffic:', ga4Error);
      }
    }

    if (parsed?.meta?.gc) {
      const gc = parsed.meta.gc;
      const p = gc.projections;

      const { data: gcData, error: gcError } = await supabase
        .from('gc_metrics')
        .upsert({
          client_id,
          month: gc.month,
          proy_facturacion: p.facturacion,
          proy_fullbai_revenue: p.fullbaiRevenue,
          proy_visitas: p.visitas,
          proy_ordenes: p.ordenes,
          proy_cr: p.cr / 100,
          proy_ticket_promedio: p.ticketPromedio,
          proy_inversion_total: p.inversionTotal,
          proy_inv_google: p.invGoogle,
          proy_inv_meta: p.invMeta,
          proy_inv_tiktok: p.invTikTok,
          proy_relacion: p.relacion / 100,
          proy_cpa: p.cpa,
          proy_roas_tiendas: p.roasTiendas,
          proy_roas_fullbai: p.roasFullbai,
          proy_cpv: p.cpv,
        }, { onConflict: 'client_id, month' })
        .select()
        .single();

      if (gcError) {
        console.error('Error saving gc_metrics:', gcError);
      }

      if (gcData && gc.daily.length > 0) {
        const dailyRows = gc.daily.map((d) => ({
          gc_metrics_id: gcData.id,
          client_id,
          dia: parseInt(d.dia),
          facturacion: d.facturacion,
          visitas: d.visitas,
          ordenes: d.ordenes,
          cr: d.cr / 100,
          ticket_promedio: d.ticketPromedio,
          inversion: d.inversion,
          relacion: d.relacion / 100,
          cpa: d.cpa,
          roas: d.roas,
          cpv: d.cpv,
        }));

        const { error: gdError } = await supabase
          .from('gc_daily')
          .insert(dailyRows);

        if (gdError) {
          console.error('Error saving gc_daily:', gdError);
        }
      }
    }

    return NextResponse.json({ success: true, data: wiData });
  } catch (err) {
    console.error('Upload CSV API error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
