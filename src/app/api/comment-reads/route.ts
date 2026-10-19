import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type CommentReadType = 'task_comment' | 'social_comment';

const TYPES: CommentReadType[] = ['task_comment', 'social_comment'];

function isType(v: string | null): v is CommentReadType {
  return !!v && (TYPES as string[]).includes(v);
}

/** Verifies the caller can see every comment in `ids`. */
async function allowed(type: CommentReadType, ids: string[], user: any): Promise<boolean> {
  if (type === 'task_comment') {
    const { data } = await supabase.from('task_comments').select('task_id').in('id', ids);
    const taskIds = [...new Set((data || []).map(c => c.task_id).filter(Boolean))];
    if (taskIds.length === 0) return true;
    const { data: tasks } = await supabase.from('tasks').select('client_id').in('id', taskIds);
    return (tasks || []).every(t => canAccessClient(user, t.client_id));
  }
  const { data } = await supabase.from('social_comments').select('idea_id').in('id', ids);
  const ideaIds = [...new Set((data || []).map(c => c.idea_id).filter(Boolean))];
  if (ideaIds.length === 0) return true;
  const { data: ideas } = await supabase.from('social_ideas').select('client_id').in('id', ideaIds);
  return (ideas || []).every(i => canAccessClient(user, i.client_id));
}

async function readersFor(type: CommentReadType, ids: string[]) {
  if (ids.length === 0) return {};
  const { data: rows, error } = await supabase
    .from('comment_reads')
    .select('comment_id, user_id')
    .eq('comment_type', type)
    .in('comment_id', ids);
  if (error) throw error;

  const grouped: Record<string, string[]> = {};
  for (const r of rows || []) (grouped[r.comment_id] ||= []).push(r.user_id);

  const allUserIds = [...new Set((rows || []).map(r => r.user_id))];
  let usersMap: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
  if (allUserIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, full_name, avatar_url').in('id', allUserIds);
    usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  }

  const out: Record<string, { id: string; full_name: string | null; avatar_url: string | null }[]> = {};
  for (const [commentId, userIds] of Object.entries(grouped)) {
    out[commentId] = userIds.map(id => usersMap[id] || { id, full_name: null, avatar_url: null });
  }
  return out;
}

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    if (!isType(type)) return NextResponse.json({ error: 'type inválido' }, { status: 400 });

    const ids = (searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 300);
    if (ids.length === 0) return NextResponse.json({ data: {} });

    if (!(await allowed(type, ids, user))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json({ data: await readersFor(type, ids) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const type = body.type as CommentReadType;
    const id = body.id as string;
    if (!isType(type) || !id) return NextResponse.json({ error: 'type e id requeridos' }, { status: 400 });

    if (!(await allowed(type, [id], user))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const existing = await supabase
      .from('comment_reads')
      .select('comment_type, comment_id')
      .eq('comment_type', type)
      .eq('comment_id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    let nowSeen: boolean;
    if (existing.data) {
      const { error } = await supabase
        .from('comment_reads')
        .delete()
        .eq('comment_type', type)
        .eq('comment_id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      nowSeen = false;
    } else {
      const { error } = await supabase.from('comment_reads').insert({
        comment_type: type,
        comment_id: id,
        user_id: user.id,
      });
      if (error) throw error;
      nowSeen = true;
    }

    const readers = await readersFor(type, [id]);
    return NextResponse.json({ data: readers[id] || [], seen: nowSeen });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
