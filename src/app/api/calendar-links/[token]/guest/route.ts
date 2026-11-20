import { NextResponse } from 'next/server';
import { getSupabaseAdmin, resolveCalendarLink, resolveCalendarViewer } from '@/lib/calendar-access-server';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const db = getSupabaseAdmin();
    const resolved = await resolveCalendarLink(db, (await params).token, 'social');
    if ('error' in resolved) return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    const viewer = await resolveCalendarViewer(request, db, resolved.link);
    if (!viewer || viewer.isStaff) return NextResponse.json({ error: 'Usá una cuenta cliente autorizada' }, { status: 403 });
    const { data: user, error } = await db.from('users').select('full_name, email, role').eq('id', viewer.id).single();
    if (error) throw error;
    if (user.role !== 'client') return NextResponse.json({ error: 'Cuenta cliente requerida' }, { status: 403 });
    return NextResponse.json({ ok: true, name: user.full_name || user.email, email: user.email });
  } catch (error) {
    console.error('Calendar guest access:', error);
    return NextResponse.json({ error: 'No se pudo validar el acceso' }, { status: 500 });
  }
}
