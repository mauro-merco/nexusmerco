import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, isStaff } from '@/lib/api-security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase no está configurado' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const weekStart = searchParams.get('week_start');
    const month = searchParams.get('month');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const user = await getRequestUser(request, supabase);
    if (!user || !isStaff(user)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    if (clientId && !canAccessClient(user, clientId)) return NextResponse.json({ error: 'Sin acceso al cliente' }, { status: 403 });

    let query = supabase.from('uploaded_files').select('id, client_id, filename, source_type, month, week_start_date, date_from, date_to, status, summary, created_by, created_at').order('created_at', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    else if (Array.isArray(user.allowed_client_ids)) query = query.in('client_id', user.allowed_client_ids.length ? user.allowed_client_ids : ['__none__']);
    if (weekStart) query = query.eq('week_start_date', weekStart);
    if (month) query = query.eq('month', month);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Uploaded files API error:', err);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
