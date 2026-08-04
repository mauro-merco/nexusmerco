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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    // Check access: owner, shared, or admin/operador
    const [{ data: shareRows }, { data: dbUser }] = await Promise.all([
      supabase.from('document_shares').select('user_id').eq('document_id', id),
      supabase.from('users').select('role').eq('id', userId).single(),
    ]);

    const canAccess = doc.owner_id === userId
      || (shareRows || []).some(s => s.user_id === userId)
      || (dbUser?.role === 'admin' || dbUser?.role === 'operador');

    if (!canAccess) {
      return NextResponse.json({ error: 'Sin acceso a este documento' }, { status: 403 });
    }

    // Owner + shared users info
    const ownerIds = [...new Set([doc.owner_id, ...(shareRows || []).map(s => s.user_id)])];
    const { data: users } = ownerIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', ownerIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const enriched = {
      ...doc,
      owner: usersMap[doc.owner_id] || null,
      shared_users: (shareRows || []).map(s => usersMap[s.user_id]).filter(Boolean),
      is_shared_with_me: doc.owner_id !== userId && (shareRows || []).some(s => s.user_id === userId),
      can_edit: doc.owner_id === userId || (shareRows || []).some(s => s.user_id === userId) || dbUser?.role === 'admin' || dbUser?.role === 'operador',
    };

    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/documents/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check access: owner or shared user can edit
    const { data: doc } = await supabase.from('documents').select('owner_id').eq('id', id).single();
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    const { data: shareRows } = await supabase.from('document_shares').select('user_id').eq('document_id', id);
    const isOwner = doc.owner_id === userId;
    const isShared = (shareRows || []).some(s => s.user_id === userId);

    if (!isOwner && !isShared) {
      return NextResponse.json({ error: 'Sin permiso para editar' }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;

    const { data, error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    console.error('PUT /api/documents/[id] error:', e);
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
    const { data: doc } = await supabase.from('documents').select('owner_id').eq('id', id).single();
    if (!doc) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });

    if (doc.owner_id !== userId) {
      return NextResponse.json({ error: 'Solo el propietario puede eliminar' }, { status: 403 });
    }

    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/documents/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
