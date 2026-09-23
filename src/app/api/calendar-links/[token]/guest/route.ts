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
    const { data: link } = await supabase
      .from('calendar_share_links')
      .select('allowed_client_id, guest_enabled, allowed_user_ids, allowed_emails, enabled')
      .eq('token', token)
      .maybeSingle();

    let allowedClientId = link?.allowed_client_id as string | undefined;
    if (link && !link.enabled) return NextResponse.json({ error: 'Calendario no disponible' }, { status: 404 });
    const allowedEmails = (link?.allowed_emails || []).map((item: string) => item.toLowerCase());
    if (link && (!link.guest_enabled || (!link.allowed_user_ids?.length && !allowedEmails.length))) {
      return NextResponse.json({ error: 'El ingreso como invitado no está habilitado para este calendario' }, { status: 403 });
    }

    if (link && allowedEmails.includes(normalizedEmail)) {
      return NextResponse.json({ ok: true, name: normalizedEmail, email: normalizedEmail });
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
      .select('id, email, full_name, client_id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'Este email no está creado como usuario cliente' }, { status: 403 });
    if (!link && user.client_id !== allowedClientId) {
      return NextResponse.json({ error: 'Este email no está autorizado para este calendario' }, { status: 403 });
    }
    if (link && !(link.allowed_user_ids || []).includes(user.id)) {
      return NextResponse.json({ error: 'Este usuario no está habilitado para este calendario' }, { status: 403 });
    }
    return NextResponse.json({ ok: true, name: user.full_name || user.email, email: user.email });
  } catch (err) {
    console.error('POST /api/calendar-links/[token]/guest error:', err);
    return NextResponse.json({ error: 'Error al validar invitado' }, { status: 500 });
  }
}
