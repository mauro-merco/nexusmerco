import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';
import { getSalaAccess, logSalaParticipation } from '@/lib/salas-server';

const db = getAdminClient();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const { id } = await params;
    const access = await getSalaAccess(db, id, user);
    if (!access.sala) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    if (!isStaff(user) || (access.sala.created_by && access.sala.created_by !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Solo el creador o un administrador puede invitar' }, { status: 403 });
    }
    const body = await request.json();
    const ids: unknown[] = Array.isArray(body.user_ids) ? body.user_ids : [];
    const requested = [...new Set(ids.filter((value): value is string => typeof value === 'string'))].slice(0, 50);
    if (!requested.length) return NextResponse.json({ error: 'Seleccioná usuarios' }, { status: 400 });
    const [{ data: users, error: usersError }, { data: existing, error: existingError }] = await Promise.all([
      db.from('users').select('id').eq('app_id', 'nexus').in('role', ['admin', 'operador']).in('id', requested),
      db.from('sala_members').select('user_id').eq('sala_id', id).in('user_id', requested),
    ]);
    if (usersError || existingError) throw usersError || existingError;
    const members = new Set((existing || []).map(member => member.user_id));
    const newIds = (users || []).map(member => member.id).filter(userId => !members.has(userId));
    if (newIds.length) {
      const { error } = await db.from('sala_members').insert(newIds.map(userId => ({ sala_id: id, user_id: userId, role: 'member' })));
      if (error) throw error;
      await Promise.all([
        logSalaParticipation(db, newIds.map(userId => ({ salaId: id, salaName: access.sala.name, userId, action: 'joined' as const, detail: 'Invitado a la sala' }))),
        db.from('notifications').insert(newIds.map(userId => ({
          user_id: userId, type: 'sala', title: `Te invitaron a ${access.sala.name}`,
          message: 'Ya podés participar en esta sala.', link: `/salas?sala=${id}`,
        }))),
      ]);
    }
    return NextResponse.json({ data: { invited: newIds.length } });
  } catch (error) {
    console.error('POST /api/salas/[id]/invite error:', error);
    return NextResponse.json({ error: 'No se pudieron enviar las invitaciones' }, { status: 500 });
  }
}
