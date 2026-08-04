import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

export type SupabaseClient = SupabaseClientType<any, any, any, any, any>;

export function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds which known users are mentioned as @Name / @email in a comment.
 * Matches full names and email local parts (case-insensitive), preceded by @.
 */
export function findMentionedUsers(
  content: string,
  users: { id: string; full_name: string | null; email: string | null }[]
): { id: string; full_name: string | null; email: string | null }[] {
  if (!content || users.length === 0) return [];
  const mentioned: typeof users = [];
  for (const u of users) {
    const names: string[] = [];
    if (u.full_name?.trim()) names.push(u.full_name.trim());
    if (u.email?.trim()) names.push(u.email.split('@')[0].trim());
    for (const name of names) {
      if (name.length < 2) continue;
      const re = new RegExp(`@${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, 'iu');
      if (re.test(content)) {
        mentioned.push(u);
        break;
      }
    }
  }
  return mentioned;
}

export interface MentionOptions {
  link?: string;
  entityLabel?: string;
}

/**
 * Creates "mention" notifications for every user mentioned (@Name) in a comment.
 * Skips the comment author. Does not throw on failure.
 */
export async function createMentionNotifications(
  supabase: SupabaseClient,
  content: string,
  fromUserId: string,
  opts: MentionOptions = {}
): Promise<void> {
  try {
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email');
    if (!users || users.length === 0) return;

    const { data: actor } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', fromUserId)
      .single();
    const actorName = actor?.full_name || actor?.email || 'Alguien';

    const mentioned = findMentionedUsers(content, users);
    for (const target of mentioned) {
      if (target.id === fromUserId) continue;
      await supabase.from('notifications').insert({
        user_id: target.id,
        type: 'mention',
        title: 'Te mencionaron en un comentario',
        message: `${actorName} te mencionó en ${opts.entityLabel || 'un comentario'}`,
        link: opts.link || null,
      });
    }
  } catch (e) {
    console.error('createMentionNotifications error:', e);
  }
}

/** Creates a notification; returns void and never throws. */
export async function createNotification(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    type: string;
    title: string;
    message?: string;
    task_id?: string | null;
    link?: string | null;
  }
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: payload.user_id,
      type: payload.type,
      title: payload.title,
      message: payload.message || '',
      task_id: payload.task_id || null,
      link: payload.link || null,
    });
  } catch (e) {
    console.error('createNotification error:', e);
  }
}
