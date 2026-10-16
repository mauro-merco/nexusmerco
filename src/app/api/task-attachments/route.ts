import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('client_id')
      .eq('id', task_id)
      .single();
    if (taskError) throw taskError;
    if (!canAccessClient(user, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', task_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { task_id, url, name, type } = body;
    if (!task_id || typeof url !== 'string' || !url) {
      return NextResponse.json({ error: 'task_id and url required' }, { status: 400 });
    }
    if (url.length > 2048 || (name !== undefined && typeof name !== 'string') || (type !== undefined && typeof type !== 'string')) {
      return NextResponse.json({ error: 'Invalid attachment fields' }, { status: 400 });
    }
    if ((name?.length || 0) > 255 || (type?.length || 0) > 50) {
      return NextResponse.json({ error: 'Attachment fields too long' }, { status: 400 });
    }
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('Invalid protocol');
    } catch {
      return NextResponse.json({ error: 'url must be a valid http/https URL' }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('client_id')
      .eq('id', task_id)
      .single();
    if (taskError) throw taskError;
    if (!canAccessClient(user, task.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('task_attachments')
      .insert({ task_id, url, name: name || '', type: type || 'link' })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
