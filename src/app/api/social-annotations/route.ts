import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccessClient, getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const body = await request.json();
    const { comment_id, attachment_id, x, y, label } = body;

    if (!comment_id || !attachment_id || x === undefined || y === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [{ data: comment, error: commentError }, { data: attachment, error: attachmentError }] = await Promise.all([
      supabase.from('social_comments').select('idea_id').eq('id', comment_id).single(),
      supabase.from('social_attachments').select('idea_id').eq('id', attachment_id).single(),
    ]);
    if (commentError) throw commentError;
    if (attachmentError) throw attachmentError;
    if (comment.idea_id !== attachment.idea_id) {
      return NextResponse.json({ error: 'El comentario y el adjunto no pertenecen a la misma idea' }, { status: 400 });
    }
    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', comment.idea_id)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
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
    const user = await getRequestUser(request, supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const comment_id = searchParams.get('comment_id');
    const attachment_id = searchParams.get('attachment_id');

    if (!comment_id && !attachment_id) {
      return NextResponse.json({ error: 'comment_id or attachment_id required' }, { status: 400 });
    }

    const commentResult = comment_id
      ? await supabase.from('social_comments').select('idea_id').eq('id', comment_id).single()
      : null;
    const attachmentResult = attachment_id
      ? await supabase.from('social_attachments').select('idea_id').eq('id', attachment_id).single()
      : null;
    if (commentResult?.error) throw commentResult.error;
    if (attachmentResult?.error) throw attachmentResult.error;
    const commentIdeaId = commentResult?.data?.idea_id;
    const attachmentIdeaId = attachmentResult?.data?.idea_id;
    if (commentIdeaId && attachmentIdeaId && commentIdeaId !== attachmentIdeaId) {
      return NextResponse.json({ error: 'El comentario y el adjunto no pertenecen a la misma idea' }, { status: 400 });
    }
    const ideaId = commentIdeaId || attachmentIdeaId;
    const { data: idea, error: ideaError } = await supabase
      .from('social_ideas')
      .select('client_id')
      .eq('id', ideaId)
      .single();
    if (ideaError) throw ideaError;
    if (!canAccessClient(user, idea.client_id)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

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
