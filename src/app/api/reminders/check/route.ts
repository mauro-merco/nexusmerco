import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/mentions';

/**
 * Marks due (reminder_at <= now) reminders as notified and creates a
 * notification for each. Called periodically by the client.
 */
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const user_id = typeof body?.user_id === 'string' ? body.user_id : '';
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

    const now = new Date().toISOString();

    const { data: due } = await supabase
      .from('reminders')
      .select('id, title')
      .eq('user_id', user_id)
      .eq('done', false)
      .eq('notified', false)
      .lte('reminder_at', now);

    let created = 0;
    if (due && due.length > 0) {
      const items = due as { id: string; title: string | null }[];
      const ids = items.map((r) => r.id);
      for (const r of items) {
        await supabase.from('notifications').insert({
          user_id,
          type: 'reminder',
          title: 'Recordatorio ⏰',
          message: r.title,
          link: null,
        });
        created++;
      }
      await supabase.from('reminders').update({ notified: true }).in('id', ids);
    }

    return NextResponse.json({ created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
