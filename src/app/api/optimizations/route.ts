import { NextResponse } from 'next/server';
import { canAccessClient, getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    if (!clientId) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 });
    }
    if (!canAccessClient(user, clientId)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('optimizations')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const { client_id, platform, title, action_taken, expected_impact, status, priority, weekly_input_id } = body;

    if (!client_id || !title) {
      return NextResponse.json({ error: 'Faltan campos requeridos: client_id, title' }, { status: 400 });
    }
    if (!isStaff(user) || !canAccessClient(user, client_id)) {
      return NextResponse.json({ error: 'Sin permisos para este cliente' }, { status: 403 });
    }
    if (weekly_input_id) {
      const { data: weeklyInput } = await supabase
        .from('weekly_inputs')
        .select('client_id')
        .eq('id', weekly_input_id)
        .maybeSingle();
      if (!weeklyInput || weeklyInput.client_id !== client_id || !canAccessClient(user, weeklyInput.client_id)) {
        return NextResponse.json({ error: 'Sin permisos para el registro semanal' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('optimizations')
      .insert({
        client_id,
        platform: platform || '',
        title,
        action_taken: action_taken || '',
        expected_impact: expected_impact || '',
        status: status || 'pending',
        priority: priority || 'medium',
        weekly_input_id: weekly_input_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
