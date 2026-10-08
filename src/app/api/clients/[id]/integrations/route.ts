import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';

const supabase = getAdminClient();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!canAccessClient(user, id)) return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    const { data, error } = await supabase
      .from('clients')
      .select('id, google_ads_customer_id, meta_ad_account_id, ga4_property_id, last_google_ads_sync_at, last_meta_ads_sync_at, last_ga4_sync_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user) || !canAccessClient(user, id)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
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
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
