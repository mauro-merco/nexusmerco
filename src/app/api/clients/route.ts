import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function ensureMigration(supabase: ReturnType<typeof getAdmin>) {
  try {
    const { error } = await supabase
      .from('clients')
      .select('social_calendar_enabled')
      .limit(1);
    if (error && error.code === '42703') {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: 'ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS social_calendar_enabled BOOLEAN DEFAULT FALSE; ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS analysis_enabled BOOLEAN DEFAULT TRUE;',
        }),
      });
      if (!res.ok) {
        console.warn('Auto-migration: exec_sql not available, run 00014 manually');
      }
    }
  } catch {
    // ignore
  }
}

let migrationChecked = false;

export async function GET() {
  try {
    const supabase = getAdmin();

    if (!migrationChecked) {
      migrationChecked = true;
      await ensureMigration(supabase);
    }

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
    const { name, logo_url, description, industry, campaign_types, plan, status, social_calendar_enabled, analysis_enabled } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 });
    }

    const supabase = getAdmin();
    const insertData: Record<string, unknown> = {
      name: name.trim(),
      logo_url: logo_url || '',
      description: description || '',
      industry: industry || '',
      plan: plan || 'basic',
      status: status || 'active',
    };
    if (campaign_types !== undefined) insertData.campaign_types = campaign_types;
    if (social_calendar_enabled !== undefined) insertData.social_calendar_enabled = social_calendar_enabled;
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
