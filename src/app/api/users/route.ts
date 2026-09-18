import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = 'nexus';

const ALLOWED_DOMAINS = ['@mercodigital.com', '@mercouser.com'];

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

    const filtered = (data || []).filter(u =>
      ALLOWED_DOMAINS.some(d => u.email?.toLowerCase().endsWith(d))
    );
    return NextResponse.json({ data: filtered });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No hay token en el header Authorization' }, { status: 401 });
    }

    let userId: string;
    try {
      const payload = decodeJwt(token);
      if (!payload.sub) throw new Error('JWT no contiene sub');
      userId = payload.sub;
    } catch (e) {
      return NextResponse.json({ error: `Token inválido: ${e instanceof Error ? e.message : 'Error'}` }, { status: 401 });
    }

    const { data: dbUser, error: dbError } = await supabase.from('users').select('id, email, role').eq('id', userId).single();
    if (dbError || !dbUser) {
      return NextResponse.json({ error: `Usuario no encontrado en DB (id=${userId}): ${dbError?.message || 'sin datos'}` }, { status: 404 });
    }

    if (dbUser.role !== 'admin') {
      return NextResponse.json({ error: `Rol actual: "${dbUser.role}" — se requiere admin` }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, full_name: fullName, role: newRole, visible_modules } = body;

    if (!email || !password || !fullName || !newRole) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const INTERNAL_DOMAIN = '@mercodigital.com';
    const CLIENT_DOMAIN = '@mercouser.com';
    const isInternal = newRole === 'admin' || newRole === 'operador';
    const expectedDomain = isInternal ? INTERNAL_DOMAIN : CLIENT_DOMAIN;
    if (!email.toLowerCase().endsWith(expectedDomain)) {
      return NextResponse.json({
        error: isInternal
          ? `Los usuarios admin y operador deben tener email con dominio ${INTERNAL_DOMAIN}`
          : `Los usuarios client deben tener email con dominio ${CLIENT_DOMAIN}`,
      }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: newRole,
        app_id: APP_ID,
      },
    });

    if (createError) throw new Error(createError.message);
    if (!newAuthUser.user) throw new Error('No se pudo crear el usuario');

    const modules = visible_modules || (
      newRole === 'admin' ? ['dashboard', 'wizard', 'tareas', 'equipo', 'analysis', 'integrations', 'insights'] :
      newRole === 'operador' ? ['dashboard', 'wizard', 'tareas', 'equipo', 'analysis', 'insights'] :
      ['dashboard', 'analysis', 'insights']
    );

    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: newAuthUser.user.id,
        email,
        full_name: fullName,
        role: newRole,
        app_id: APP_ID,
        visible_modules: modules,
      }, { onConflict: 'id' });

    if (insertError) throw insertError;

    return NextResponse.json({
      data: {
        id: newAuthUser.user.id,
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
