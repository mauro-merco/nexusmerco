import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const { data: targetDate, error: targetError } = await supabase
      .from('ecommerce_dates')
      .select('client_id')
      .eq('id', id)
      .single();
    if (targetError) throw targetError;
    if (!canAccessClient(user, targetDate.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.color !== undefined) updates.color = body.color;
    if (body.start_date !== undefined) updates.start_date = body.start_date;
    if (body.end_date !== undefined) updates.end_date = body.end_date;

    const { data, error } = await supabase.from('ecommerce_dates').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const { data: targetDate, error: targetError } = await supabase
      .from('ecommerce_dates')
      .select('client_id')
      .eq('id', id)
      .single();
    if (targetError) throw targetError;
    if (!canAccessClient(user, targetDate.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    const { error } = await supabase.from('ecommerce_dates').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
