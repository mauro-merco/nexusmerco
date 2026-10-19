import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';
import type { ActivityActor, ActivityArea, ActivityEvent } from '@/lib/activity-config';

const supabase = getAdminClient();

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const clientId = params.get('client_id');
    const actorId = params.get('user_id');
    const areas = (params.get('area') || '')
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean) as ActivityArea[];
    const from = params.get('from');
    const to = params.get('to');
    const limit = Math.min(Math.max(Number(params.get('limit')) || 200, 1), 1000);
    const offset = Math.max(Number(params.get('offset')) || 0, 0);

    if (clientId && !canAccessClient(user, clientId)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    if (actorId && actorId !== user.id && !isStaff(user)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }
    if (!clientId && !actorId && !isStaff(user)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    let query = supabase
      .from('activity_events')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (clientId) query = query.eq('client_id', clientId);
    if (actorId) query = query.eq('actor_id', actorId);
    if (areas.length > 0) query = query.in('area', areas);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) throw error;

    const events = (data || []) as ActivityEvent[];
    const actorIds = [...new Set(events.map((e) => e.actor_id).filter(Boolean))] as string[];
    const clientIds = [...new Set(events.map((e) => e.client_id).filter(Boolean))] as string[];

    const actors = new Map<string, ActivityActor>();
    if (actorIds.length > 0) {
      const { data: rows } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, email')
        .in('id', actorIds);
      for (const row of (rows || []) as ActivityActor[]) actors.set(row.id, row);
    }

    const clients = new Map<string, { id: string; name: string }>();
    if (clientIds.length > 0) {
      const { data: rows } = await supabase.from('clients').select('id, name').in('id', clientIds);
      for (const row of (rows || []) as { id: string; name: string }[]) clients.set(row.id, row);
    }

    return NextResponse.json({
      data: events.map((e) => ({
        ...e,
        actor: e.actor_id ? actors.get(e.actor_id) || null : null,
        client: e.client_id ? clients.get(e.client_id) || null : null,
      })),
      count: count ?? events.length,
    });
  } catch (e) {
    return NextResponse.json({ error: safeError(e) }, { status: 500 });
  }
}
