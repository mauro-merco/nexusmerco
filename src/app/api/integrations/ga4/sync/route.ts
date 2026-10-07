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
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'Google OAuth error');
  return json.access_token as string;
}

export async function POST(request: Request) {
  try {
    const uid = userId(request);
    if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await canSync(uid))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { client_id, start_date, end_date } = await request.json();
    if (!client_id) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });

    const { data: client, error } = await supabase.from('clients').select('ga4_property_id').eq('id', client_id).single();
    if (error) throw error;
    if (!client?.ga4_property_id) return NextResponse.json({ error: 'Falta GA4 Property ID' }, { status: 400 });

    const start = start_date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const end = end_date || new Date().toISOString().slice(0, 10);
    const token = await googleAccessToken();

    const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${client.ga4_property_id}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: start, endDate: end }],
        dimensions: [{ name: 'date' }, { name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }, { name: 'totalRevenue' }, { name: 'engagementRate' }],
        limit: 10000,
      }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!res.ok || !json) throw new Error(`GA4 ${res.status}: ${text.slice(0, 300)}`);

    const daily = (json.rows || []).map((r: any) => {
      const rawDate = r.dimensionValues?.[0]?.value || '';
      const date = rawDate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
      return {
        client_id,
        date,
        source_medium: r.dimensionValues?.[1]?.value || '',
        sessions: Number(r.metricValues?.[0]?.value || 0),
        total_users: Number(r.metricValues?.[1]?.value || 0),
        conversions: Number(r.metricValues?.[2]?.value || 0),
        total_revenue: Number(r.metricValues?.[3]?.value || 0),
        engagement_rate: Number(r.metricValues?.[4]?.value || 0),
      };
    }).filter((r: any) => r.date);

    await supabase.from('analytics_daily_metrics').delete().eq('client_id', client_id).gte('date', start).lte('date', end);
    if (daily.length) {
      const { error: insertError } = await supabase.from('analytics_daily_metrics').insert(daily);
      if (insertError) throw insertError;
    }
    await supabase.from('clients').update({ last_ga4_sync_at: new Date().toISOString() }).eq('id', client_id);

    return NextResponse.json({ data: { inserted: daily.length } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error GA4 sync' }, { status: 500 });
  }
}
