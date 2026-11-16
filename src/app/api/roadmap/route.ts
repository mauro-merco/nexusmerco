import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, isStaff } from '@/lib/api-security';
import { ROADMAP_STATUSES } from '@/lib/roadmap';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function failure(error: unknown) {
  const code = (error as { code?: string })?.code;
  return NextResponse.json({ error: code === '42P01' || code === 'PGRST205'
    ? 'Falta aplicar la migración 00083_roadmap.sql para habilitar la hoja de ruta.'
    : 'No se pudo guardar o cargar la hoja de ruta. Intenta nuevamente.' }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const db = getAdminClient();
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Solo el equipo interno puede acceder.' }, { status: 403 });
    const id = new URL(request.url).searchParams.get('id');
    if (id && !uuid.test(id)) return NextResponse.json({ error: 'Propuesta inválida' }, { status: 400 });
    if (id) {
      const rows: { id: string; initiative_id: string; author_id: string; content: string; created_at: string; updated_at: string }[] = [];
      for (let offset = 0; ; offset += 1000) {
        const result = await db.from('roadmap_comments').select('*').eq('initiative_id', id).order('created_at').order('id').range(offset, offset + 999);
        if (result.error) throw result.error;
        rows.push(...(result.data || []));
        if ((result.data || []).length < 1000) break;
      }
      const ids = [...new Set(rows.map(c => c.author_id))];
      const authors = ids.length ? await db.from('users').select('id, full_name').in('id', ids) : { data: [], error: null };
      if (authors.error) throw authors.error;
      const names = new Map((authors.data || []).map(a => [a.id, a.full_name]));
      return NextResponse.json({ data: rows.map(c => ({ ...c, author_name: names.get(c.author_id) || 'Integrante del equipo' })) }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const initiatives = await db.from('roadmap_initiatives').select('*').order('position').order('created_at');
    if (initiatives.error) throw initiatives.error;
    // Page child records to avoid Supabase's default row cap silently changing totals.
    const votes: { initiative_id: string; user_id: string; choice: string }[] = [];
    const comments: { initiative_id: string }[] = [];
    for (let offset = 0; ; offset += 1000) {
      const result = await db.from('roadmap_votes').select('*').order('initiative_id').order('user_id').range(offset, offset + 999);
      if (result.error) throw result.error;
      votes.push(...(result.data || []));
      if ((result.data || []).length < 1000) break;
    }
    for (let offset = 0; ; offset += 1000) {
      const result = await db.from('roadmap_comments').select('initiative_id').order('id').range(offset, offset + 999);
      if (result.error) throw result.error;
      comments.push(...(result.data || []));
      if ((result.data || []).length < 1000) break;
    }
    return NextResponse.json({ data: (initiatives.data || []).map(i => ({ ...i,
      yes_count: votes.filter(v => v.initiative_id === i.id && v.choice === 'yes').length,
      no_count: votes.filter(v => v.initiative_id === i.id && v.choice === 'no').length,
      my_vote: votes.find(v => v.initiative_id === i.id && v.user_id === user.id)?.choice || null,
      comment_count: comments.filter(c => c.initiative_id === i.id).length,
    })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const db = getAdminClient();
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!isStaff(user)) return NextResponse.json({ error: 'Solo el equipo interno puede participar.' }, { status: 403 });
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
    const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
    if (body.action === 'create') {
      if (!text(body.title, 160) || !text(body.description, 8000) || !text(body.outcome, 4000) || !text(body.scope, 8000)) {
        return NextResponse.json({ error: 'Completa título, problema, resultado y plan dentro de los límites.' }, { status: 400 });
      }
      const result = await db.from('roadmap_initiatives').insert({ title: body.title.trim(), description: body.description.trim(), outcome: body.outcome.trim(), scope: body.scope.trim(), author_id: user.id });
      if (result.error) throw result.error;
      return NextResponse.json({ success: true }, { status: 201 });
    }
    if (typeof body.id !== 'string' || !uuid.test(body.id)) return NextResponse.json({ error: 'Propuesta inválida' }, { status: 400 });
    const initiative = await db.from('roadmap_initiatives').select('id').eq('id', body.id).maybeSingle();
    if (initiative.error) throw initiative.error;
    if (!initiative.data) return NextResponse.json({ error: 'La propuesta ya no existe.' }, { status: 404 });
    if (body.action === 'vote') {
      if (body.choice !== null && body.choice !== 'yes' && body.choice !== 'no') return NextResponse.json({ error: 'Voto inválido' }, { status: 400 });
      // Explicit desired state makes retries safe; switching is one atomic upsert.
      const result = body.choice === null
        ? await db.from('roadmap_votes').delete().eq('initiative_id', body.id).eq('user_id', user.id)
        : await db.from('roadmap_votes').upsert({ initiative_id: body.id, user_id: user.id, choice: body.choice }, { onConflict: 'initiative_id,user_id' });
      if (result.error) throw result.error;
    } else if (body.action === 'status') {
      if (user.role !== 'admin') return NextResponse.json({ error: 'Solo administración puede cambiar el estado.' }, { status: 403 });
      if (typeof body.status !== 'string' || !Object.hasOwn(ROADMAP_STATUSES, body.status)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
      const result = await db.from('roadmap_initiatives').update({ status: body.status }).eq('id', body.id);
      if (result.error) throw result.error;
    } else if (body.action === 'comment') {
      if (!text(body.content, 4000)) return NextResponse.json({ error: 'Escribe un comentario de hasta 4000 caracteres.' }, { status: 400 });
      const result = await db.from('roadmap_comments').insert({ initiative_id: body.id, author_id: user.id, content: body.content.trim() });
      if (result.error) throw result.error;
    } else if (body.action === 'edit_comment' || body.action === 'delete_comment') {
      if (typeof body.comment_id !== 'string' || !uuid.test(body.comment_id)) return NextResponse.json({ error: 'Comentario inválido' }, { status: 400 });
      const comment = await db.from('roadmap_comments').select('author_id').eq('id', body.comment_id).eq('initiative_id', body.id).maybeSingle();
      if (comment.error) throw comment.error;
      if (!comment.data) return NextResponse.json({ error: 'Comentario no encontrado' }, { status: 404 });
      if (comment.data.author_id !== user.id && !(body.action === 'delete_comment' && user.role === 'admin')) return NextResponse.json({ error: 'Sin permiso para modificar este comentario.' }, { status: 403 });
      if (body.action === 'edit_comment' && !text(body.content, 4000)) return NextResponse.json({ error: 'Escribe entre 1 y 4000 caracteres.' }, { status: 400 });
      const result = body.action === 'delete_comment'
        ? await db.from('roadmap_comments').delete().eq('id', body.comment_id).eq('initiative_id', body.id)
        : await db.from('roadmap_comments').update({ content: body.content.trim(), updated_at: new Date().toISOString() }).eq('id', body.comment_id).eq('initiative_id', body.id);
      if (result.error) throw result.error;
    } else return NextResponse.json({ error: 'Acción inválida' }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) { return failure(error); }
}
