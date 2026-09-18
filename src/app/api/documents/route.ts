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

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    const { data: caller } = await supabase.from('users').select('role, email').eq('id', userId).single();
    const isAdminOrOperador = caller?.role === 'admin' || caller?.role === 'operador';
    const isTeamDomain = !!caller?.email && caller.email.toLowerCase().endsWith('@mercodigital.com');

    if (clientId) {
      if (!isAdminOrOperador && !isTeamDomain) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const { data: docs } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('updated_at', { ascending: false });

      return NextResponse.json({ data: (docs || []).map(d => ({
        ...d,
        can_edit: d.owner_id === userId,
      })) });
    }

    // Documents I own / shared with me
    const [{ data: owned }, { data: sharedRows }] = await Promise.all([
      supabase.from('documents').select('*').eq('owner_id', userId).order('updated_at', { ascending: false }),
      supabase.from('document_shares').select('document_id').eq('user_id', userId),
    ]);

    const byId = new Map<string, any>();
    for (const d of owned || []) byId.set(d.id, { ...d, is_shared_with_me: false });

    const sharedDocIds = (sharedRows || []).map(r => r.document_id);
    if (sharedDocIds.length > 0) {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .in('id', sharedDocIds)
        .order('updated_at', { ascending: false });
      for (const d of data || []) byId.set(d.id, { ...d, is_shared_with_me: true });
    }

    // Team members (@mercodigital.com) can also see every client-linked document
    if (isTeamDomain) {
      const { data: clientDocs } = await supabase
        .from('documents')
        .select('*')
        .not('client_id', 'is', null)
        .order('updated_at', { ascending: false });
      for (const d of clientDocs || []) {
        if (!byId.has(d.id)) byId.set(d.id, { ...d, is_shared_with_me: false, is_client_doc: true });
      }
    }

    const allDocs = [...byId.values()];

    // Fetch owners
    const ownerIds = [...new Set(allDocs.map(d => d.owner_id))];
    const { data: owners } = ownerIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', ownerIds)
      : { data: [] };
    const ownersMap = Object.fromEntries((owners || []).map(u => [u.id, u]));

    // Fetch shared users per document
    const docIds = allDocs.map(d => d.id);
    const { data: shareRows } = docIds.length > 0
      ? await supabase.from('document_shares').select('document_id, user_id').in('document_id', docIds)
      : { data: [] };

    const shareMap: Record<string, string[]> = {};
    for (const s of shareRows || []) {
      if (!shareMap[s.document_id]) shareMap[s.document_id] = [];
      shareMap[s.document_id].push(s.user_id);
    }

    const sharedUserIds = [...new Set((shareRows || []).map(s => s.user_id))];
    const { data: sharedUsers } = sharedUserIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', sharedUserIds)
      : { data: [] };
    const sharedUsersMap = Object.fromEntries((sharedUsers || []).map(u => [u.id, u]));

    // Fetch clients for linked documents
    const clientIds = [...new Set(allDocs.map(d => d.client_id).filter(Boolean))];
    const { data: clients } = clientIds.length > 0
      ? await supabase.from('clients').select('id, name, logo_url').in('id', clientIds)
      : { data: [] };
    const clientsMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

    const enriched = allDocs.map(d => ({
      ...d,
      client: d.client_id ? clientsMap[d.client_id] || null : null,
      owner: ownersMap[d.owner_id] || null,
      shared_users: (shareMap[d.id] || []).map(uid => sharedUsersMap[uid]).filter(Boolean),
      can_edit: d.owner_id === userId || d.is_shared_with_me,
    }));

    return NextResponse.json({ data: enriched });
  } catch (e) {
    console.error('GET /api/documents error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, is_public, client_id } = body;

    const { data, error } = await supabase
      .from('documents')
      .insert({
        owner_id: userId,
        title: title || 'Sin título',
        content: content || '',
        is_public: is_public || false,
        client_id: client_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    console.error('POST /api/documents error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
