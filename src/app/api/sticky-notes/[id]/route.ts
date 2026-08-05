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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, content, color, category } = body as { title?: string; content?: string; color?: string; category?: string };

    const { data, error } = await supabase
      .from('sticky_notes')
      .update({
        title,
        content,
        color,
        category,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
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

    const { error } = await supabase
      .from('sticky_notes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}