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
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    await ensureMigration();
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const month = url.searchParams.get('month');
    const userId = getCurrentUserId(request);

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    const supabase = getAdmin();

    // Look up client by share_token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, logo_url, share_token')
      .eq('share_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    // Fetch ideas for this client
    let query = supabase
      .from('social_ideas')
      .select('*')
      .eq('client_id', client.id)
      .order('publish_date', { ascending: true });

    if (month) {
      const [y, m] = month.split('-').map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
      query = query.gte('publish_date', `${month}-01`).lt('publish_date', nextMonth);
    }

    const { data: ideas, error: ideasError } = await query;
    if (ideasError) throw ideasError;

    // Fetch attachments for these ideas
    let attachments: Record<string, { url: string; name: string; type: string }[]> = {};
    if (ideas && ideas.length > 0) {
      const ideaIds = ideas.map((i) => i.id).join(',');
      const { data: atts } = await supabase
        .from('social_attachments')
        .select('*')
        .in('idea_id', ideas.map((i) => i.id));

      if (atts) {
        for (const att of atts) {
          if (!attachments[att.idea_id]) attachments[att.idea_id] = [];
          attachments[att.idea_id].push({
            url: att.url,
            name: att.name,
            type: att.type,
          });
        }
      }
    }

    // Fetch comments for all ideas in this client's calendar
    let comments: Record<string, any[]> = {};
    if (ideas && ideas.length > 0) {
      const { data: comms } = await supabase
        .from('social_comments')
        .select('*')
        .in('idea_id', ideas.map((i) => i.id))
        .order('created_at', { ascending: true });

      if (comms) {
        for (const comm of comms) {
          if (!comments[comm.idea_id]) comments[comm.idea_id] = [];
          comments[comm.idea_id].push(comm);
        }
      }
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        logo_url: client.logo_url,
      },
      ideas: ideas || [],
      attachments_by_idea: attachments,
      comments_by_idea: comments,
      is_authenticated: !!userId,
    });
  } catch (e) {
    console.error('GET /api/calendar-links/[token] error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
