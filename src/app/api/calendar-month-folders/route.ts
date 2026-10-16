import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function GET(request: Request) {
  const supabase = getAdminClient();
  const user = await getRequestUser(request, supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id');
  const calendar_type = url.searchParams.get('calendar_type');
  const month = url.searchParams.get('month');
  if (!client_id || !calendar_type || !month) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!canAccessClient(user, client_id)) return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
  const { data, error } = await supabase.from('calendar_month_folders').select('*').eq('client_id', client_id).eq('calendar_type', calendar_type).eq('month', month).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const supabase = getAdminClient();
  const user = await getRequestUser(request, supabase);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = await request.json();
  const { client_id, calendar_type, month, folder_url, title } = body;
  if (!client_id || !calendar_type || !month) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (!isStaff(user) || !canAccessClient(user, client_id)) return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
  const { data, error } = await supabase.from('calendar_month_folders').upsert({ client_id, calendar_type, month, folder_url: folder_url || '', title: title || '', updated_at: new Date().toISOString() }, { onConflict: 'client_id,calendar_type,month' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
