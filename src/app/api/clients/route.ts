import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function ensureMigration() {
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

export async function GET(request: Request) {
  try {
    if (!migrationChecked) {
      migrationChecked = true;
      await ensureMigration();
    }

    // Check user role from JWT for client-scoped filtering
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    let userRole: string | undefined;
    let userClientId: string | undefined;

    if (token) {
      try {
        const payload = decodeJwt(token);
        userRole = (payload.user_metadata as Record<string, unknown>)?.role as string;
        // Also try to get client_id from app_metadata or user_metadata
        const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
        const userMeta = payload.user_metadata as Record<string, unknown> | undefined;
        userClientId = (appMeta?.client_id || userMeta?.client_id) as string;
      } catch {
        // ignore, fall through to all clients
      }
    }

    let query = supabase.from('clients').select('*');

    // If user is a client, only return their own client
    if (userRole === 'client') {
      if (userClientId) {
        query = query.eq('id', userClientId);
      } else {
        // If we can't determine the client_id from JWT, look it up
        try {
          const payload = decodeJwt(token);
          const userId = payload.sub;
          if (userId) {
            const { data: userData } = await supabase
              .from('users')
              .select('client_id')
              .eq('id', userId)
              .single();
            if (userData?.client_id) {
              query = query.eq('id', userData.client_id);
            } else {
              query = query.eq('id', '__none__');
            }
          }
        } catch {
          query = query.eq('id', '__none__');
        }
      }
    }

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
    const body = await request.json();
    const { name, logo_url, description, industry, campaign_types, plan, status, social_calendar_enabled, analysis_enabled } = body;

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
