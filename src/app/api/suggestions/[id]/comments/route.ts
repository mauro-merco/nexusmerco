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

function buildTree(rows: any[], authorMap: Record<string, any>): any[] {
  const byId = new Map<string, any>();
  for (const c of rows) {
    byId.set(c.id, { ...c, author: authorMap[c.author_id] || null, replies: [] });
  }
  const roots: any[] = [];
  for (const c of rows) {
    const node = byId.get(c.id);
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id).replies.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (list: any[]) => {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    list.forEach(n => sortRec(n.replies));
  };
  sortRec(roots);
  return roots;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const { data: commentRows, error } = await supabase
      .from('suggestion_comments')
      .select('*')
      .eq('suggestion_id', id)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const authorIds = [...new Set((commentRows || []).map(c => c.author_id).filter(Boolean))];
    const { data: users } = authorIds.length > 0
      ? await supabase.from('users').select('id, email, full_name, avatar_url, role').in('id', authorIds)
      : { data: [] as { id: string; email: string; full_name: string; avatar_url: string; role: string }[] };
    const authorMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    return NextResponse.json({ data: buildTree(commentRows || [], authorMap) });
  } catch (e) {
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
    const { content, parent_id } = body as { content?: string; parent_id?: string | null };

    if (!content?.trim()) {
      return NextResponse.json({ error: 'El comentario no puede estar vacío' }, { status: 400 });
    }

    const { data: sug, error: sugError } = await supabase.from('suggestions').select('id').eq('id', id).single();
    if (sugError || !sug) {
      return NextResponse.json({ error: 'La sugerencia no existe' }, { status: 404 });
    }

    if (parent_id) {
      const { data: parentCheck } = await supabase.from('suggestion_comments').select('id').eq('id', parent_id).single();
      if (!parentCheck) {
        return NextResponse.json({ error: 'Comentario padre inválido' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('suggestion_comments')
      .insert({
        suggestion_id: id,
        author_id: userId,
        parent_id: parent_id || null,
        content: content.trim(),
      })
      .select()
      .single();
    if (error) throw error;

    const { data: author } = await supabase.from('users').select('id, email, full_name, avatar_url, role').eq('id', userId).single();

    return NextResponse.json({ data: { ...data, author: author || null, replies: [] } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}