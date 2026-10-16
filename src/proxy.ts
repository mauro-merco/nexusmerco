import { NextResponse, type NextRequest } from 'next/server';
import { verifyTwoFactorProof } from '@/lib/two-factor-session';

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(request: NextRequest) {
  const now = Date.now();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const publicRequest = isPublicApi(request);
  const limit = publicRequest ? 90 : request.method === 'GET' ? 300 : 120;
  const key = `${ip}:${publicRequest ? 'public' : request.method === 'GET' ? 'read' : 'write'}`;
  const bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > limit;
}

function isPublicApi(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (request.method === 'OPTIONS') return true;
  if (path === '/api/ai/status') return true;
  if (path.startsWith('/api/public/') || path.startsWith('/api/profiles/') || path.startsWith('/api/tasks/public/')) return true;
  if (path.startsWith('/api/calendar-links/') || path.startsWith('/api/calendar-comments')) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  if (rateLimited(request)) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12_000_000) return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }
  if (isPublicApi(request)) return NextResponse.next();

  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: 'Autenticación no configurada' }, { status: 503 });
  }

  const verification = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
    cache: 'no-store',
  });
  if (!verification.ok) return NextResponse.json({ error: 'Sesión inválida o vencida' }, { status: 401 });
  const authUser = await verification.json() as { id?: string };
  if (!authUser.id) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

  if (request.nextUrl.pathname !== '/api/auth/2fa/challenge') {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: 'Autenticación no configurada' }, { status: 503 });
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${encodeURIComponent(authUser.id)}&select=totp_enabled`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      cache: 'no-store',
    });
    const profiles = profileResponse.ok ? await profileResponse.json() as Array<{ totp_enabled?: boolean }> : [];
    if (profiles[0]?.totp_enabled) {
      try {
        const valid = await verifyTwoFactorProof(request.cookies.get('nexus_2fa')?.value, authUser.id);
        if (!valid) return NextResponse.json({ error: 'Se requiere verificación de dos pasos' }, { status: 401 });
      } catch {
        return NextResponse.json({ error: 'Verificación de dos pasos no configurada' }, { status: 503 });
      }
    }
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

export const config = { matcher: '/api/:path*' };
