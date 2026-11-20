import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveCalendarLink, resolveCalendarViewer } from '@/lib/calendar-access-server';

async function handle(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const db = getSupabaseAdmin();
    const resolved = await resolveCalendarLink(db, (await params).token, 'social');
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    const viewer = await resolveCalendarViewer(request, db, resolved.link);
    if (!viewer) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (resolved.type === 'ads' ? !resolved.client.ads_calendar_enabled : !resolved.client.social_calendar_enabled) return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404 });
    const types = (['social', 'ads'] as const).filter(t => (!resolved.month || resolved.type === 'social' || resolved.type === t) && (t === 'social' ? resolved.client.social_calendar_enabled : resolved.client.ads_calendar_enabled));
    if (request.method === 'PUT') {
      const { id } = await request.json();
      if (typeof id !== 'string') return NextResponse.json({ error: 'Notificacion requerida' }, { status: 400 });
      let update = db.from('calendar_portal_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', viewer.id).eq('client_id', resolved.client.id).in('calendar_type', types);
      if (resolved.month) update = update.eq('month', resolved.month);
      const { error } = await update;
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }
    const months: Record<string, { month: string; social: number; ads: number; statuses: Record<string, number> }> = {};
    for (const type of new URL(request.url).searchParams.get('view') === 'feed' ? [] : types) {
      // Page explicitly: Supabase's default row limit must not truncate the index.
      for (let offset = 0; ; offset += 1000) {
        let query = db.from(type === 'ads' ? 'ads_ideas' : 'social_ideas').select('id, publish_date, status').eq('client_id', resolved.client.id).order('id').range(offset, offset + 999);
        if (resolved.month) query = query.gte('publish_date', `${resolved.month}-01`).lt('publish_date', new Date(Date.UTC(Number(resolved.month.slice(0, 4)), Number(resolved.month.slice(5, 7)), 1)).toISOString().slice(0, 10));
        const { data, error } = await query;
        if (error) throw error;
        for (const idea of data || []) {
          if (!idea.publish_date) continue;
          const month = idea.publish_date.slice(0, 7);
          const row = months[month] ||= { month, social: 0, ads: 0, statuses: {} };
          row[type]++;
          row.statuses[idea.status] = (row.statuses[idea.status] || 0) + 1;
        }
        if (!data || data.length < 1000) break;
      }
    }
    let notifications = db.from('calendar_portal_notifications').select('id, calendar_type, month, idea_id, kind, content, actor_name, read_at, created_at').eq('client_id', resolved.client.id).eq('user_id', viewer.id).in('calendar_type', types).order('created_at', { ascending: false }).limit(100);
    if (resolved.month) notifications = notifications.eq('month', resolved.month);
    const { data: feed, error } = await notifications;
    if (error) throw error;
    return NextResponse.json({ client: resolved.client, portal: !!resolved.link.portal, restricted_month: resolved.month, months: Object.values(months).sort((a, b) => b.month.localeCompare(a.month)), notifications: feed || [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Calendar portal:', error);
    return NextResponse.json({ error: 'No se pudo cargar el portal. Verifica la migracion 00084_client_calendar_portal.sql.' }, { status: 503 });
  }
}
export { handle as GET, handle as PUT };
