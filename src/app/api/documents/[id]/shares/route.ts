import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

async function isOwner(docId: string, userId: string): Promise<boolean> {
  const { data } = await supabase.from('documents').select('owner_id').eq('id', docId).single();
  return data?.owner_id === userId;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { data: shares } = await supabase
      .from('document_shares')
      .select('id, document_id, user_id, created_at')
      .eq('document_id', id);

    const userIds = [...new Set((shares || []).map(s => s.user_id))];
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const enriched = (shares || []).map(s => ({ ...s, user: usersMap[s.user_id] || null }));
    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/documents/[id]/shares error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    if (!(await isOwner(id, userId))) {
      return NextResponse.json({ error: 'Solo el propietario puede compartir' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('document_shares')
      .insert({ document_id: id, user_id })
      .select()
      .single();

    if (error) throw error;

    try {
      const [ownerRes, docRes] = await Promise.all([
        supabase.from('users').select('full_name, email').eq('id', userId).single(),
        supabase.from('documents').select('title').eq('id', id).single(),
      ]);
      const ownerName = ownerRes.data?.full_name || ownerRes.data?.email || 'Alguien';
      const docTitle = docRes.data?.title || 'un documento';
      await supabase.from('notifications').insert({
        user_id,
        type: 'document_shared',
        title: 'Te compartieron un documento',
        message: `${ownerName} te compartió: ${docTitle}`,
        link: '/documentos',
      });
    } catch (e) {
      console.error('share notification error:', e);
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error('POST /api/documents/[id]/shares error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    if (!(await isOwner(id, userId))) {
      return NextResponse.json({ error: 'Solo el propietario puede quitar el acceso' }, { status: 403 });
    }

    const { error } = await supabase
      .from('document_shares')
      .delete()
      .eq('document_id', id)
      .eq('user_id', user_id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/documents/[id]/shares error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
