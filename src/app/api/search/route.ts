import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SearchResult {
  type: 'client' | 'user' | 'document' | 'task';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

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
    const q = (searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ data: [] });

    const { data: me } = await supabase.from('users').select('role').eq('id', userId).single();
    const isTeam = me?.role === 'admin' || me?.role === 'operador';
    const like = `%${q}%`;
    const results: SearchResult[] = [];

    // Documents: owned or shared with me (all roles)
    const { data: sharedRows } = await supabase.from('document_shares').select('document_id').eq('user_id', userId);
    const sharedDocIds = (sharedRows || []).map(r => r.document_id);
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, owner_id')
      .ilike('title', like)
      .or(`owner_id.eq.${userId}${sharedDocIds.length > 0 ? `,id.in.(${sharedDocIds.join(',')})` : ''}`)
      .limit(8);
    for (const d of docs || []) {
      results.push({ type: 'document', id: d.id, label: d.title || 'Sin título', sublabel: 'Documento', href: `/documentos?doc=${d.id}` });
    }

    if (isTeam) {
      const [{ data: clients }, { data: users }, { data: tasks }] = await Promise.all([
        supabase.from('clients').select('id, name, industry').ilike('name', like).limit(8),
        supabase.from('users').select('id, full_name, email').or(`full_name.ilike.${like},email.ilike.${like}`).limit(8),
        supabase.from('tasks').select('id, title, client_id').ilike('title', like).limit(8),
      ]);

      for (const c of clients || []) {
        results.push({ type: 'client', id: c.id, label: c.name, sublabel: c.industry || 'Cliente', href: `/dashboard?client=${c.id}` });
      }
      for (const u of users || []) {
        results.push({ type: 'user', id: u.id, label: u.full_name || u.email, sublabel: u.email, href: `/u/${u.id}` });
      }
      if (tasks && tasks.length > 0) {
        const clientIds = [...new Set(tasks.map(t => t.client_id).filter(Boolean))];
        const { data: taskClients } = clientIds.length > 0
          ? await supabase.from('clients').select('id, name').in('id', clientIds)
          : { data: [] };
        const clientsMap = Object.fromEntries((taskClients || []).map(c => [c.id, c.name]));
        for (const t of tasks) {
          results.push({ type: 'task', id: t.id, label: t.title, sublabel: clientsMap[t.client_id] || 'Tarea', href: `/operations?task=${t.id}` });
        }
      }
    }

    return NextResponse.json({ data: results });
  } catch (e) {
    console.error('GET /api/search error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
