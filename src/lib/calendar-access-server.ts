import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

export type CalendarType = 'social' | 'ads';

export function isCalendarType(value: string): value is CalendarType {
  return value === 'social' || value === 'ads';
}

export function getSupabaseAdmin() {
  // The service role key is exposed under two names in this project: the local
  // .env.local only defines SUPABASE_SERVICE_ROLE_KEY, while Vercel defines the
  // NEXT_PUBLIC_-prefixed variant. Accept both so the API works in both places.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey!, {
    auth: { persistSession: false },
  });
}

export function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export interface CalendarLink {
  token?: string;
  client_id?: string;
  calendar_type?: CalendarType;
  month?: string | null;
  allowed_client_id: string;
  guest_enabled?: boolean;
  allowed_user_ids?: string[];
  legacy?: boolean;
}

export async function resolveCalendarLink(
  supabase: SupabaseClient,
  token: string,
  requestedType: CalendarType,
): Promise<
  | { error: string; status: number }
  | {
      client: { id: string; name: string; logo_url: string | null; social_calendar_enabled?: boolean; ads_calendar_enabled?: boolean };
      link: CalendarLink;
      type: CalendarType;
      month: string | null;
    }
> {
  const { data: link } = await supabase
    .from('calendar_share_links')
    .select('token, client_id, calendar_type, month, allowed_client_id, guest_enabled, allowed_user_ids, enabled')
    .eq('token', token)
    .maybeSingle();

  if (link) {
    if (!link.enabled) return { error: 'Calendario no disponible', status: 404 };
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, logo_url, social_calendar_enabled, ads_calendar_enabled')
      .eq('id', link.client_id)
      .single();
    if (clientError || !client) return { error: 'Calendario no encontrado', status: 404 };
    return { client, link, type: link.calendar_type as CalendarType, month: link.month as string };
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, logo_url, share_token, social_calendar_enabled, ads_calendar_enabled')
    .eq('share_token', token)
    .single();

  if (clientError || !client) return { error: 'Calendario no encontrado', status: 404 };
  return {
    client,
    link: { allowed_client_id: client.id, calendar_type: requestedType, month: null, legacy: true },
    type: requestedType,
    month: null,
  };
}

/**
 * Resolves the acting user for a calendar request.
 * Accepts a Supabase session (admins/operators, legacy client users, allowed_user_ids)
 * or a guest email that must belong to a user listed in `allowed_user_ids`.
 * Returns the user id, or null when access is denied.
 */
export async function resolveCalendarViewer(
  request: Request,
  supabase: SupabaseClient,
  link: CalendarLink,
): Promise<{ id: string; isStaff: boolean } | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (token && token !== 'undefined') {
    try {
      const payload = decodeJwt(token);
      const userId = String(payload.sub || '');
      if (userId) {
        const { data: user } = await supabase
          .from('users')
          .select('role, client_id, allowed_client_ids')
          .eq('id', userId)
          .single();
        if (user?.role === 'admin' || user?.role === 'operador') return { id: userId, isStaff: true };
        if (link.legacy && user?.client_id === link.allowed_client_id) return { id: userId, isStaff: false };
        if (user?.role === 'client' && user?.client_id === link.allowed_client_id) return { id: userId, isStaff: false };
        if ((user?.allowed_client_ids || []).includes(link.allowed_client_id)) return { id: userId, isStaff: false };
        if ((link.allowed_user_ids || []).includes(userId)) return { id: userId, isStaff: false };
      }
    } catch {
      /* ignore */
    }
  }

  const url = new URL(request.url);
  const guestEmail = (request.headers.get('x-guest-email') || url.searchParams.get('guest_email') || '').trim().toLowerCase();
  if (!guestEmail) return null;
  if (!link.legacy && !link.guest_enabled) return null;

  const { data: allowedUser } = await supabase
    .from('users')
    .select('id, client_id, allowed_client_ids')
    .ilike('email', guestEmail)
    .maybeSingle();

  if (!allowedUser) return null;
  if (
    link.legacy ||
    allowedUser.client_id === link.allowed_client_id ||
    (allowedUser.allowed_client_ids || []).includes(link.allowed_client_id) ||
    (link.allowed_user_ids || []).includes(allowedUser.id)
  ) {
    return { id: allowedUser.id, isStaff: false };
  }
  return null;
}

export async function hasCalendarAccess(
  request: Request,
  supabase: SupabaseClient,
  link: CalendarLink,
): Promise<boolean> {
  return (await resolveCalendarViewer(request, supabase, link)) !== null;
}
