import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, isStaff } from '@/lib/api-security';
import { logActivity } from '@/lib/activity-events';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

async function resolveClient(token: string) {
  const supabase = getAdmin();
  const { data: link } = await supabase
    .from('calendar_share_links')
    .select('client_id, allowed_client_id, calendar_type, month, allowed_user_ids, enabled')
    .eq('token', token)
    .maybeSingle();

  if (link) {
    if (!link.enabled) return { client: null, error: new Error('Calendario no disponible') };
    const { data: client, error } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', link.client_id)
      .single();
    return { client, link, error };
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name')
    .eq('share_token', token)
    .single();
  return { client, link: null, error };
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { idea_id, content, guest_name, action_type, status, publish_date, calendar_type, title, description, post_type, links } = body;
    const ideasTable = calendar_type === 'ads' ? 'ads_ideas' : 'social_ideas';
    const commentsTable = calendar_type === 'ads' ? 'ads_comments' : 'social_comments';
    const area = calendar_type === 'ads' ? 'ads' : 'social';
    const entityType = calendar_type === 'ads' ? 'ads_idea' : 'social_idea';

    const { client, link, error: clientError } = await resolveClient(token);
    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    const supabase = getAdmin();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const explicitlyAllowed = Array.isArray(link?.allowed_user_ids) && link.allowed_user_ids.includes(user.id);
    if (!isStaff(user) && !canAccessClient(user, client.id) && !explicitlyAllowed) {
      return NextResponse.json({ error: 'Sin acceso a este calendario' }, { status: 403 });
    }
    const userId = user.id;
    if (link?.calendar_type && calendar_type !== link.calendar_type) {
      return NextResponse.json({ error: 'Tipo de calendario inválido' }, { status: 400 });
    }
    if (link?.month && publish_date && !String(publish_date).startsWith(`${link.month}-`)) {
      return NextResponse.json({ error: 'La fecha está fuera del mes compartido' }, { status: 400 });
    }

    let targetIdea: { id: string; status: string | null; title: string | null; publish_date: string | null } | null = null;
    if (action_type !== 'create_idea') {
      const { data } = await supabase.from(ideasTable).select('id, status, title, publish_date').eq('id', idea_id).eq('client_id', client.id).maybeSingle();
      if (!data) return NextResponse.json({ error: 'Idea no encontrada' }, { status: 404 });
      if (link?.month && !data.publish_date?.startsWith(`${link.month}-`)) {
        return NextResponse.json({ error: 'Idea fuera del mes compartido' }, { status: 403 });
      }
      targetIdea = data;
    }

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
          post_type: post_type || 'sugerencia',
          publish_date: publish_date || new Date().toISOString().slice(0, 10),
          status: 'borrador',
          copy_text: Array.isArray(links) ? links.filter(Boolean).join('\n') : '',
          author_id: userId,
        })
        .select()
        .single();
      if (error) throw error;

      if (content || guest_name) {
        await supabase.from(commentsTable).insert({
          idea_id: idea.id,
          user_id: userId,
          guest_name: guest_name || null,
          content: content || 'Idea creada por cliente',
          action_type: 'comment',
        });
      }

      await logActivity(supabase, { clientId: client.id, area, entityType, entityId: idea.id, entityTitle: cleanTitle, action: 'created', detail: guest_name || '', actorId: userId });

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
          user_id: userId,
          guest_name: guest_name || null,
          content: content || '',
          action_type: 'status_change',
        });
      }

      await logActivity(supabase, { clientId: client.id, area, entityType, entityId: idea_id, entityTitle: targetIdea?.title || '', action: 'status_changed', detail: 'Cambió el estado', fromValue: targetIdea?.status || '', toValue: status, actorId: userId });

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
          user_id: userId,
          guest_name: guest_name || null,
          content: content || '',
          action_type: 'date_move',
        });
      }

      await logActivity(supabase, { clientId: client.id, area, entityType, entityId: idea_id, entityTitle: targetIdea?.title || '', action: 'updated', detail: 'Movió la fecha', fromValue: targetIdea?.publish_date || '', toValue: publish_date, actorId: userId });

      return NextResponse.json({ success: true });
    }

    // Default: regular comment
    if (typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content requerido' }, { status: 400 });
    }
    if (typeof content !== 'string' || content.trim().length > 5000) {
      return NextResponse.json({ error: 'Comentario demasiado largo' }, { status: 400 });
    }

    const { error } = await supabase.from(commentsTable).insert({
      idea_id,
      user_id: userId,
      guest_name: guest_name || null,
      content: content.trim(),
      action_type: action_type || 'comment',
    });

    if (error) throw error;
    await logActivity(supabase, { clientId: client.id, area, entityType, entityId: idea_id, entityTitle: targetIdea?.title || '', action: 'commented', detail: content.trim(), actorId: userId });
    const { data: idea } = await supabase.from(ideasTable).select('id, title, author_id, publish_date').eq('id', idea_id).single();
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
        link: `/calendarios?client=${client.id}&type=${calendar_type === 'ads' ? 'ads' : 'redes'}&month=${String((idea as { publish_date?: string } | null)?.publish_date || '').slice(0, 7)}&idea=${idea_id}`,
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

    const { client, link, error: clientError } = await resolveClient(token);
    if (clientError || !client) {
      return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });
    }

    const supabase = getAdmin();
    const user = await getRequestUser(request, supabase);
    const explicitlyAllowed = !!user && Array.isArray(link?.allowed_user_ids) && link.allowed_user_ids.includes(user.id);
    if (!user || (!isStaff(user) && !canAccessClient(user, client.id) && !explicitlyAllowed)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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
