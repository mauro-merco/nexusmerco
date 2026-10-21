import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { email } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

    const supabase = getAdmin();
    const authToken = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: authData, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !authData.user || authData.user.email?.toLowerCase() !== normalizedEmail) {
      return NextResponse.json({ error: 'Sesión de invitado inválida' }, { status: 401 });
    }
    const { data: link } = await supabase
      .from('calendar_share_links')
      .select('allowed_client_id, guest_enabled, allowed_user_ids, enabled')
      .eq('token', token)
      .maybeSingle();

    let allowedClientId = link?.allowed_client_id as string | undefined;
    if (link && !link.enabled) return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404 });
    if (link && !link.guest_enabled) {
      return NextResponse.json({ error: 'El ingreso como invitado no está habilitado para este calendario' }, { status: 403 });
    }

    if (!allowedClientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('share_token', token)
        .maybeSingle();
      allowedClientId = client?.id;
    }

    if (!allowedClientId) return NextResponse.json({ error: 'Calendario no encontrado' }, { status: 404 });

    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, client_id, allowed_client_ids, role')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'Este email no está creado como usuario cliente' }, { status: 403 });
    if (user.role !== 'client') return NextResponse.json({ error: 'Este usuario no es un cliente invitado' }, { status: 403 });
    
    // Ensure allowed_client_ids is always an array
    const allowedClientIds = Array.isArray(user.allowed_client_ids) 
      ? user.allowed_client_ids.map(id => String(id)) 
      : [];
    
    const allowedClientIdStr = String(allowedClientId);
    const userClientIdStr = user.client_id ? String(user.client_id) : null;
    
    const hasClientAccess = userClientIdStr === allowedClientIdStr || allowedClientIds.includes(allowedClientIdStr);

    console.log('[CALENDAR GUEST AUTH]', {
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      user_client_id: userClientIdStr,
      user_allowed_client_ids: allowedClientIds,
      link_allowed_client_id: allowedClientIdStr,
      hasClientAccess,
      comparison_check: {
        client_id_match: userClientIdStr === allowedClientIdStr,
        allowed_ids_match: allowedClientIds.includes(allowedClientIdStr),
      }
    });

    // Access logic:
    // 1. If user has access to the client (via client_id or allowed_client_ids) → ALLOW
    // 2. If user is in allowed_user_ids → ALLOW
    // 3. Otherwise → DENY
    
    if (hasClientAccess) {
      // User belongs to this client or has it in allowed_client_ids → full access
      return NextResponse.json({ ok: true, name: user.full_name || user.email, email: user.email });
    }
    
    // User does NOT belong to the client, check if explicitly allowed via allowed_user_ids
    const allowedUserIds = link?.allowed_user_ids || [];
    if (allowedUserIds.includes(user.id)) {
      return NextResponse.json({ ok: true, name: user.full_name || user.email, email: user.email });
    }
    
    // User has no access
    console.log('[CALENDAR GUEST AUTH] DENIED - no client access and not in allowed_user_ids');
    return NextResponse.json({ error: 'Este usuario no está autorizado para este calendario' }, { status: 403 });
  } catch (err) {
    console.error('POST /api/calendar-links/[token]/guest error:', err);
    return NextResponse.json({ error: 'Error al validar invitado' }, { status: 500 });
  }
}
