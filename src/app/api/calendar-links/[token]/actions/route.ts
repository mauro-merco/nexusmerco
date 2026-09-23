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
  const { data: link } = await supabase
    .from('calendar_share_links')
    .select('client_id, enabled')
    .eq('token', token)
    .maybeSingle();

  if (link) {
    if (!link.enabled) return { client: null, error: new Error('Calendario no disponible') };
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', link.client_id)
      .single();
    return { client, error };
  }

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
    const { idea_id, content, guest_name, action_type, status, publish_date, calendar_type, title, description, post_type, links } = body;
    const ideasTable = calendar_type === 'ads' ? 'ads_ideas' : 'social_ideas';
    const commentsTable = calendar_type === 'ads' ? 'ads_comments' : 'social_comments';

    const { client, error: clientError } = await resolveClient(token);
    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    const supabase = getAdmin();

    if (action_type === 'create_idea') {
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) return NextResponse.json({ error: 'Título requerido' }, { status: 400 });
      const { data: idea, error } = await supabase
        .from(ideasTable)
        .insert({
          client_id: client.id,
          title: cleanTitle,
          description: String(description || '').trim(),
          brief: String(description || '').trim(),
          post_type: post_type || 'carrusel',
          publish_date: publish_date || new Date().toISOString().slice(0, 10),
          status: 'borrador',
          copy_text: Array.isArray(links) ? links.filter(Boolean).join('\n') : '',
          author_id: userId || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (content || guest_name) {
        await supabase.from(commentsTable).insert({
          idea_id: idea.id,
          user_id: userId || null,
          guest_name: guest_name || null,
          content: content || 'Idea creada por cliente',
          action_type: 'comment',
        });
      }

      return NextResponse.json({ data: idea }, { status: 201 });
    }

    // Handle different action types
    if (action_type === 'status_change' && status) {
      const { error } = await supabase
        .from(ideasTable)
        .update({ status })
        .eq('id', idea_id)
        .eq('client_id', client.id);

      if (error) throw error;

      // Log the action as a comment
      if (content || guest_name) {
        await supabase.from(commentsTable).insert({
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
        .from(ideasTable)
        .update({ publish_date })
        .eq('id', idea_id)
        .eq('client_id', client.id);

      if (error) throw error;

      if (content || guest_name) {
        await supabase.from(commentsTable).insert({
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

    const { error } = await supabase.from(commentsTable).insert({
      idea_id,
      user_id: userId || null,
      guest_name: guest_name || null,
      content: content.trim(),
      action_type: action_type || 'comment',
    });

    if (error) throw error;
    const { data: idea } = await supabase.from(ideasTable).select('id, title, author_id').eq('id', idea_id).single();
    const { data: assignees } = await supabase
      .from(calendar_type === 'ads' ? 'ads_idea_assignees' : 'social_idea_assignees')
      .select('user_id')
      .eq('idea_id', idea_id);
    const recipients = new Set<string>();
    if (idea?.author_id) recipients.add(idea.author_id);
    for (const assignee of assignees || []) if (assignee.user_id) recipients.add(assignee.user_id);
    if (userId) recipients.delete(userId);
    if (recipients.size > 0) {
      await supabase.from('notifications').insert([...recipients].map(recipientId => ({
        user_id: recipientId,
        type: 'calendar_comment',
        title: 'Nuevo comentario en calendario',
        message: `${guest_name || 'Alguien'} hizo un comentario en ${idea?.title || 'una idea'}`,
        link: `/calendarios`,
        read: false,
      })));
    }
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
