import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

export function getAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export function getRequestUserId(request: Request): string | null {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
  if (!token) return null;
  try { return String(decodeJwt(token).sub || ''); } catch { return null; }
}

export async function getRequestUser(request: Request, supabase: SupabaseClient = getAdminClient()) {
  const id = getRequestUserId(request);
  if (!id) return null;
  const { data } = await supabase.from('users').select('id, role, client_id, allowed_client_ids').eq('id', id).single();
  return data || null;
}

export function isStaff(user: any) {
  return user?.role === 'admin' || user?.role === 'operador';
}

export function canAccessClient(user: any, clientId: string) {
  if (!user) return false;
  if (isStaff(user) && (user.allowed_client_ids === null || user.allowed_client_ids === undefined)) return true;
  if (Array.isArray(user.allowed_client_ids)) return user.allowed_client_ids.includes(clientId);
  return user.client_id === clientId;
}

export function safeError(error: unknown, fallback = 'Error interno') {
  const message = error instanceof Error ? error.message : String(error || fallback);
  return message
    .replace(/EA[A-Za-z0-9_-]{20,}/g, '[META_TOKEN]')
    .replace(/1\/\/[A-Za-z0-9_-]{20,}/g, '[GOOGLE_REFRESH_TOKEN]')
    .replace(/GOCSPX-[A-Za-z0-9_-]+/g, '[GOOGLE_CLIENT_SECRET]')
    .slice(0, 500);
}

export async function assertSyncRateLimit(supabase: SupabaseClient, clientId: string, platform: string, minutes = 2) {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('integration_sync_logs')
    .select('id, created_at')
    .eq('client_id', clientId)
    .eq('platform', platform)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) throw new Error(`Esperá ${minutes} minutos antes de volver a sincronizar ${platform}.`);
}

export async function logIntegrationSync(supabase: SupabaseClient, input: { clientId: string; userId: string | null; platform: string; status: 'success' | 'error'; rows?: number; message?: string }) {
  await supabase.from('integration_sync_logs').insert({
    client_id: input.clientId,
    user_id: input.userId,
    platform: input.platform,
    status: input.status,
    rows_synced: input.rows || 0,
    message: safeError(input.message || '').slice(0, 500),
  });
}
