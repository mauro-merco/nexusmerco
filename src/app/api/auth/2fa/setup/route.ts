import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TOTP } from '@otplib/totp';
import { NobleCryptoPlugin } from '@otplib/plugin-crypto-noble';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import * as QRCode from 'qrcode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_NAME = 'Nexus Marketing OS';

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

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, totp_enabled')
      .eq('id', authUser.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    if (dbUser.totp_enabled) {
      return NextResponse.json({ error: '2FA ya está activado. Desactiválo primero.' }, { status: 400 });
    }

    const secret = totp.generateSecret();
    const uri = `otpauth://totp/${encodeURIComponent(APP_NAME)}:${encodeURIComponent(dbUser.email)}?secret=${secret}&issuer=${encodeURIComponent(APP_NAME)}&algorithm=SHA1&digits=6&period=30`;
    const qrCode = await QRCode.toDataURL(uri);

    await supabase.from('users').update({ totp_secret: secret }).eq('id', authUser.id);

    return NextResponse.json({ data: { secret, qrCode } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
