import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INTERNAL_DOMAIN = '@mercodigital.com';

async function getRequesterEmail(request: Request): Promise<string | null> {
  const requester = await getRequestUser(request, supabase);
  if (!requester) return null;
  const { data } = await supabase.from('users').select('email').eq('id', requester.id).single();
  return data?.email || null;
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { data: task, error } = await supabase
      .from('tasks')
      .select('id, client_id, title, description, task_type, status, priority, due_date, pieces_stories, pieces_feed, pieces_reels, is_public')
      .eq('share_token', token)
      .single();
    if (error || !task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    if (!task.is_public) {
      const email = await getRequesterEmail(request);
      if (!email) {
        return NextResponse.json({ error: 'Necesitás iniciar sesión para ver esta tarea' }, { status: 401 });
      }
      if (!email.toLowerCase().endsWith(INTERNAL_DOMAIN)) {
        return NextResponse.json({ error: 'Esta tarea es privada' }, { status: 403 });
      }
    }

    const { data: assigneeRows } = await supabase.from('task_assignees').select('user_id').eq('task_id', task.id);
    const assigneeIds = (assigneeRows || []).map(r => r.user_id);

    const { data: users } = assigneeIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url').in('id', assigneeIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    const { data: client } = await supabase.from('clients').select('id, name, logo_url').eq('id', task.client_id).single();
    const { data: comments } = await supabase
      .from('task_comments')
      .select('id, content, created_at, user_id')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });
    const { data: attachments } = await supabase
      .from('task_attachments')
      .select('id, url, name, created_at')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true });

    const commentUserIds = [...new Set((comments || []).map(c => c.user_id).filter(Boolean))];
    const { data: commentUsers } = commentUserIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url').in('id', commentUserIds)
      : { data: [] };
    const commentUsersMap = Object.fromEntries((commentUsers || []).map(u => [u.id, u]));

    return NextResponse.json({
      access: task.is_public ? 'public' : 'private',
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        task_type: task.task_type,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        pieces_stories: task.pieces_stories,
        pieces_feed: task.pieces_feed,
        pieces_reels: task.pieces_reels,
        is_public: task.is_public,
        assignees: (assigneeRows || []).flatMap(row => {
          const assignee = usersMap[row.user_id];
          if (!assignee) return [];
          return task.is_public
            ? [{ full_name: assignee.full_name, avatar_url: assignee.avatar_url }]
            : [{ id: assignee.id, full_name: assignee.full_name, avatar_url: assignee.avatar_url }];
        }),
        client: client ? { name: client.name, logo_url: client.logo_url } : null,
        comments: (comments || []).map(c => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          user: commentUsersMap[c.user_id]
            ? { full_name: commentUsersMap[c.user_id].full_name, avatar_url: commentUsersMap[c.user_id].avatar_url }
            : null,
        })),
        attachments: (attachments || []).map(attachment => ({
          id: attachment.id,
          url: attachment.url,
          name: attachment.name,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
