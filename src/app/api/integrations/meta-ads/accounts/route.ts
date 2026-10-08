import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';

const supabase = getAdminClient();

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const businessId = process.env.META_BUSINESS_ID;
    const token = process.env.META_ACCESS_TOKEN;
    if (!businessId || !token) return NextResponse.json({ error: 'Faltan META_BUSINESS_ID o META_ACCESS_TOKEN' }, { status: 500 });

    const fields = 'id,name,account_id,account_status,currency,timezone_name';
    const url = `https://graph.facebook.com/v21.0/${businessId}/owned_ad_accounts?fields=${fields}&limit=200&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Meta API error');

    return NextResponse.json({ data: json.data || [] });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
