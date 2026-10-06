import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOTP } from '@otplib/totp';
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const totp = new TOTP({
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
  digits: 6,
  period: 30,
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const payload = decodeJwt(token);
    const userId = String(payload.sub || '');
    if (!userId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const { token: code } = await request.json();
    if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

    const { data: dbUser } = await supabase
      .from('users')
      .select('totp_secret')
      .eq('id', userId)
      .single();

    if (!dbUser?.totp_secret) {
      return NextResponse.json({ error: 'No hay secret. Ejecutá setup primero.' }, { status: 400 });
    }

    const result = await totp.verify(String(code).replace(/\D/g, ''), {
      secret: dbUser.totp_secret,
      epochTolerance: 60,
    });
    if (!result.valid) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
    }

    await supabase.from('users').update({ totp_enabled: true }).eq('id', userId);

    return NextResponse.json({ data: { totp_enabled: true } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
