import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, role, bio, headline, is_public, visible_modules')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
      }
      throw error;
    }

    const isPublic = user.is_public !== false;
    if (!isPublic) {
      return NextResponse.json({ error: 'Perfil no disponible' }, { status: 404 });
    }

    // Tasks assigned to this user (with client + assignee info)
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, client_id, title, description, status, priority, due_date, position, assignee_id, author_id, created_at, updated_at')
      .eq('assignee_id', id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    const clientIds = [...new Set((tasks || []).map(t => t.client_id).filter(Boolean))];
    const { data: clients } = clientIds.length > 0
      ? await supabase.from('clients').select('id, name').in('id', clientIds)
      : { data: [] };
    const clientsMap = Object.fromEntries((clients || []).map(c => [c.id, c]));

    const allTasks = (tasks || []).map(t => ({ ...t, client: clientsMap[t.client_id] || null }));

    // Public documents owned by this user
    const { data: docs } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    // Public sticky notes
    const { data: notes } = await supabase
      .from('sticky_notes')
      .select('*')
      .eq('user_id', id)
      .eq('is_public', true)
      .order('updated_at', { ascending: false });

    return NextResponse.json({
      data: {
        user,
        tasks: allTasks,
        documents: docs || [],
        notes: notes || [],
      },
    });
  } catch (e) {
    console.error('GET /api/profiles/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}