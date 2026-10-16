import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser, isStaff } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { id } = await params;
    const { data: attachment, error: attachmentError } = await supabase
      .from('task_attachments')
      .select('task_id')
      .eq('id', id)
      .single();
    if (attachmentError) throw attachmentError;
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('client_id, author_id')
      .eq('id', attachment.task_id)
      .single();
    if (taskError) throw taskError;
    if (!canAccessClient(user, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    if (!isStaff(user) && task.author_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { error } = await supabase.from('task_attachments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
