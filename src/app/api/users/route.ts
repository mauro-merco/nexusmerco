import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_ID = 'nexus';

const ALLOWED_DOMAINS = ['@mercodigital.com', '@mercouser.com'];

export async function GET(request: Request) {
  try {
    const caller = await getRequestUser(request, supabase);
    if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const role = searchParams.get('role');

    let query = supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role, client_id, visible_modules, allowed_client_ids')
      .eq('app_id', APP_ID)
      .order('full_name', { ascending: true });

    if (clientId) {
      if (!canAccessClient(caller, clientId)) return NextResponse.json({ error: 'Sin acceso al cliente' }, { status: 403 });
      query = query.eq('client_id', clientId).eq('role', 'client');
    }
    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) throw error;

    const filtered = clientId ? (data || []) : (data || []).filter(u =>
      ALLOWED_DOMAINS.some(d => u.email?.toLowerCase().endsWith(d))
    );
    const safeData = caller.role === 'admin'
      ? filtered
      : filtered.map(({ id, email, full_name, avatar_url, role, client_id }) => ({ id, email, full_name, avatar_url, role, client_id }));
    return NextResponse.json({ data: safeData });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const dbUser = await getRequestUser(request, supabase);
    if (!dbUser || dbUser.role !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });

    const body = await request.json();
    const { email, password, full_name: fullName, role: newRole, visible_modules, allowed_client_ids, client_id } = body;

    if (!email || !password || !fullName || !newRole) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!['admin', 'operador', 'client'].includes(newRole)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    if (String(password).length < 10) return NextResponse.json({ error: 'La contraseña debe tener al menos 10 caracteres' }, { status: 400 });

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

    const modules = visible_modules || [];
    const allowedClients = allowed_client_ids || null;

    const { error: insertError } = await supabase
      .from('users')
      .upsert({
        id: newAuthUser.user.id,
        email,
        full_name: fullName,
        role: newRole,
        app_id: APP_ID,
        visible_modules: modules,
        allowed_client_ids: allowedClients,
        client_id: client_id || null,
      }, { onConflict: 'id' });

    if (insertError) throw insertError;

    return NextResponse.json({
      data: {
        id: newAuthUser.user.id,
        email,
        full_name: fullName,
        role: newRole,
        visible_modules: modules,
        allowed_client_ids: allowedClients,
        client_id: client_id || null,
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
