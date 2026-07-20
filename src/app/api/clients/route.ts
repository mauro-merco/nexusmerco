import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET() {
  try {
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET /api/clients error:', err);
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, logo_url, description, industry, campaign_types, plan, status } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        logo_url: logo_url || '',
        description: description || '',
        industry: industry || '',
        campaign_types: campaign_types || [],
        plan: plan || 'basic',
        status: status || 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    console.error('POST /api/clients error:', err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
