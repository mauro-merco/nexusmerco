import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarLink } from '@/lib/calendar-access-server';

export async function calendarMentionUsers(db: SupabaseClient, clientId: string, link?: CalendarLink, month?: string) {
  let invited: string[] = [];
  if (!link) {
    const { data: portal, error } = await db.from('calendar_client_portals').select('allowed_user_ids, guest_enabled').eq('client_id', clientId).eq('enabled', true).maybeSingle();
    if (error && !['42P01', 'PGRST205'].includes(error.code)) throw error;
    if (portal?.guest_enabled) invited = portal.allowed_user_ids || [];
    if (month) {
      const { data: links, error } = await db.from('calendar_share_links').select('allowed_user_ids').eq('client_id', clientId).eq('month', month).eq('enabled', true).eq('guest_enabled', true);
      if (error) throw error;
      invited.push(...(links || []).flatMap(l => l.allowed_user_ids || []));
    }
  }
  const { data, error } = await db.from('users').select('id, full_name, email, avatar_url, role, client_id, allowed_client_ids').eq('app_id', 'nexus');
  if (error) throw error;
  return (data || []).filter(u => (!link && (u.role === 'admin' || u.role === 'operador')) || (u.role === 'client' && (
    u.client_id === (link?.allowed_client_id || clientId) ||
    (u.allowed_client_ids || []).includes(link?.allowed_client_id || clientId) ||
    (link?.guest_enabled && (link.allowed_user_ids || []).includes(u.id))
    || invited.includes(u.id)
  ))).map(({ id, full_name, email, avatar_url }) => ({ id, full_name, email, avatar_url }));
}
