import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasCalendarAccess, isCalendarType, isValidMonth, resolveCalendarLink } from '@/lib/calendar-access-server';

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    const { token } = await params;
    const search = new URL(request.url).searchParams;
    const requestedType = search.get('type') || 'social';
    if (!isCalendarType(requestedType)) return NextResponse.json({ error: 'Tipo invalido' }, { status: 400, headers });
    const supabase = getSupabaseAdmin();
    const resolved = await resolveCalendarLink(supabase, token, requestedType);
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status, headers });
    const { client, link, type } = resolved;
    if (!await hasCalendarAccess(request, supabase, link)) return NextResponse.json({ error: 'Sesion no autorizada para este calendario' }, { status: 401, headers });
    if (type === 'ads' ? !client.ads_calendar_enabled : !client.social_calendar_enabled) return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404, headers });
    if (search.get('kind') === 'general') {
      const { data, error } = await supabase.from('calendar_general_folders').select('id, title, folder_url').eq('client_id', client.id).order('created_at', { ascending: false });
      if (error) throw error;
      return NextResponse.json({ data: data || [] }, { headers });
    }
    const month = resolved.month || search.get('month');
    if (!month || !isValidMonth(month) || Number(month.slice(5)) < 1 || Number(month.slice(5)) > 12) return NextResponse.json({ error: 'Mes invalido' }, { status: 400, headers });
    // Unified social calendars use the social month folder, like the internal view.
    const { data, error } = await supabase.from('calendar_month_folders').select('title, folder_url').eq('client_id', client.id).eq('calendar_type', type).eq('month', month).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    console.error('GET shared calendar folders:', error);
    return NextResponse.json({ error: 'No se pudieron cargar las carpetas' }, { status: 500, headers });
  }
}
