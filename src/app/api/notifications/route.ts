import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Purges notifications that were soft-deleted more than 30 days ago.
 * Called opportunistically on each GET. Never throws.
 */
async function purgeExpired(): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  } catch (e) {
    console.error('purgeExpired error:', e);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');
    const unread_only = searchParams.get('unread_only') === 'true';
    const view = searchParams.get('view') || 'active'; // active | deleted | all

    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    void purgeExpired();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (view === 'active') query = query.is('deleted_at', null);
    else if (view === 'deleted') query = query.not('deleted_at', 'is', null);

    if (unread_only) query = query.eq('read', false);

    const { data, error } = await query;
    if (error) throw error;

    const { count: unread_count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)
      .eq('read', false)
      .is('deleted_at', null);

    return NextResponse.json({ data: data || [], unread_count: unread_count || 0 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, type, title, message, task_id, link } = body;
    if (!user_id || !type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({ user_id, type, title, message: message || '', task_id: task_id || null, link: link || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { notification_ids, mark_all_read, user_id, restore_ids } = body;

    // Restore soft-deleted notifications
    if (restore_ids && Array.isArray(restore_ids) && restore_ids.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ deleted_at: null })
        .in('id', restore_ids);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (mark_all_read && user_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user_id)
        .eq('read', false)
        .is('deleted_at', null);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (notification_ids && Array.isArray(notification_ids)) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', notification_ids);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { notification_ids } = body;
    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json({ error: 'notification_ids required' }, { status: 400 });
    }

    // Soft delete: the notification moves to the "deleted" bucket
    const { error } = await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', notification_ids);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
