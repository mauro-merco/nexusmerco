import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content } = body;
    if (!content) return NextResponse.json({ error: 'content required' }, { status: 400 });

    const { data, error } = await supabase
      .from('social_comments')
      .update({ content })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    const { data: user } = data.user_id
      ? await supabase.from('users').select('id, full_name, avatar_url').eq('id', data.user_id).single()
      : { data: null };

    return NextResponse.json({ data: { ...data, user: user || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('social_comments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
