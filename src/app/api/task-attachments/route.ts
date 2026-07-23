import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const task_id = searchParams.get('task_id');
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

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
    const body = await request.json();
    const { task_id, url, name, type } = body;
    if (!task_id || !url) {
      return NextResponse.json({ error: 'task_id and url required' }, { status: 400 });
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
