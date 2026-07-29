import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = 'nexus';

async function getCurrentUserRole(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: { user: authUser }, error } = await client.auth.getUser(token);
  if (error || !authUser) return null;

  const { data: user } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  return user?.role || null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const appFilter = searchParams.get('app_id') || APP_ID;

    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role, visible_modules')
      .eq('app_id', appFilter)
      .order('full_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const role = await getCurrentUserRole(request);
    if (role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado. Solo admins pueden crear usuarios.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, full_name: fullName, role: newRole, visible_modules } = body;

    if (!email || !password || !fullName || !newRole) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: newRole,
        app_id: APP_ID,
      },
    });

    if (authError) throw new Error(authError.message);
    if (!authUser.user) throw new Error('No se pudo crear el usuario');

    const modules = visible_modules || (
      newRole === 'admin' ? ['dashboard', 'wizard', 'tareas', 'analysis', 'integrations', 'insights'] :
      newRole === 'operador' ? ['dashboard', 'wizard', 'tareas', 'analysis', 'insights'] :
      ['dashboard', 'analysis', 'insights']
    );

    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        full_name: fullName,
        role: newRole,
        app_id: APP_ID,
        visible_modules: modules,
      }, { onConflict: 'id' });

    if (insertError) throw insertError;

    return NextResponse.json({
      data: {
        id: authUser.user.id,
        email,
        full_name: fullName,
        role: newRole,
        visible_modules: modules,
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
