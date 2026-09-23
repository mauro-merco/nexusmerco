import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

function getUserId(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token || token === 'undefined') return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub ? String(payload.sub) : null;
  } catch {
    return null;
  }
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('client_drive_folders')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('GET /api/clients/[id]/drive-folders error:', err);
    return NextResponse.json({ error: 'Error al obtener carpetas' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, url } = await request.json();
    const cleanName = String(name || '').trim();
    const cleanUrl = String(url || '').trim();

    if (!cleanName) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    if (!isValidUrl(cleanUrl)) return NextResponse.json({ error: 'Ingresá una URL válida' }, { status: 400 });

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('client_drive_folders')
      .insert({ client_id: id, name: cleanName, url: cleanUrl, created_by: getUserId(request) })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('POST /api/clients/[id]/drive-folders error:', err);
    return NextResponse.json({ error: 'Error al guardar carpeta' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const folderId = new URL(request.url).searchParams.get('folder_id');
    if (!folderId) return NextResponse.json({ error: 'folder_id requerido' }, { status: 400 });

    const supabase = getAdmin();
    const { error } = await supabase
      .from('client_drive_folders')
      .delete()
      .eq('id', folderId)
      .eq('client_id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/[id]/drive-folders error:', err);
    return NextResponse.json({ error: 'Error al eliminar carpeta' }, { status: 500 });
  }
}
