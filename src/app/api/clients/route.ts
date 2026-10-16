import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser, isStaff } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    let query = supabase.from('clients').select('*');
    if (Array.isArray(user.allowed_client_ids)) query = query.in('id', user.allowed_client_ids.length ? user.allowed_client_ids : ['__none__']);
    else if (!isStaff(user)) query = user.client_id ? query.eq('id', user.client_id) : query.eq('id', '__none__');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET /api/clients error:', err);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
    const body = await request.json();
    const { name, logo_url, description, industry, campaign_types, plan, status, social_calendar_enabled, ads_calendar_enabled, analysis_enabled } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      name: name.trim(),
      logo_url: logo_url || '',
      description: description || '',
      industry: industry || '',
      plan: plan || 'basic',
      status: status || 'active',
      share_token: crypto.randomUUID(),
    };
    if (campaign_types !== undefined) insertData.campaign_types = campaign_types;
    if (social_calendar_enabled !== undefined) insertData.social_calendar_enabled = social_calendar_enabled;
    if (ads_calendar_enabled !== undefined) insertData.ads_calendar_enabled = ads_calendar_enabled;
    if (analysis_enabled !== undefined) insertData.analysis_enabled = analysis_enabled;

    const { data, error } = await supabase
      .from('clients')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('POST /api/clients error:', err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
