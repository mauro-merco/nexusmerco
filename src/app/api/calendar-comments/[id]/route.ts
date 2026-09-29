import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import {
  getSupabaseAdmin,
  isCalendarType,
  resolveCalendarLink,
  resolveCalendarViewer,
} from '@/lib/calendar-access-server';

/**
 * Resolves the acting user for a delete request. Public visitors may use a
 * share token (session or guest email) so a guest can remove their own comment;
 * internal users authenticate with their Supabase session.
 */
async function resolveActor(request: Request): Promise<{ id: string; isAdmin: boolean } | null> {
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
    const viewer = await resolveCalendarViewer(request, supabase, resolved.link);
    if (!viewer) return null;
    return { id: viewer.id, isAdmin: viewer.isStaff };
  }

  const authHeader = request.headers.get('authorization') || '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt || jwt === 'undefined') return null;

  let userId = '';
  try {
    const payload = decodeJwt(jwt);
    userId = String(payload.sub || '');
  } catch {
    return null;
  }
  if (!userId) return null;

  const { data: me } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
  return { id: userId, isAdmin: me?.role === 'admin' };
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const actor = await resolveActor(request);
    if (!actor) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { data: comment } = await supabase
      .from('calendar_comments')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!comment) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });

    // Only the author or an admin can delete a comment.
    if (comment.user_id !== actor.id && !actor.isAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await supabase.from('calendar_comments').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ data: { id } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
