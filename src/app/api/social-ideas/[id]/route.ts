import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('social_ideas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('GET /api/social-ideas/[id] Supabase error:', JSON.stringify(error));
      throw error;
    }
    return NextResponse.json({ data });
  } catch (e) {
    console.error('GET /api/social-ideas/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.brief !== undefined) updates.brief = body.brief;
    if (body.eje_contenido !== undefined) updates.eje_contenido = body.eje_contenido;
    if (body.responsable !== undefined) updates.responsable = body.responsable;
    if (body.post_type !== undefined) updates.post_type = body.post_type;
    if (body.status !== undefined) updates.status = body.status;
    if (body.publish_date !== undefined) updates.publish_date = body.publish_date;

    const newCols = ['brief', 'eje_contenido', 'responsable'];
    let result = await supabase
      .from('social_ideas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (result.error && (result.error.code === '42703' || result.error.message?.includes('column'))) {
      const fallbackUpdates = { ...updates };
      for (const col of newCols) delete fallbackUpdates[col];
      result = await supabase
        .from('social_ideas')
        .update(fallbackUpdates)
        .eq('id', id)
        .select()
        .single();
    }

    if (result.error) {
      console.error('PUT /api/social-ideas/[id] Supabase error:', JSON.stringify(result.error));
      return NextResponse.json({ error: result.error.message || JSON.stringify(result.error) }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch (e) {
    console.error('PUT /api/social-ideas/[id] error:', e);
    const msg = e instanceof Error ? e.message : typeof e === 'object' ? JSON.stringify(e) : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('social_ideas').delete().eq('id', id);
    if (error) {
      console.error('DELETE /api/social-ideas/[id] Supabase error:', JSON.stringify(error));
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/social-ideas/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
