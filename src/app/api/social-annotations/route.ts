import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comment_id, attachment_id, x, y, label } = body;

    if (!comment_id || !attachment_id || x === undefined || y === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('social_annotations')
      .insert({ comment_id, attachment_id, x, y, label: label || '' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get('comment_id');
    const attachment_id = searchParams.get('attachment_id');

    let query = supabase.from('social_annotations').select('*');

    if (comment_id) query = query.eq('comment_id', comment_id);
    if (attachment_id) query = query.eq('attachment_id', attachment_id);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
