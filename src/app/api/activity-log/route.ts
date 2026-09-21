import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type UserRow = { id: string; email: string; full_name: string; avatar_url: string; role: string };
type ClientRow = { id: string; name: string };

export type ActivityEntry = {
  kind: string;
  date: string;
  ts: string;
  author_name: string;
  author_avatar: string | null;
  text: string;
  client_name?: string;
};

const KINDS = {
  task_created: 'task_created',
  task_updated: 'task_updated',
  task_completed: 'task_completed',
  task_comment: 'task_comment',
  idea_created: 'idea_created',
  idea_updated: 'idea_updated',
  doc_created: 'doc_created',
  doc_updated: 'doc_updated',
  message: 'message',
  suggestion: 'suggestion',
  bug: 'bug',
  suggestion_comment: 'suggestion_comment',
  note_created: 'note_created',
} as const;

function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const daysAgoISO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: me } = await supabase.from('users').select('role').eq('id', userId).single();
    if (!me || !['admin', 'operador'].includes(me.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('days') || '14', 10) || 14));
    const fromISO = daysAgoISO(days);

    const entries: ActivityEntry[] = [];

    const [{ data: users }, { data: clients }] = await Promise.all([
      supabase.from('users').select('id, email, full_name, avatar_url, role'),
      supabase.from('clients').select('id, name'),
    ]);
    const userMap = new Map<string, UserRow>((users || []).map(u => [u.id, u]));
    const clientMap = new Map<string, ClientRow>((clients || []).map(c => [c.id, c.name]));

    const authorOf = (id: string | null | undefined): Pick<ActivityEntry, 'author_name' | 'author_avatar'> => {
      const u = id ? userMap.get(id) : undefined;
      return {
        author_name: u?.full_name || u?.email || 'Usuario',
        author_avatar: u?.avatar_url || null,
      };
    };

    const push = (kind: keyof typeof KINDS, ts: string, authorId: string | null | undefined, text: string, clientName?: string) => {
      if (!ts) return;
      const a = authorOf(authorId);
      entries.push({ kind, date: localDate(ts), ts, text, client_name: clientName, ...a });
    };

    await Promise.all([
      (async () => {
        const { data } = await supabase
          .from('tasks')
          .select('id, client_id, title, status, author_id, created_at, updated_at, completed_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const t of data || []) {
          const clientName = t.client_id ? clientMap.get(t.client_id)?.name : undefined;
          if (t.completed_at) {
            if (localDate(t.completed_at) >= localDate(fromISO)) push('task_completed', t.completed_at, t.author_id, `Tarea completada: “${t.title}”`, clientName);
          }
          push('task_created', t.created_at, t.author_id, `Se creó la tarea “${t.title}”`, clientName);
          if (t.updated_at && new Date(t.updated_at).getTime() - new Date(t.created_at).getTime() > 60_000) {
            push('task_updated', t.updated_at, t.author_id, `Se actualizó la tarea “${t.title}”`, clientName);
          }
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('task_comments')
          .select('id, task_id, user_id, content, created_at')
          .gte('created_at', fromISO)
          .limit(500);
        const ids = [...new Set((data || []).map(c => c.task_id).filter(Boolean))];
        const { data: tasks } = ids.length
          ? await supabase.from('tasks').select('id, title').in('id', ids)
          : { data: [] as { id: string; title: string }[] };
        const titleMap = new Map((tasks || []).map(t => [t.id, t.title]));
        for (const c of data || []) {
          const snippet = (c.content || '').replace(/\s+/g, ' ').trim().slice(0, 90);
          push('task_comment', c.created_at, c.user_id, `Nuevo comentario en “${titleMap.get(c.task_id) || 'tarea'}”: “${snippet}”`);
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('social_ideas')
          .select('id, client_id, title, status, author_id, created_at, updated_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const i of data || []) {
          const clientName = i.client_id ? clientMap.get(i.client_id)?.name : undefined;
          push('idea_created', i.created_at, i.author_id, `Nueva idea de contenido: “${i.title}”`, clientName);
          if (i.updated_at && new Date(i.updated_at).getTime() - new Date(i.created_at).getTime() > 60_000) {
            push('idea_updated', i.updated_at, i.author_id, `Se actualizó la idea “${i.title}”`, clientName);
          }
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('documents')
          .select('id, owner_id, title, created_at, updated_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const d of data || []) {
          push('doc_created', d.created_at, d.owner_id, `Se creó el documento “${d.title || 'Sin título'}”`);
          if (d.updated_at && new Date(d.updated_at).getTime() - new Date(d.created_at).getTime() > 60_000) {
            push('doc_updated', d.updated_at, d.owner_id, `Se editó el documento “${d.title || 'Sin título'}”`);
          }
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('messages')
          .select('id, sender_id, content, created_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const m of data || []) {
          const snippet = (m.content || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          push('message', m.created_at, m.sender_id, snippet ? `Envió un mensaje: “${snippet}”` : 'Envió un mensaje');
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('suggestions')
          .select('id, author_id, type, title, created_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const s of data || []) {
          push(
            s.type === 'bug' ? 'bug' : 'suggestion',
            s.created_at,
            s.author_id,
            s.type === 'bug' ? `Reportó el bug “${s.title}”` : `Propuso una sugerencia: “${s.title}”`
          );
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('suggestion_comments')
          .select('id, suggestion_id, author_id, content, created_at')
          .gte('created_at', fromISO)
          .limit(500);
        const ids = [...new Set((data || []).map(c => c.suggestion_id).filter(Boolean))];
        const { data: suggs } = ids.length
          ? await supabase.from('suggestions').select('id, title').in('id', ids)
          : { data: [] as { id: string; title: string }[] };
        const titleMap = new Map((suggs || []).map(s => [s.id, s.title]));
        for (const c of data || []) {
          const snippet = (c.content || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          push('suggestion_comment', c.created_at, c.author_id, `Comentó en “${titleMap.get(c.suggestion_id) || 'la publicación'}”: “${snippet}”`);
        }
      })(),
      (async () => {
        const { data } = await supabase
          .from('sticky_notes')
          .select('id, user_id, title, created_at')
          .gte('created_at', fromISO)
          .limit(500);
        for (const n of data || []) {
          push('note_created', n.created_at, n.user_id, `Creó la nota “${n.title || 'Sin título'}”`);
        }
      })(),
    ]);

    const sorted = entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return NextResponse.json({ data: sorted, days });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}