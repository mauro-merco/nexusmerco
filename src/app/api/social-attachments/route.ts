import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idea_id = searchParams.get('idea_id');
    const idea_ids = searchParams.get('idea_ids');

    if (!idea_id && !idea_ids) {
      return NextResponse.json({ error: 'idea_id or idea_ids required' }, { status: 400 });
    }

    let query = supabase.from('social_attachments').select('*').order('created_at', { ascending: true });

    if (idea_ids) {
      const ids = idea_ids.split(',').filter(Boolean);
      query = query.in('idea_id', ids);
    } else {
      query = query.eq('idea_id', idea_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idea_id, type, url, preview_url, name } = body;

    if (!idea_id || !type || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('social_attachments')
      .insert({ idea_id, type, url, preview_url: preview_url || '', name: name || '' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
