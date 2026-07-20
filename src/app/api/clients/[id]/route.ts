import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdmin();
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('GET /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, logo_url, description, industry, campaign_types, plan, status, public_enabled, public_description } = body;

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
    }

    const supabase = getAdmin();
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (description !== undefined) updates.description = description;
    if (industry !== undefined) updates.industry = industry;
    if (campaign_types !== undefined) updates.campaign_types = campaign_types;
    if (plan !== undefined) updates.plan = plan;
    if (status !== undefined) updates.status = status;
    if (public_enabled !== undefined) updates.public_enabled = public_enabled;
    if (public_description !== undefined) updates.public_description = public_description;

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
      }
      throw error;
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('PUT /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = getAdmin();
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/clients/[id] error:', err);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
