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

export async function POST(request: Request) {
  try {
    const uid = userId(request);
    if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await canSync(uid))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const { client_id, start_date, end_date } = await request.json();
    if (!client_id) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });

    const { data: client, error } = await supabase.from('clients').select('meta_ad_account_id').eq('id', client_id).single();
    if (error) throw error;
    if (!client?.meta_ad_account_id) return NextResponse.json({ error: 'Falta Meta Ad Account ID' }, { status: 400 });

    const accountId = String(client.meta_ad_account_id).startsWith('act_') ? client.meta_ad_account_id : `act_${client.meta_ad_account_id}`;
    const start = start_date || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;
    const end = end_date || new Date().toISOString().slice(0, 10);
    const month = start.slice(0, 7);
    const params = new URLSearchParams({
      access_token: process.env.META_ACCESS_TOKEN || '',
      level: 'campaign',
      fields: 'campaign_name,spend,impressions,reach,actions,cost_per_action_type',
      time_range: JSON.stringify({ since: start, until: end }),
      limit: '500',
    });
    const res = await fetch(`https://graph.facebook.com/v21.0/${accountId}/insights?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Meta API error');

    const rows = (json.data || []).map((r: any) => {
      const results = Number((r.actions || []).find((a: any) => ['purchase', 'lead', 'omni_purchase', 'onsite_conversion.lead_grouped'].includes(a.action_type))?.value || 0);
      return {
        client_id,
        month,
        week_start: null,
        campaign_name: r.campaign_name || 'Sin nombre',
        delivery_status: '',
        budget_type: '',
        budget_amount: 0,
        spend: Number(r.spend || 0),
        impressions: Number(r.impressions || 0),
        reach: Number(r.reach || 0),
        results,
        cost_per_result: results > 0 ? Number(r.spend || 0) / results : 0,
      };
    });

    await supabase.from('meta_campaigns').delete().eq('client_id', client_id).eq('month', month).is('week_start', null);
    if (rows.length) {
      const { error: insertError } = await supabase.from('meta_campaigns').insert(rows);
      if (insertError) throw insertError;
    }
    await supabase.from('clients').update({ last_meta_ads_sync_at: new Date().toISOString() }).eq('id', client_id);
    return NextResponse.json({ data: { inserted: rows.length } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error Meta sync' }, { status: 500 });
  }
}
