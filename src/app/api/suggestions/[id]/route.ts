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

async function getUserRole(userId: string): Promise<string | null> {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role || null;
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

    const { data: sug, error } = await supabase.from('suggestions').select('*').eq('id', id).single();
    if (error) throw error;
    if (!sug) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    const [{ data: author }, { data: commentRows }, { data: likeRows }] = await Promise.all([
      supabase.from('users').select('id, email, full_name, avatar_url, role').eq('id', sug.author_id).single(),
      supabase.from('suggestion_comments').select('*').eq('suggestion_id', id).order('created_at', { ascending: true }),
      supabase.from('suggestion_likes').select('suggestion_id, user_id').eq('suggestion_id', id),
    ]);

    const commentIds = [...new Set((commentRows || []).map(c => c.author_id).filter(Boolean))];
    const { data: commentUsers } = commentIds.length > 0
      ? await supabase.from('users').select('id, email, full_name, avatar_url, role').in('id', commentIds)
      : { data: [] as { id: string; email: string; full_name: string; avatar_url: string; role: string }[] };
    const commentAuthorMap = Object.fromEntries((commentUsers || []).map(u => [u.id, u]));

    return NextResponse.json({
      data: {
        ...sug,
        author: author || null,
        comments: buildTree(commentRows || [], commentAuthorMap),
        comment_count: (commentRows || []).length,
        like_count: (likeRows || []).length,
        liked_by_me: (likeRows || []).some(l => l.user_id === userId),
      },
    });
  } catch (e) {
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
    const role = await getUserRole(userId);

    const { data: existing, error: fetchError } = await supabase.from('suggestions').select('*').eq('id', id).single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    }

    const isAuthor = existing.author_id === userId;
    const isTeam = role === 'admin' || role === 'operador';
    if (!isAuthor && !isTeam) {
      return NextResponse.json({ error: 'Sin permisos para editar' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined || body.content !== undefined) {
      if (!isAuthor && role !== 'admin') {
        return NextResponse.json({ error: 'Solo el autor puede editar el contenido' }, { status: 403 });
      }
      if (typeof body.title === 'string') updates.title = body.title.trim() || existing.title;
      if (typeof body.content === 'string') updates.content = body.content.trim() || existing.content;
    }

    if (typeof body.status === 'string') {
      const allowed = ['abierta', 'en_revision', 'implementada', 'descartada'];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      }
      if (updates.title === undefined && updates.content === undefined && !isAuthor && !isTeam) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Sin cambios' }, { status: 400 });
    }

    const { data, error } = await supabase.from('suggestions').update(updates).eq('id', id).select().single();
    if (error) throw error;

    const { data: author } = await supabase.from('users').select('id, email, full_name, avatar_url, role').eq('id', data.author_id).single();
    const [{ data: commentRows }, { data: likeRows }] = await Promise.all([
      supabase.from('suggestion_comments').select('*').eq('suggestion_id', id).order('created_at', { ascending: true }),
      supabase.from('suggestion_likes').select('suggestion_id, user_id').eq('suggestion_id', id),
    ]);
    const commentIds = [...new Set((commentRows || []).map(c => c.author_id).filter(Boolean))];
    const { data: commentUsers } = commentIds.length > 0
      ? await supabase.from('users').select('id, email, full_name, avatar_url, role').in('id', commentIds)
      : { data: [] as { id: string; email: string; full_name: string; avatar_url: string; role: string }[] };
    const commentAuthorMap = Object.fromEntries((commentUsers || []).map(u => [u.id, u]));

    return NextResponse.json({
      data: {
        ...data,
        author: author || null,
        comments: buildTree(commentRows || [], commentAuthorMap),
        comment_count: (commentRows || []).length,
        like_count: (likeRows || []).length,
        liked_by_me: (likeRows || []).some(l => l.user_id === userId),
      },
    });
  } catch (e) {
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
    const role = await getUserRole(userId);

    const { data: existing, error: fetchError } = await supabase.from('suggestions').select('author_id').eq('id', id).single();
    if (fetchError || !existing) {
      return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
    }

    const isAuthor = existing.author_id === userId;
    if (!isAuthor && role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 });
    }

    const { error } = await supabase.from('suggestions').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}