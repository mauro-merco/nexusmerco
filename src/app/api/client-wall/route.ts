import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getUserId(request: Request): string | null {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return payload.sub || null;
  } catch {
    return null;
  }
}

async function requireTeamRole(userId: string) {
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  return data?.role === 'admin' || data?.role === 'operador';
}

export async function GET(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await requireTeamRole(userId))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    if (!clientId) return NextResponse.json({ error: 'Falta client_id' }, { status: 400 });

    const { data: messages, error } = await supabase
      .from('client_wall_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const userIds = [...new Set((messages || []).map(m => m.user_id).filter(Boolean))];
    const { data: users } = userIds.length > 0
      ? await supabase.from('users').select('id, full_name, avatar_url, email, role').in('id', userIds)
      : { data: [] };
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]));

    return NextResponse.json({
      data: (messages || []).map(m => ({ ...m, user: m.user_id ? usersMap[m.user_id] || null : null })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getUserId(request);
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!(await requireTeamRole(userId))) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const body = await request.json();
    const clientId = body.client_id as string | undefined;
    const content = (body.content as string | undefined)?.trim();
    if (!clientId || !content) return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });

    const { data, error } = await supabase
      .from('client_wall_messages')
      .insert({ client_id: clientId, user_id: userId, content })
      .select()
      .single();
    if (error) throw error;

    const { data: user } = await supabase.from('users').select('id, full_name, avatar_url, email, role').eq('id', userId).single();

    return NextResponse.json({ data: { ...data, user: user || null } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}
