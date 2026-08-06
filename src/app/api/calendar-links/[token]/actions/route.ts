import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let migrationChecked = false;

async function ensureMigration() {
  if (migrationChecked) return;
  migrationChecked = true;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query: `
          ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid();
          ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS guest_name TEXT;
          ALTER TABLE public.social_comments ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'comment';
        `,
      }),
    });
    if (!res.ok) {
      console.warn('Auto-migration: exec_sql not available, run 00030 manually');
    }
  } catch {
    // ignore
  }
}

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function getCurrentUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token || token === 'undefined') return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

async function resolveClient(token: string) {
  const supabase = getAdmin();
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('share_token', token)
    .single();
  return { client, error };
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    await ensureMigration();
    const { token } = await params;
    const userId = getCurrentUserId(request);
    const body = await request.json();
    const { idea_id, content, guest_name, action_type, status, publish_date } = body;

    const { client, error: clientError } = await resolveClient(token);
    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    const supabase = getAdmin();

    // Handle different action types
    if (action_type === 'status_change' && status) {
      const { error } = await supabase
        .from('social_ideas')
        .update({ status })
        .eq('id', idea_id)
        .eq('client_id', client.id);

      if (error) throw error;

      // Log the action as a comment
      if (content || guest_name) {
        await supabase.from('social_comments').insert({
          idea_id,
          user_id: userId || null,
          guest_name: guest_name || null,
          content: content || '',
          action_type: 'status_change',
        });
      }

      return NextResponse.json({ success: true });
    }

    if (action_type === 'date_move' && publish_date) {
      const { error } = await supabase
        .from('social_ideas')
        .update({ publish_date })
        .eq('id', idea_id)
        .eq('client_id', client.id);

      if (error) throw error;

      if (content || guest_name) {
        await supabase.from('social_comments').insert({
          idea_id,
          user_id: userId || null,
          guest_name: guest_name || null,
          content: content || '',
          action_type: 'date_move',
        });
      }

      return NextResponse.json({ success: true });
    }

    // Default: regular comment
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content requerido' }, { status: 400 });
    }

    const { error } = await supabase.from('social_comments').insert({
      idea_id,
      user_id: userId || null,
      guest_name: guest_name || null,
      content: content.trim(),
      action_type: action_type || 'comment',
    });

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e) {
    console.error('POST /api/calendar-links/[token] error:', e);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { action_type, new_status, new_date } = await request.json();

    const { client, error: clientError } = await resolveClient(token);
    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    const supabase = getAdmin();

    if (action_type === 'status_change' && new_status) {
      // This is handled via PATCH/PUT for bulk or single status updates
      // The POST route already handles status changes with comments
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (e) {
    console.error('PUT /api/calendar-links/[token] error:', e);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
