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
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: { user: authUser } } = await client.auth.getUser(token);
    if (!authUser) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const { token: code, password } = await request.json();

    if (password) {
      const { error: signInError } = await client.auth.signInWithPassword({
        email: authUser.email || '',
        password,
      });
      if (signInError) {
        return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
      }
    } else if (code) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('totp_secret')
        .eq('id', authUser.id)
        .single();
      if (!dbUser?.totp_secret) {
        return NextResponse.json({ error: '2FA no está configurado' }, { status: 400 });
      }
      const result = await totp.verify(code, { secret: dbUser.totp_secret });
      if (!result.valid) {
        return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Ingresá tu contraseña o un código 2FA para desactivar' }, { status: 400 });
    }

    await supabase.from('users').update({ totp_secret: null, totp_enabled: false }).eq('id', authUser.id);

    return NextResponse.json({ data: { totp_enabled: false } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
