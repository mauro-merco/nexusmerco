import { calendarHref } from '@/lib/calendar-routes';
import { NextResponse } from 'next/server';
import { getAdminClient, getRequestUser, canAccessClient } from '@/lib/api-security';

const db = getAdminClient();

type ResultType = 'client' | 'user' | 'document' | 'task' | 'task_comment' | 'social_idea' | 'ads_idea' | 'social_comment' | 'ads_comment' | 'calendar_comment' | 'suggestion' | 'suggestion_comment' | 'sala_message';
interface SearchResult { type: ResultType; id: string; label: string; sublabel: string; href: string }

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100);
    if (q.length < 2) return NextResponse.json({ data: [] });
    // Escape LIKE wildcards and PostgREST's OR syntax before composing filters.
    const term = q.replace(/[%_\\]/g, '\\$&').replace(/[(),.]/g, ' ');
    const like = `%${term}%`;
    const results: SearchResult[] = [];
    const add = (type: ResultType, id: string, label: string, sublabel: string, href: string) => {
      results.push({ type, id, label: label.slice(0, 130), sublabel, href });
    };
    const excerpt = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 110);

    const [{ data: clients }, { data: shares }, { data: memberships }, { data: rooms }] = await Promise.all([
      db.from('clients').select('id, name, industry, social_calendar_enabled, ads_calendar_enabled').limit(500),
      db.from('document_shares').select('document_id').eq('user_id', user.id),
      db.from('sala_members').select('sala_id').eq('user_id', user.id),
      db.from('salas').select('id, name, visibility').eq('archived', false),
    ]);
    const accessible = (clients || []).filter(c => canAccessClient(user, c.id));
    const clientMap = new Map(accessible.map(c => [c.id, c]));
    const clientIds = [...clientMap.keys()];
    const memberIds = new Set((memberships || []).map(m => m.sala_id));
    const visibleRooms = (rooms || []).filter(r => r.visibility === 'publica' || memberIds.has(r.id) || user.role === 'admin' || user.role === 'operador');
    const roomMap = new Map(visibleRooms.map(r => [r.id, r.name]));

    for (const c of accessible.filter(c => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)) {
      add('client', c.id, c.name, c.industry || 'Cliente', `/dashboard?client=${c.id}`);
    }

    const sharedIds = (shares || []).map(s => s.document_id);
    const [usersRes, docsRes, suggestionsRes, suggestionCommentsRes, salaRes] = await Promise.all([
      db.from('users').select('id, full_name, email, is_public').eq('app_id', 'nexus').or(`full_name.ilike.${like},email.ilike.${like}`).limit(12),
      db.from('documents').select('id, title, owner_id, is_public').ilike('title', like).limit(40),
      db.from('suggestions').select('id, title, content, type').or(`title.ilike.${like},content.ilike.${like}`).limit(8),
      db.from('suggestion_comments').select('id, content, suggestion_id').ilike('content', like).limit(8),
      visibleRooms.length ? db.from('sala_messages').select('id, sala_id, content').in('sala_id', [...roomMap.keys()]).ilike('content', like).limit(8) : Promise.resolve({ data: [] }),
    ]);
    for (const u of usersRes.data || []) {
      if (u.is_public === false && u.id !== user.id) continue;
      add('user', u.id, u.full_name || u.email, u.email || 'Usuario', `/u/${u.id}`);
    }
    for (const d of docsRes.data || []) {
      if (d.owner_id !== user.id && !sharedIds.includes(d.id)) continue;
      add('document', d.id, d.title || 'Sin título', 'Documento', `/documentos?doc=${d.id}`);
    }
    for (const s of suggestionsRes.data || []) add('suggestion', s.id, s.title || excerpt(s.content), s.type === 'bug' ? 'Bug' : 'Sugerencia', `/sugerencias?s=${s.id}`);
    for (const c of suggestionCommentsRes.data || []) add('suggestion_comment', c.id, excerpt(c.content), 'Comentario en sugerencia', `/sugerencias?s=${c.suggestion_id}`);
    for (const m of salaRes.data || []) add('sala_message', m.id, excerpt(m.content), `Sala · ${roomMap.get(m.sala_id)}`, `/salas?sala=${m.sala_id}`);

    if (clientIds.length) {
      const [tasksRes, socialRes, adsRes, taskCommentsRes, socialCommentsRes, adsCommentsRes, calendarCommentsRes] = await Promise.all([
        db.from('tasks').select('id, title, description, client_id').in('client_id', clientIds).or(`title.ilike.${like},description.ilike.${like}`).limit(12),
        db.from('social_ideas').select('id, title, description, client_id, publish_date').in('client_id', clientIds).or(`title.ilike.${like},description.ilike.${like}`).limit(10),
        db.from('ads_ideas').select('id, title, description, brief, copy_text, client_id, publish_date').in('client_id', clientIds).or(`title.ilike.${like},description.ilike.${like},brief.ilike.${like},copy_text.ilike.${like}`).limit(10),
        db.from('task_comments').select('id, task_id, content, tasks!inner(client_id, title)').ilike('content', like).in('tasks.client_id', clientIds).limit(10),
        db.from('social_comments').select('id, idea_id, content, social_ideas!inner(client_id, title, publish_date)').ilike('content', like).in('social_ideas.client_id', clientIds).limit(10),
        db.from('ads_comments').select('id, idea_id, content, ads_ideas!inner(client_id, title, publish_date)').ilike('content', like).in('ads_ideas.client_id', clientIds).limit(10),
        db.from('calendar_comments').select('id, client_id, calendar_type, month, content').in('client_id', clientIds).ilike('content', like).limit(10),
      ]);
      const calendarUrl = (clientId: string, date: string, ideaId: string) => calendarHref(clientId, { month: date.slice(0, 7), idea: ideaId });
      const taskUrl = (id: string, clientId: string) => user.role === 'client' ? calendarHref(clientId) : `/operations?task=${id}`;
      for (const t of tasksRes.data || []) add('task', t.id, t.title, clientMap.get(t.client_id)?.name || 'Tarea', taskUrl(t.id, t.client_id));
      for (const i of socialRes.data || []) {
        if (clientMap.get(i.client_id)?.social_calendar_enabled) add('social_idea', i.id, i.title, `Redes · ${clientMap.get(i.client_id)?.name}`, calendarUrl(i.client_id, i.publish_date, i.id));
      }
      for (const i of adsRes.data || []) {
        if (clientMap.get(i.client_id)?.ads_calendar_enabled) add('ads_idea', i.id, i.title, `ADS · ${clientMap.get(i.client_id)?.name}`, calendarUrl(i.client_id, i.publish_date, i.id));
      }
      for (const c of taskCommentsRes.data || []) {
        const task = c.tasks as unknown as { client_id: string; title: string };
        add('task_comment', c.id, excerpt(c.content), `Comentario en tarea · ${task.title}`, taskUrl(c.task_id, task.client_id));
      }
      for (const c of socialCommentsRes.data || []) {
        const idea = c.social_ideas as unknown as { client_id: string; title: string; publish_date: string };
        if (clientMap.get(idea.client_id)?.social_calendar_enabled) add('social_comment', c.id, excerpt(c.content), `Comentario en Redes · ${idea.title}`, calendarUrl(idea.client_id, idea.publish_date, c.idea_id));
      }
      for (const c of adsCommentsRes.data || []) {
        const idea = c.ads_ideas as unknown as { client_id: string; title: string; publish_date: string };
        if (clientMap.get(idea.client_id)?.ads_calendar_enabled) add('ads_comment', c.id, excerpt(c.content), `Comentario en ADS · ${idea.title}`, calendarUrl(idea.client_id, idea.publish_date, c.idea_id));
      }
      for (const c of calendarCommentsRes.data || []) {
        const client = clientMap.get(c.client_id);
        if (c.calendar_type === 'social' && !client?.social_calendar_enabled) continue;
        if (c.calendar_type === 'ads' && !client?.ads_calendar_enabled) continue;
        add('calendar_comment', c.id, excerpt(c.content), `Comentario en calendario · ${client?.name}`, calendarHref(c.client_id, { month: c.month }));
      }
    }
    return NextResponse.json({ data: results });
  } catch (e) {
    console.error('GET /api/search error:', e);
    return NextResponse.json({ error: 'No se pudo completar la búsqueda' }, { status: 500 });
  }
}
