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

    const adsRes = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
        'login-customer-id': (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/-/g, ''),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const adsText = await adsRes.text();
    let adsJson: any = null;
    try { adsJson = adsText ? JSON.parse(adsText) : null; } catch { /* handled below */ }
    if (!adsRes.ok || !adsJson) {
      throw new Error(`Google Ads API ${adsRes.status}: ${adsText.slice(0, 500)}`);
    }

    const rows = (adsJson || []).flatMap((chunk: any) => chunk.results || []);
    const campaigns = rows.map((row: any) => {
      const cost = Number(row.metrics?.costMicros || 0) / 1_000_000;
      const clicks = Number(row.metrics?.clicks || 0);
      const impressions = Number(row.metrics?.impressions || 0);
      const conversions = Number(row.metrics?.conversions || 0);
      const convValue = Number(row.metrics?.conversionsValue || 0);
      return {
        client_id,
        month: String(row.segments?.month || '').slice(0, 7),
        week_start: null,
        campaign_name: row.campaign?.name || 'Sin nombre',
        campaign_type: row.campaign?.advertisingChannelType || '',
        campaign_status: row.campaign?.status || '',
        impressions,
        clicks,
        cost,
        conversions,
        conv_value: convValue,
        roas: cost > 0 ? convValue / cost : 0,
        cpc: clicks > 0 ? cost / clicks : 0,
        ctr: impressions > 0 ? clicks / impressions : 0,
      };
    });

    const months = [...new Set(campaigns.map((c: any) => c.month).filter(Boolean))];
    for (const month of months) {
      await supabase.from('ga_campaigns').delete().eq('client_id', client_id).eq('month', month).is('week_start', null);
    }
    if (campaigns.length) {
      const { error } = await supabase.from('ga_campaigns').insert(campaigns);
      if (error) throw error;
    }
    await supabase.from('clients').update({ last_google_ads_sync_at: new Date().toISOString() }).eq('id', client_id);

    return NextResponse.json({ data: { inserted: campaigns.length, months } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error Google Ads sync' }, { status: 500 });
  }
}
