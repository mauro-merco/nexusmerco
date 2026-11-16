'use client';

import { useEffect, useRef, useState } from 'react';
import { Route, Plus, ThumbsUp, ThumbsDown, MessageSquare, RefreshCw, Lightbulb, Rocket, CircleCheck, Vote, Search, Target, ArrowUpRight, ListOrdered, Send } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ROADMAP_STATUSES, type RoadmapInitiative, type RoadmapComment } from '@/lib/roadmap';
import { roadmapTheme, ROADMAP_STATUS_VISUALS } from '@/lib/roadmap-visuals';

const field = 'w-full rounded-xl border bg-background px-3 py-2 text-base sm:text-sm';
const emptyDraft = { title: '', description: '', outcome: '', scope: '' };

export default function RoadmapPage() {
  const { user, token } = useAuthStore();
  const staff = user?.role === 'admin' || user?.role === 'operador';
  const [items, setItems] = useState<RoadmapInitiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [comments, setComments] = useState<RoadmapComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recommended');
  const active = items.find(i => i.id === selected);
  const activeTheme = roadmapTheme(active?.title || '');
  const ActiveIcon = activeTheme.icon;
  const activeStatus = ROADMAP_STATUS_VISUALS[active?.status || 'propuesta'];
  const ActiveStatusIcon = activeStatus.icon;
  const commentRequest = useRef(0);

  async function api(query = '', body?: Record<string, unknown>) {
    const response = await fetch(`/api/roadmap${query}`, {
      method: body ? 'POST' : 'GET', cache: 'no-store',
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'No se pudo completar la operación.');
    return json;
  }

  async function refresh() {
    try { const result = await api(); setItems(result.data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo cargar la hoja de ruta.'); }
    finally { setLoading(false); }
  }

  async function loadComments(id: string) {
    const sequence = ++commentRequest.current;
    setCommentsLoading(true); setCommentError('');
    try {
      const result = await api(`?id=${id}`);
      if (sequence === commentRequest.current) setComments(result.data);
    } catch (e) {
      if (sequence === commentRequest.current) setCommentError(e instanceof Error ? e.message : 'No se pudieron cargar los comentarios.');
    } finally { if (sequence === commentRequest.current) setCommentsLoading(false); }
  }

  useEffect(() => {
    if (!staff || !token) { setLoading(false); return; }
    let live = true;
    const load = async () => {
      try {
        const response = await fetch('/api/roadmap', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'No se pudo cargar la hoja de ruta.');
        if (live) { setItems(json.data); setError(''); }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : 'Error de conexión.'); }
      finally { if (live) setLoading(false); }
    };
    setLoading(true);
    void load();
    const timer = window.setInterval(load, 30000);
    window.addEventListener('focus', load);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener('focus', load); };
  }, [staff, token]);

  useEffect(() => {
    if (!selected || !staff || !token) return;
    setComments([]); setComment(''); setEditing(null);
    void loadComments(selected);
    const timer = window.setInterval(() => { void loadComments(selected); }, 30000);
    return () => { ++commentRequest.current; window.clearInterval(timer); };
    // A selection or authentication change starts a fresh comment feed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, staff, token]);

  async function mutate(body: Record<string, unknown>, after?: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await api('', body);
      after?.();
      await refresh();
      if (selected) await loadComments(selected);
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { lock.current = false; setBusy(false); }
  }

  function votes(item: RoadmapInitiative) {
    return <div className="flex flex-wrap items-center gap-2 rounded-full bg-muted/40 p-1" role="group" aria-label={`Votos para ${item.title}`}>
      {(['yes', 'no'] as const).map(choice => {
        const yes = choice === 'yes';
        const Icon = yes ? ThumbsUp : ThumbsDown;
        return <Button key={choice} variant="outline" disabled={busy} aria-pressed={item.my_vote === choice}
          aria-label={`${yes ? 'Sí' : 'No'} a ${item.title}. ${yes ? item.yes_count : item.no_count} votos${item.my_vote === choice ? '. Tu voto, pulsa para retirarlo' : ''}`}
          className={`rounded-full shadow-none ${yes ? 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-300'} ${item.my_vote === choice ? 'ring-2 ring-current ring-offset-2 ring-offset-card' : ''}`}
          onClick={() => void mutate({ action: 'vote', id: item.id, choice: item.my_vote === choice ? null : choice })}>
          <Icon className="size-4" />{yes ? 'Sí' : 'No'} <span className="ml-1 min-w-6 rounded-full bg-card/70 px-1.5 py-0.5 text-xs font-semibold tabular-nums">{yes ? item.yes_count : item.no_count}</span>
        </Button>;
      })}
    </div>;
  }

  if (!staff) return <div className="p-6"><h1 className="text-2xl font-semibold">Hoja de ruta</h1><p className="mt-3 text-muted-foreground">Esta planificación es exclusiva del equipo interno.</p></div>;
  const visible = items.filter(i => (status === 'all' || i.status === status) && `${i.title} ${i.description} ${i.scope}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
    .sort((a, b) => (sort === 'yes' ? b.yes_count - a.yes_count : sort === 'balance' ? (b.yes_count - b.no_count) - (a.yes_count - a.no_count) : 0) || a.position - b.position);

  return <div className="w-full min-w-0 space-y-6 py-6 md:py-10">
    <header className="bg-brand-sky-gradient flex flex-wrap items-center justify-between gap-6 rounded-[1.6rem] p-6 md:p-8">
      <div className="min-w-0 max-w-2xl space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 text-xs font-semibold"><Route className="size-4" /> PLANIFICACIÓN INTERNA</span>
        <h1 className="text-3xl font-semibold tracking-tight">Hoja de ruta</h1>
        <p className="text-sm leading-relaxed text-[#0B1B33]/80">Decidamos qué sigue. Vota las mejoras y suma contexto con el equipo. El orden es sugerido: no implica compromiso ni fecha de entrega.</p>
      </div>
      <Button onClick={() => setCreating(true)} className="rounded-full bg-[#111827] text-white hover:bg-[#1e293b]"><Plus className="size-4" /> Proponer mejora</Button>
    </header>
    <section aria-label="Resumen de la hoja de ruta" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ label: 'Propuestas', count: items.length, icon: Lightbulb, tint: 'bg-tint-blue text-tint-blue-foreground' }, { label: 'Tus decisiones', count: items.filter(i => i.my_vote).length, icon: Vote, tint: 'bg-tint-amber text-tint-amber-foreground' }, { label: 'Planificadas / en curso', count: items.filter(i => i.status === 'planificada' || i.status === 'en_curso').length, icon: Rocket, tint: 'bg-tint-sky text-tint-sky-foreground' }, { label: 'Completadas', count: items.filter(i => i.status === 'completada').length, icon: CircleCheck, tint: 'bg-tint-teal text-tint-teal-foreground' }].map(({ label, count, icon: Icon, tint }) =>
        <div key={label} className="min-w-0 rounded-[1.6rem] border bg-card p-4 sm:p-5"><span className={`mb-3 flex size-9 items-center justify-center rounded-xl ${tint}`}><Icon className="size-4" /></span><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-3xl font-semibold tabular-nums">{loading || error ? '...' : count}</p></div>)}
    </section>
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-2xl border bg-card p-3">
      <div className="relative w-full min-w-0 sm:w-auto sm:flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><input aria-label="Buscar propuestas" placeholder="Buscar una mejora..." value={search} onChange={e => setSearch(e.target.value)} className={`${field} pl-9`} /></div>
      <select aria-label="Filtrar por estado" className={`${field} rounded-full bg-[#111827] text-white sm:w-auto`} value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos los estados</option>{Object.entries(ROADMAP_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <select aria-label="Ordenar propuestas" className={`${field} sm:w-auto`} value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Orden sugerido</option><option value="yes">Más votos Sí</option><option value="balance">Balance Sí menos No</option></select>
      <Button variant="outline" className="rounded-full" disabled={busy || loading} onClick={() => void refresh()}><RefreshCw className="size-4" /> Actualizar</Button>
    </div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    {loading ? <p role="status" className="py-12 text-center text-muted-foreground">Cargando propuestas del equipo...</p> : !visible.length && !error ? <div className="rounded-[1.6rem] border border-dashed bg-card p-8 text-center"><Search className="mx-auto mb-3 size-8 text-primary" /><h2 className="font-semibold">{items.length ? 'Sin coincidencias' : 'La próxima mejora empieza acá'}</h2><p className="mt-2 text-sm text-muted-foreground">{items.length ? 'Prueba otra búsqueda o cambia el estado seleccionado.' : 'Comparte una propuesta para decidir juntos qué sigue.'}</p>{!!items.length && <Button variant="outline" className="mt-4 rounded-full" onClick={() => { setSearch(''); setStatus('all'); }}>Limpiar filtros</Button>}</div> : <section className="grid gap-4 lg:grid-cols-2" aria-label="Propuestas">
      {visible.map(item => { const theme = roadmapTheme(item.title); const Icon = theme.icon; const state = ROADMAP_STATUS_VISUALS[item.status]; const StatusIcon = state.icon; return <article key={item.id} className="relative flex min-w-0 flex-col overflow-hidden rounded-[1.6rem] border bg-card p-5 sm:p-6">
        <div aria-hidden="true" className={`absolute inset-x-6 top-0 h-1 rounded-b-full ${theme.line}`} />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs"><span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground"><ListOrdered className="size-3.5" />{item.position < 100 ? `Orden sugerido ${item.position.toString().padStart(2, '0')}` : 'Propuesta del equipo'}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${state.tint}`}><StatusIcon className="size-3.5" />{ROADMAP_STATUSES[item.status]}</span></div>
        <div className="mb-3 flex items-center gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${theme.tint}`}><Icon className="size-5" /></span><span className="text-xs font-medium text-muted-foreground">{theme.label}</span></div>
        <button type="button" className="text-left text-xl font-semibold hover:text-primary [overflow-wrap:anywhere]" onClick={() => setSelected(item.id)}>{item.title}</button>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">{item.description}</p>
        <div className="my-5 rounded-2xl bg-surface-inset p-4"><p className="flex items-center gap-2 text-xs font-semibold text-primary"><Target className="size-4" />Resultado esperado</p><p className="mt-2 text-sm leading-relaxed [overflow-wrap:anywhere]">{item.outcome}</p></div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4">{votes(item)}<Button variant="ghost" onClick={() => setSelected(item.id)} className="max-w-full rounded-full text-primary"><MessageSquare className="size-4" /> Plan y comentarios <span className="rounded-full bg-tint-blue px-2 py-0.5 text-xs tabular-nums text-tint-blue-foreground">{item.comment_count}</span><ArrowUpRight className="size-3.5" /></Button></div>
      </article>; })}
    </section>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.6rem] p-5 sm:max-w-3xl sm:p-7">
        <div className="flex flex-wrap gap-2 pr-8"><div className={`flex w-fit items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium ${activeTheme.tint}`}><ActiveIcon className="size-5" />{activeTheme.label}</div>{active && <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${activeStatus.tint}`}><ActiveStatusIcon className="size-3.5" />{ROADMAP_STATUSES[active.status]}</span>}</div>
        <DialogTitle className="pr-8 text-2xl font-semibold [overflow-wrap:anywhere]">{active?.title || 'Propuesta'}</DialogTitle>
        <DialogDescription>Plan opcional para evaluar. Un voto no aprueba automáticamente su ejecución.</DialogDescription>
        {active && <>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 [overflow-wrap:anywhere]">{[{ label: 'Problema a resolver', text: active.description, icon: Lightbulb }, { label: 'Resultado esperado', text: active.outcome, icon: Target }].map(({ label, text, icon: Icon }) => <section key={label} className="min-w-0 rounded-2xl bg-surface-inset p-4"><h2 className="flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 shrink-0 text-primary" />{label}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{text}</p></section>)}</div>
          <section className="min-w-0 rounded-2xl border p-4 [overflow-wrap:anywhere]">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><ListOrdered className="size-4 text-primary" />Plan ejecutable y criterio de cierre</h2>
            <p className="mt-1 text-xs text-muted-foreground">Secuencia propuesta, no tareas completadas.</p>
            <ol className="mt-4 space-y-0">{active.scope.split(/\s+(?=Primero:|Luego:|Listo cuando|Automatizaciones solo|Avanzar por)/).filter(step => step.trim()).map((step, index, steps) => <li key={index} className="relative flex min-w-0 gap-3 pb-4 last:pb-0">
              {index < steps.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-3.5 top-7 w-px bg-border" />}
              <span className={`relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${activeTheme.tint}`}>{index + 1}</span><p className="min-w-0 pt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{step}</p>
            </li>)}</ol>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4">{votes(active)}{user?.role === 'admin' ? <label className="space-y-1 text-xs">Estado de planificación<select aria-label="Estado de planificación" className={field} disabled={busy} value={active.status} onChange={e => void mutate({ action: 'status', id: active.id, status: e.target.value })}>{Object.entries(ROADMAP_STATUSES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label> : <span className="text-sm">{ROADMAP_STATUSES[active.status]}</span>}</div>
          <p className="text-xs text-muted-foreground">Puedes cambiar tu voto o pulsarlo otra vez para retirarlo. Los votos orientan la decisión; administración define el estado.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <section className="min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4 text-primary" />Conversación del equipo<span className="rounded-full bg-tint-blue px-2 py-0.5 text-xs tabular-nums text-tint-blue-foreground">{active.comment_count}</span></h2><Button variant="ghost" disabled={commentsLoading} onClick={() => void loadComments(active.id)}>Actualizar</Button></div>
            {commentError ? <p role="alert" className="text-destructive">{commentError}</p> : commentsLoading && !comments.length ? <p role="status">Cargando comentarios...</p> : !comments.length ? <p className="text-sm text-muted-foreground">Todavía no hay comentarios. ¿Qué necesitaríamos para llevar este plan adelante?</p> : null}
            {comments.map(c => <article key={c.id} className="min-w-0 rounded-2xl border bg-card p-4">
              <div className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint-blue text-xs font-semibold text-tint-blue-foreground">{c.author_name.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join('').toLocaleUpperCase() || '?'}</span><div className="min-w-0"><p className="text-sm font-semibold [overflow-wrap:anywhere]">{c.author_name}</p><p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString('es-AR')}{c.updated_at !== c.created_at ? ' · editado' : ''}</p></div></div>
              {editing === c.id ? <div className="mt-3 space-y-2"><textarea aria-label="Editar comentario" className={field} value={editText} maxLength={4000} onChange={e => setEditText(e.target.value)} /><div className="flex gap-2"><Button disabled={busy || !editText.trim()} onClick={() => void mutate({ action: 'edit_comment', id: active.id, comment_id: c.id, content: editText }, () => setEditing(null))}>Guardar</Button><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button></div></div> : <p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{c.content}</p>}
              <div className="mt-2 flex gap-2">{c.author_id === user?.id && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { setEditing(c.id); setEditText(c.content); }}>Editar</Button>}{(c.author_id === user?.id || user?.role === 'admin') && <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm('¿Eliminar este comentario?')) void mutate({ action: 'delete_comment', id: active.id, comment_id: c.id }); }}>Eliminar</Button>}</div>
            </article>)}
          </section>
          <form className="space-y-2 rounded-2xl bg-surface-inset p-4" onSubmit={e => { e.preventDefault(); void mutate({ action: 'comment', id: active.id, content: comment }, () => setComment('')); }}><label htmlFor="roadmap-comment" className="text-sm font-medium">Tu comentario</label><textarea id="roadmap-comment" className={field} rows={3} maxLength={4000} required value={comment} onChange={e => setComment(e.target.value)} placeholder="Aporta necesidades, dudas o condiciones para implementar esta mejora." /><Button type="submit" disabled={busy || !comment.trim()} className="rounded-full"><Send className="size-4" />Enviar comentario</Button></form>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={creating} onOpenChange={setCreating}><DialogContent className="max-h-[90dvh] overflow-y-auto rounded-[1.6rem] sm:max-w-2xl">
      <DialogTitle className="text-xl font-semibold">Proponer una mejora</DialogTitle><DialogDescription>Explica qué resolver, cómo empezar y cuándo considerar el plan terminado.</DialogDescription>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); void mutate({ action: 'create', ...draft }, () => { setCreating(false); setDraft(emptyDraft); }); }}>
        {([['title', 'Título', 160], ['description', 'Problema a resolver', 8000], ['outcome', 'Resultado esperado', 4000], ['scope', 'Pasos y criterio de cierre', 8000]] as const).map(([key, label, max]) => <label key={key} className="block space-y-1 text-sm font-medium"><span>{label}</span>{key === 'title' ? <input className={field} required maxLength={max} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /> : <textarea className={field} rows={3} required maxLength={max} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} />}</label>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || Object.values(draft).some(value => !value.trim())} className="rounded-full">Publicar propuesta</Button>
      </form>
    </DialogContent></Dialog>
  </div>;
}
