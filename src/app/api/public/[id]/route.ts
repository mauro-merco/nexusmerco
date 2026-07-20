import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Verify client exists and public is enabled
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id, name, logo_url, description, public_description, industry, public_enabled, status')
      .eq('id', id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    if (!client.public_enabled || client.status !== 'active') {
      return NextResponse.json({ error: 'Reporte no disponible' }, { status: 403 });
    }

    // Helper: add month filter if provided
    const filterMonth = (q: any) => month ? q.eq('month', month) : q;

    // 2. Fetch Google Ads data
    let gaQuery = supabase.from('ga_campaigns').select('*').eq('client_id', id);
    const { data: gaCampaigns } = await filterMonth(gaQuery).order('cost', { ascending: false });

    let kwQuery = supabase.from('ga_search_keywords').select('*').eq('client_id', id);
    const { data: gaKeywords } = await filterMonth(kwQuery).order('cost', { ascending: false }).limit(10);

    let agQuery = supabase.from('ga_asset_groups').select('*').eq('client_id', id);
    const { data: gaAssetGroups } = await filterMonth(agQuery).order('cost', { ascending: false });

    // 3. Fetch Meta Ads data
    let mcQuery = supabase.from('meta_campaigns').select('*').eq('client_id', id);
    const { data: metaCampaigns } = await filterMonth(mcQuery).order('spend', { ascending: false });

    let masQuery = supabase.from('meta_ad_sets').select('*').eq('client_id', id);
    const { data: metaAdSets } = await filterMonth(masQuery).order('spend', { ascending: false }).limit(10);

    let maQuery = supabase.from('meta_ads').select('*').eq('client_id', id);
    const { data: metaAds } = await filterMonth(maQuery).order('spend', { ascending: false }).limit(10);

    // 4. Fetch Analytics data
    let anQuery = supabase.from('analytics_traffic').select('*').eq('client_id', id);
    const { data: analyticsRows } = await filterMonth(anQuery).order('sessions', { ascending: false });

    // 5. Compute Google Ads totals
    const gaTotals = ((gaCampaigns || []) as any[]).reduce((acc: { cost: number; impressions: number; clicks: number; conversions: number; convValue: number }, c) => ({
      cost: acc.cost + Number(c.cost || 0),
      impressions: acc.impressions + Number(c.impressions || 0),
      clicks: acc.clicks + Number(c.clicks || 0),
      conversions: acc.conversions + Number(c.conversions || 0),
      convValue: acc.convValue + Number(c.conv_value || 0),
    }), { cost: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 });

    // 6. Compute Meta Ads totals
    const metaTotals = ((metaCampaigns || []) as any[]).reduce((acc: { spend: number; impressions: number; reach: number; results: number }, c) => ({
      spend: acc.spend + Number(c.spend || 0),
      impressions: acc.impressions + Number(c.impressions || 0),
      reach: acc.reach + Number(c.reach || 0),
      results: acc.results + Number(c.results || 0),
    }), { spend: 0, impressions: 0, reach: 0, results: 0 });

    // 7. Compute Analytics totals
    const analyticsSummary = ((analyticsRows || []) as any[]).reduce((acc: { sessions: number; engagedSessions: number; totalRevenue: number; keyEvents: number }, r) => ({
      sessions: acc.sessions + Number(r.sessions || 0),
      engagedSessions: acc.engagedSessions + Number(r.engaged_sessions || 0),
      totalRevenue: acc.totalRevenue + Number(r.total_revenue || 0),
      keyEvents: acc.keyEvents + Number(r.key_events || 0),
    }), { sessions: 0, engagedSessions: 0, totalRevenue: 0, keyEvents: 0 });

    // 8. Channel mix from analytics
    const channelMix = ((analyticsRows || []) as any[]).reduce<Record<string, { sessions: number; revenue: number }>>((acc, r) => {
      const source = r.source_medium || 'unknown';
      if (!acc[source]) acc[source] = { sessions: 0, revenue: 0 };
      acc[source].sessions += Number(r.sessions || 0);
      acc[source].revenue += Number(r.total_revenue || 0);
      return acc;
    }, {});

    // 9. Always fetch all available months (separate queries without filter)
    const allMonths = new Set<string>();
    const { data: allGa } = await supabase.from('ga_campaigns').select('month').eq('client_id', id);
    (allGa || []).forEach(r => { if (r.month) allMonths.add(r.month); });
    const { data: allMeta } = await supabase.from('meta_campaigns').select('month').eq('client_id', id);
    (allMeta || []).forEach(r => { if (r.month) allMonths.add(r.month); });
    const { data: allAn } = await supabase.from('analytics_traffic').select('month').eq('client_id', id);
    (allAn || []).forEach(r => { if (r.month) allMonths.add(r.month); });

    return NextResponse.json({
      data: {
        client: {
          name: client.name,
          logo_url: client.logo_url,
          description: client.description,
          public_description: client.public_description,
          industry: client.industry,
        },
        summary: {
          gaTotals,
          metaTotals,
          analyticsSummary,
          channelMix: Object.entries(channelMix).map(([source, vals]) => ({
            source,
            sessions: vals.sessions,
            revenue: vals.revenue,
          })),
          months: Array.from(allMonths).sort(),
        },
        googleAds: {
          campaigns: gaCampaigns || [],
          keywords: gaKeywords || [],
          assetGroups: gaAssetGroups || [],
        },
        metaAds: {
          campaigns: metaCampaigns || [],
          adSets: metaAdSets || [],
          ads: metaAds || [],
        },
        analytics: {
          rows: analyticsRows || [],
        },
      },
    });
  } catch (err) {
    console.error('GET /api/public/[id] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
