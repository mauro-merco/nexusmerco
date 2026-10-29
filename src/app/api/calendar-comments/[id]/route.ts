import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/api-security';
import {
  getSupabaseAdmin,
  isCalendarType,
  resolveCalendarLink,
  resolveCalendarViewer,
} from '@/lib/calendar-access-server';

/**
 * Verifies the session and, for public requests, the target's share-link scope.
 */
async function resolveActor(request: Request, id: string): Promise<{ id: string; isAdmin: boolean } | null> {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const shareToken = searchParams.get('token') || '';

  if (shareToken) {
    const typeParam = searchParams.get('calendar_type') || 'social';
    const resolved = await resolveCalendarLink(
      supabase,
      shareToken,
      isCalendarType(typeParam) ? typeParam : 'social',
    );
    if ('error' in resolved) return null;
    if (resolved.type !== typeParam) return null;
    const viewer = await resolveCalendarViewer(request, supabase, resolved.link);
    if (!viewer) return null;
    const ideaScope = searchParams.get('scope') === 'idea';
    const table = ideaScope ? (resolved.type === 'ads' ? 'ads_comments' : 'social_comments') : 'calendar_comments';
    const { data: comment, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (error || !comment) return null;
    if (ideaScope) {
      const { data: idea, error: ideaError } = await supabase.from(resolved.type === 'ads' ? 'ads_ideas' : 'social_ideas')
        .select('client_id, publish_date').eq('id', comment.idea_id).maybeSingle();
      if (ideaError || !idea || idea.client_id !== resolved.client.id ||
        (resolved.month && !idea.publish_date?.startsWith(`${resolved.month}-`))) return null;
    } else if (comment.client_id !== resolved.client.id || comment.calendar_type !== resolved.type ||
      (resolved.month && comment.month !== resolved.month)) return null;
    return { id: viewer.id, isAdmin: false };
  }

  const user = await getRequestUser(request, supabase);
  if (!user) return null;
  const userId = user.id;

  const { data: me } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  return { id: userId, isAdmin: me?.role === 'admin' };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    
    if (!content) return NextResponse.json({ error: 'El comentario está vacío' }, { status: 400 });
    if (content.length > 5000) return NextResponse.json({ error: 'El comentario es demasiado largo' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') === 'idea' ? 'idea' : 'calendar';
    const typeParam = searchParams.get('calendar_type') || 'social';
    const calendarType = isCalendarType(typeParam) ? typeParam : 'social';
    const table =
      scope === 'idea'
        ? calendarType === 'ads'
          ? 'ads_comments'
          : 'social_comments'
        : 'calendar_comments';

    const actor = await resolveActor(request, id);
    if (!actor) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: comment } = await supabase
      .from(table)
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });

    // Only the author can edit
    if (comment.user_id !== actor.id) {
      return NextResponse.json({ error: 'Solo el autor puede editar' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from(table)
      .update({ content })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    // 'calendar' comments live in their own table; 'idea' comments live in the
    // table of the calendar the idea belongs to.
    const scope = searchParams.get('scope') === 'idea' ? 'idea' : 'calendar';
    const typeParam = searchParams.get('calendar_type') || 'social';
    const calendarType = isCalendarType(typeParam) ? typeParam : 'social';
    const table =
      scope === 'idea'
        ? calendarType === 'ads'
          ? 'ads_comments'
          : 'social_comments'
        : 'calendar_comments';

    const actor = await resolveActor(request, id);
    if (!actor) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: comment } = await supabase
      .from(table)
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });

    // Only the author or an admin can delete a comment.
    if (comment.user_id !== actor.id && !actor.isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
