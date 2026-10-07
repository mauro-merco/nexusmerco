import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function getUserId(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try { return String(decodeJwt(token).sub || ''); } catch { return null; }
}

async function canManage(userId: string) {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role === 'admin' || data?.role === 'operador';
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const { data, error } = await supabase
      .from('clients')
      .select('id, google_ads_customer_id, meta_ad_account_id, ga4_property_id, last_google_ads_sync_at, last_meta_ads_sync_at, last_ga4_sync_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await canManage(userId))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const { id } = await params;
    const body = await request.json();
    const payload = {
      google_ads_customer_id: body.google_ads_customer_id?.trim() || null,
      meta_ad_account_id: body.meta_ad_account_id?.trim() || null,
      ga4_property_id: body.ga4_property_id?.trim() || null,
    };
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select('id, google_ads_customer_id, meta_ad_account_id, ga4_property_id, last_google_ads_sync_at, last_meta_ads_sync_at, last_ga4_sync_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
