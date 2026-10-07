import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function userId(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try { return String(decodeJwt(token).sub || ''); } catch { return null; }
}

async function canWrite(id: string) {
  const { data } = await supabase.from('users').select('role').eq('id', id).single();
  return data?.role === 'admin' || data?.role === 'operador';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const client_id = url.searchParams.get('client_id');
  const calendar_type = url.searchParams.get('calendar_type');
  const month = url.searchParams.get('month');
  if (!client_id || !calendar_type || !month) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  const { data, error } = await supabase.from('calendar_month_folders').select('*').eq('client_id', client_id).eq('calendar_type', calendar_type).eq('month', month).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const uid = userId(request);
  if (!uid) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!(await canWrite(uid))) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  const body = await request.json();
  const { client_id, calendar_type, month, folder_url, title } = body;
  if (!client_id || !calendar_type || !month) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  const { data, error } = await supabase.from('calendar_month_folders').upsert({ client_id, calendar_type, month, folder_url: folder_url || '', title: title || '', updated_at: new Date().toISOString() }, { onConflict: 'client_id,calendar_type,month' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
