import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INTERNAL_DOMAIN = '@mercodigital.com';

async function getRequesterEmail(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    if (!payload.sub) return null;
    const { data } = await supabase.from('users').select('email').eq('id', payload.sub).single();
    return data?.email || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const { data: task, error } = await supabase.from('tasks').select('*').eq('share_token', token).single();
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

    const userIds = [...new Set([...assigneeIds, task.author_id].filter(Boolean))];
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
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
        ...task,
        assignees: assigneeIds.map(uid => usersMap[uid]).filter(Boolean),
        author: task.author_id ? usersMap[task.author_id] || null : null,
        client: client || null,
        comments: (comments || []).map(c => ({ ...c, user: commentUsersMap[c.user_id] || null })),
        attachments: attachments || [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
