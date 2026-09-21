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

export async function DELETE(request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { commentId } = await params;

    const { data: existing } = await supabase.from('suggestion_comments').select('author_id').eq('id', commentId).single();
    if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
    const isAuthor = existing.author_id === userId;
    const isAdmin = user?.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Sin permisos para eliminar' }, { status: 403 });
    }

    const { error } = await supabase.from('suggestion_comments').delete().eq('id', commentId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}