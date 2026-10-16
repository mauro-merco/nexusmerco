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
    const idea_id = searchParams.get('idea_id');
    const idea_ids = searchParams.get('idea_ids');

    if (!idea_id && !idea_ids) {
      return NextResponse.json({ error: 'idea_id or idea_ids required' }, { status: 400 });
    }

    const ids = [...new Set((idea_ids ? idea_ids.split(',') : [idea_id]).filter((id): id is string => Boolean(id)))];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'idea_id or idea_ids required' }, { status: 400 });
    }
    const { data: ideas, error: ideasError } = await supabase
      .from('social_ideas')
      .select('id, client_id')
      .in('id', ids);
    if (ideasError) throw ideasError;
    if ((ideas || []).length !== ids.length || !(ideas || []).every(idea => canAccessClient(user, idea.client_id))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let query = supabase.from('social_attachments').select('*').order('created_at', { ascending: true });

    if (idea_ids) {
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
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const { idea_id, type, url, preview_url, name } = body;

    if (!idea_id || !type || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
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
