import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff, safeError } from '@/lib/api-security';

const supabase = getAdminClient();

export async function GET(request: Request) {
  try {
    const clientId = new URL(request.url).searchParams.get('client_id');
    if (!clientId) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });
    const { data, error } = await supabase.from('calendar_general_folders').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user || !isStaff(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const body = await request.json();
    const { data, error } = await supabase.from('calendar_general_folders').insert({ client_id: body.client_id, title: body.title || '', folder_url: body.folder_url || '' }).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user || !isStaff(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    const { error } = await supabase.from('calendar_general_folders').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: safeError(e) }, { status: 500 }); }
}
