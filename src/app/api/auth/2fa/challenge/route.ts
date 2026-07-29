import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOTP } from '@otplib/totp';
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';

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
    const { userId, code } = await request.json();
    if (!userId || !code) {
      return NextResponse.json({ error: 'userId y code requeridos' }, { status: 400 });
    }

    const { data: dbUser } = await supabase
      .from('users')
      .select('totp_secret, totp_enabled')
      .eq('id', userId)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (!dbUser.totp_enabled || !dbUser.totp_secret) {
      return NextResponse.json({ error: '2FA no está activado' }, { status: 400 });
    }

    const result = await totp.verify(code, { secret: dbUser.totp_secret });
    if (!result.valid) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 });
    }

    return NextResponse.json({ data: { verified: true } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
