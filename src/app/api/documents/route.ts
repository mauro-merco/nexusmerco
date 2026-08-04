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

    // Documents I own
    const { data: owned } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false });

    // Documents shared with me
    const { data: sharedRows } = await supabase
      .from('document_shares')
      .select('document_id')
      .eq('user_id', userId);

    const sharedDocIds = (sharedRows || []).map(r => r.document_id);
    let sharedDocs: any[] = [];
    if (sharedDocIds.length > 0) {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .in('id', sharedDocIds)
        .order('updated_at', { ascending: false });
      sharedDocs = (data || []).map(d => ({ ...d, is_shared_with_me: true }));
    }

    const allDocs = [...(owned || []).map(d => ({ ...d, is_shared_with_me: false })), ...sharedDocs];

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

    const enriched = allDocs.map(d => ({
      ...d,
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
    const { title, content } = body;

    const { data, error } = await supabase
      .from('documents')
      .insert({
        owner_id: userId,
        title: title || 'Sin título',
        content: content || '',
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
