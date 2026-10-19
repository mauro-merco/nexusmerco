import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';
import { logActivity } from '@/lib/activity-events';
import type { ActivityArea } from '@/lib/activity-config';

const supabase = getAdminClient();

const TABLES: Record<string, string> = {
  task: 'tasks',
  social_idea: 'social_ideas',
  ads_idea: 'ads_ideas',
};

const AREAS: Record<string, ActivityArea> = {
  task: 'task',
  social_idea: 'social',
  ads_idea: 'ads',
};

async function resolveEntity(entityType: string, entityId: string) {
  const table = TABLES[entityType];
  if (!table) return null;
  const { data } = await supabase.from(table).select('client_id, title').eq('id', entityId).maybeSingle();
  if (!data?.client_id) return null;
  return { clientId: data.client_id as string, title: (data.title as string) || '', area: AREAS[entityType] };
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const entityType = params.get('entity_type') || '';
    const entityId = params.get('entity_id') || '';
    if (!TABLES[entityType] || !entityId) return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    const entity = await resolveEntity(entityType, entityId);
    if (!entity || !canAccessClient(user, entity.clientId)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const { data, error } = await supabase
      .from('material_links')
      .select('id, entity_type, entity_id, title, url, created_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const body = await request.json();
    const entityType = String(body.entity_type || '');
    const entityId = String(body.entity_id || '');
    if (!TABLES[entityType] || !entityId) return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    if (!String(body.title || '').trim() || !String(body.url || '').trim()) {
      return NextResponse.json({ error: 'Nombre y link son obligatorios' }, { status: 400 });
    }
    const entity = await resolveEntity(entityType, entityId);
    if (!entity || !canAccessClient(user, entity.clientId)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const { data, error } = await supabase
      .from('material_links')
      .insert({ entity_type: entityType, entity_id: entityId, title: body.title, url: body.url, created_by: user.id })
      .select('id, entity_type, entity_id, title, url, created_at')
      .single();
    if (error) throw error;
    await logActivity(supabase, {
      clientId: entity.clientId,
      area: entity.area,
      entityType,
      entityId,
      entityTitle: entity.title,
      action: 'material_added',
      detail: String(body.title),
      toValue: String(body.url),
      actorId: user.id,
    });
    return NextResponse.json({ data });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    const { data: link, error: linkError } = await supabase
      .from('material_links')
      .select('entity_type, entity_id, title')
      .eq('id', id)
      .maybeSingle();
    if (linkError) throw linkError;
    if (!link) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const entity = await resolveEntity(link.entity_type, link.entity_id);
    if (!entity || !canAccessClient(user, entity.clientId)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const { error } = await supabase.from('material_links').delete().eq('id', id);
    if (error) throw error;
    await logActivity(supabase, {
      clientId: entity.clientId,
      area: entity.area,
      entityType: link.entity_type,
      entityId: link.entity_id,
      entityTitle: entity.title,
      action: 'material_removed',
      detail: link.title,
      actorId: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}
