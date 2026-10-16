import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/api-security';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function isGroupMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('message_group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const { data: existing } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    if (existing.group_id) {
      if (!(await isGroupMember(existing.group_id, user.id))) {
        return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
      }
      if (body.read) {
        await supabase
          .from('message_group_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('group_id', existing.group_id)
          .eq('user_id', user.id);
      }
      return NextResponse.json({ data: existing });
    }

    // Only the recipient can mark a DM as read
    if (existing.recipient_id !== user.id) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (body.read) {
      updates.read = true;
      updates.read_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e) {
    console.error('PUT /api/messages/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, supabase);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const { data: existing } = await supabase
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    const canDelete = existing.group_id
      ? await isGroupMember(existing.group_id, user.id)
      : existing.sender_id === user.id || existing.recipient_id === user.id;
    if (!canDelete) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
    }

    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/messages/[id] error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}