import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function userId(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try { return String(decodeJwt(token).sub || ''); } catch { return null; }
}

async function canSync(id: string) {
  const { data } = await supabase.from('users').select('role').eq('id', id).single();
  return data?.role === 'admin' || data?.role === 'operador';
}

async function googleAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token',
    }),
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* handled below */ }
  if (!res.ok || !json) throw new Error(json?.error_description || json?.error || `Google OAuth ${res.status}: ${text.slice(0, 180)}`);
  return json.access_token as string;
}

async function searchGoogleAds(customerId: string, token: string, query: string) {
  const versions = [...new Set([process.env.GOOGLE_ADS_API_VERSION, 'v21', 'v20', 'v19', 'v18'].filter(Boolean))] as string[];
  let lastError = '';
  for (const apiVersion of versions) {
    const res = await fetch(`https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        'login-customer-id': (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/-/g, ''),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (res.ok && json) return (json || []).flatMap((chunk: any) => chunk.results || []);
    lastError = `${apiVersion} ${res.status}: ${text.slice(0, 220)}`;
    if (res.status !== 404) break;
  }
  throw new Error(`Google Ads API falló. ${lastError}`);
}

function metrics(row: any) {
  const cost = Number(row.metrics?.costMicros || 0) / 1_000_000;
  const clicks = Number(row.metrics?.clicks || 0);
  const impressions = Number(row.metrics?.impressions || 0);
  const conversions = Number(row.metrics?.conversions || 0);
  const convValue = Number(row.metrics?.conversionsValue || 0);
  return { cost, clicks, impressions, conversions, convValue, roas: cost > 0 ? convValue / cost : 0, cpc: clicks > 0 ? cost / clicks : 0, ctr: impressions > 0 ? clicks / impressions : 0 };
}

export async function POST(request: Request) {
  try {
    const uid = userId(request);
    if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await canSync(uid))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { client_id, start_date, end_date } = await request.json();
    if (!client_id) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('google_ads_customer_id')
      .eq('id', client_id)
      .single();
    if (clientError) throw clientError;
    if (!client?.google_ads_customer_id) return NextResponse.json({ error: 'Falta Google Ads Customer ID' }, { status: 400 });

    const customerId = String(client.google_ads_customer_id).replace(/-/g, '');
    const token = await googleAccessToken();
    const start = start_date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const end = end_date || new Date().toISOString().slice(0, 10);
    const query = `
      SELECT
        segments.month,
        campaign.name,
        campaign.advertising_channel_type,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `;

    const rows = await searchGoogleAds(customerId, token, query);
    const campaigns = rows.map((row: any) => {
      const m = metrics(row);
      return {
        client_id,
        month: String(row.segments?.month || '').slice(0, 7),
        week_start: null,
        campaign_name: row.campaign?.name || 'Sin nombre',
        campaign_type: row.campaign?.advertisingChannelType || '',
        campaign_status: row.campaign?.status || '',
        impressions: m.impressions,
        clicks: m.clicks,
        cost: m.cost,
        conversions: m.conversions,
        conv_value: m.convValue,
        roas: m.roas,
        cpc: m.cpc,
        ctr: m.ctr,
      };
    });

    const dailyRows = await searchGoogleAds(customerId, token, `
      SELECT segments.date, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `).catch(() => []);
    const daily = dailyRows.map((row: any) => { const m = metrics(row); return { client_id, date: row.segments?.date, campaign_name: row.campaign?.name || '', impressions: m.impressions, clicks: m.clicks, cost: m.cost, conversions: m.conversions, conv_value: m.convValue, roas: m.roas, cpc: m.cpc, ctr: m.ctr }; }).filter((r: any) => r.date);

    const keywordRows = await searchGoogleAds(customerId, token, `
      SELECT segments.month, campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
      FROM keyword_view
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `).catch(() => []);
    const keywords = keywordRows.map((row: any) => { const m = metrics(row); return { client_id, month: String(row.segments?.month || '').slice(0, 7), keyword: row.adGroupCriterion?.keyword?.text || '', match_type: row.adGroupCriterion?.keyword?.matchType || '', campaign_name: row.campaign?.name || '', ad_group_name: row.adGroup?.name || '', impressions: m.impressions, clicks: m.clicks, cost: m.cost, conversions: m.conversions, conv_value: m.convValue, cpc: m.cpc }; }).filter((r: any) => r.keyword);

    const deviceRows = await searchGoogleAds(customerId, token, `
      SELECT segments.month, segments.device, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, metrics.conversions_value
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
    `).catch(() => []);
    const segments = deviceRows.map((row: any) => { const m = metrics(row); return { client_id, month: String(row.segments?.month || '').slice(0, 7), segment_type: 'device', segment_value: row.segments?.device || '', campaign_name: row.campaign?.name || '', impressions: m.impressions, clicks: m.clicks, cost: m.cost, conversions: m.conversions, conv_value: m.convValue }; }).filter((r: any) => r.segment_value);

    const months = [...new Set(campaigns.map((c: any) => c.month).filter(Boolean))];
    for (const month of months) {
      await supabase.from('ga_campaigns').delete().eq('client_id', client_id).eq('month', month).is('week_start', null);
    }
    if (campaigns.length) {
      const { error } = await supabase.from('ga_campaigns').insert(campaigns);
      if (error) throw error;
    }
    if (daily.length) {
      await supabase.from('ga_daily_metrics').delete().eq('client_id', client_id).gte('date', start).lte('date', end);
      const { error } = await supabase.from('ga_daily_metrics').insert(daily);
      if (error) throw error;
    }
    if (keywords.length) {
      for (const month of months) await supabase.from('ga_search_keywords').delete().eq('client_id', client_id).eq('month', month).is('week_start', null);
      const { error } = await supabase.from('ga_search_keywords').insert(keywords);
      if (error) throw error;
    }
    if (segments.length) {
      for (const month of months) await supabase.from('ga_segments').delete().eq('client_id', client_id).eq('month', month).eq('segment_type', 'device');
      const { error } = await supabase.from('ga_segments').insert(segments);
      if (error) throw error;
    }
    await supabase.from('clients').update({ last_google_ads_sync_at: new Date().toISOString() }).eq('id', client_id);

    return NextResponse.json({ data: { inserted: campaigns.length, daily: daily.length, keywords: keywords.length, segments: segments.length, months } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error Google Ads sync' }, { status: 500 });
  }
}
