import type { SupabaseClient } from '@supabase/supabase-js';
import type { SalaParticipationAction } from './types';

type Db = SupabaseClient<any, any, any, any, any>;

export interface SalaAccess {
  sala: any | null;
  isMember: boolean;
  isStaff: boolean;
  role: string | null;
  canRead: boolean;
  /** Can send top-level messages / bulletin posts. */
  canPost: boolean;
  /** Can publish bulletins, pin, edit or delete other people's messages. */
  canModerate: boolean;
}

export async function getSalaAccess(db: Db, salaId: string, user: any): Promise<SalaAccess> {
  const { data: sala } = await db.from('salas').select('*').eq('id', salaId).maybeSingle();
  const staff = user?.role === 'admin' || user?.role === 'operador';
  if (!sala) {
    return { sala: null, isMember: false, isStaff: staff, role: null, canRead: false, canPost: false, canModerate: staff };
  }

  let role: string | null = null;
  if (user?.id) {
    const { data: membership } = await db
      .from('sala_members')
      .select('role')
      .eq('sala_id', salaId)
      .eq('user_id', user.id)
      .maybeSingle();
    role = membership?.role || null;
  }

  const canRead = sala.visibility === 'publica' || !!role || staff;
  const canPost = canRead && (sala.kind === 'chat' || staff);
  return {
    sala,
    isMember: !!role,
    isStaff: staff,
    role,
    canRead,
    canPost,
    canModerate: staff,
  };
}

export interface SalaParticipationInput {
  salaId: string | null;
  salaName?: string | null;
  messageId?: string | null;
  userId: string;
  action: SalaParticipationAction;
  emoji?: string | null;
  detail?: string | null;
  createdAt?: string;
}

/**
 * Best-effort append to the participation log. Never throws: a logging failure
 * must not break the interaction that triggered it.
 */
export async function logSalaParticipation(db: Db, input: SalaParticipationInput | SalaParticipationInput[]): Promise<void> {
  const list = (Array.isArray(input) ? input : [input]).filter((e) => e && e.action && e.userId);
  if (list.length === 0) return;
  const rows = list.map((e) => ({
    sala_id: e.salaId || null,
    sala_name: e.salaName || '',
    message_id: e.messageId || null,
    user_id: e.userId,
    action: e.action,
    emoji: e.emoji || null,
    detail: e.detail ? e.detail.slice(0, 300) : null,
    ...(e.createdAt ? { created_at: e.createdAt } : {}),
  }));
  try {
    const { error } = await db.from('sala_participation').insert(rows);
    if (error) console.error('logSalaParticipation error:', error.message);
  } catch (e) {
    console.error('logSalaParticipation failed:', e);
  }
}

/** Join a room if the user is not a member yet. Returns the membership role. */
export async function ensureSalaMembership(db: Db, salaId: string, userId: string, log = true, salaName?: string) {
  const { data: existing } = await db
    .from('sala_members')
    .select('role')
    .eq('sala_id', salaId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing.role as string;

  const { data, error } = await db
    .from('sala_members')
    .insert({ sala_id: salaId, user_id: userId, role: 'member' })
    .select('role')
    .single();
  if (error) return null;
  if (log) {
    await logSalaParticipation(db, { salaId, salaName, userId, action: 'joined' });
  }
  return (data?.role as string) || 'member';
}

export async function getUserMap(db: Db, ids: (string | null | undefined)[]) {
  const uniq = [...new Set(ids.filter(Boolean) as string[])];
  if (uniq.length === 0) return {} as Record<string, { id: string; full_name: string | null; avatar_url: string | null; email: string | null; role: string | null }>;
  const { data } = await db
    .from('users')
    .select('id, full_name, avatar_url, email, role')
    .in('id', uniq);
  return Object.fromEntries((data || []).map(u => [u.id, u]));
}

export function messageExcerpt(content: string, max = 140) {
  const clean = (content || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}
