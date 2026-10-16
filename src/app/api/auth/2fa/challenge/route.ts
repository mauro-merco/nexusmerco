import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOTP } from '@otplib/totp';
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import { getRequestUser } from '@/lib/api-security';
import { createTwoFactorProof } from '@/lib/two-factor-session';

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

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'Sesión primaria inválida' }, { status: 401 });
    const now = Date.now();
    const attempt = attempts.get(user.id);
    if (attempt && attempt.resetAt > now && attempt.count >= 5) {
      return NextResponse.json({ error: 'Demasiados intentos. Esperá 5 minutos.' }, { status: 429 });
    }
    if (!attempt || attempt.resetAt <= now) attempts.set(user.id, { count: 1, resetAt: now + 5 * 60_000 });
    else attempt.count += 1;
    const { code } = await request.json();
    if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 });

    const { data: dbUser } = await supabase
      .from('users')
      .select('totp_secret, totp_enabled')
      .eq('id', user.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    if (!dbUser.totp_enabled || !dbUser.totp_secret) {
      return NextResponse.json({ error: '2FA no está activado' }, { status: 400 });
    }

    const result = await totp.verify(String(code).replace(/\D/g, ''), {
      secret: dbUser.totp_secret,
      epochTolerance: 60,
    });
    if (!result.valid) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 401 });
    }
    attempts.delete(user.id);

    const response = NextResponse.json({ data: { verified: true } });
    response.cookies.set('nexus_2fa', await createTwoFactorProof(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
