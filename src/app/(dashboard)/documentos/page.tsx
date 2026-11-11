'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ContentSkeleton } from '@/components/content-skeleton';
import { NoAccess } from '@/components/no-access';
import { DocumentModal } from '@/components/document-modal';
import { Popover, Menu, type MenuOption } from '@/components/task-ui';
import { useDocuments } from '@/lib/hooks/use-documents';
import { hasModuleAccess } from '@/lib/permissions';
import {
  DOC_KIND_CONFIG, DOC_KINDS, DOC_STATUS_CONFIG, DOC_STATUSES, DOC_TEMPLATES, NOTE_COLORS,
  docKind, docStatus, tagClass,
} from '@/lib/document-config';
import type { NexusDocument, DocumentKind } from '@/lib/types';
import {
  Plus, Search, LayoutGrid, Rows3, StickyNote, Star, Clock, User, Users, Archive, Files, Building2,
  MessageSquare, Link2, Globe, X, Loader2, ChevronDown, Lock,
} from 'lucide-react';

type View = 'all' | 'recent' | 'favorites' | 'mine' | 'shared' | 'archived';
type Layout = 'table' | 'cards' | 'board';
type SortKey = 'updated' | 'viewed' | 'title';

const VIEWS: { key: View; label: string; icon: typeof Files }[] = [
  { key: 'all', label: 'Todos', icon: Files },
  { key: 'recent', label: 'Vistos recientemente', icon: Clock },
  { key: 'favorites', label: 'Favoritos', icon: Star },
  { key: 'mine', label: 'Mis documentos', icon: User },
  { key: 'shared', label: 'Compartidos conmigo', icon: Users },
  { key: 'archived', label: 'Archivados', icon: Archive },
];

const SORT_OPTIONS: MenuOption[] = [
  { key: 'updated', label: 'Última edición' },
  { key: 'viewed', label: 'Visto por mí' },
  { key: 'title', label: 'Nombre (A-Z)' },
];

const STATUS_FILTER: MenuOption[] = [
  { key: '', label: 'Todos los estados' },
  ...DOC_STATUSES.map(s => ({ key: s, label: DOC_STATUS_CONFIG[s].label, dot: DOC_STATUS_CONFIG[s].dot })),
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function shortDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 86400000;
  if (diff < 1 && d.getDate() === new Date().getDate()) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', ...(diff > 300 ? { year: 'numeric' } : {}) });
}

function readPref<T extends string>(key: string, fallback: T): T {
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
}
function writePref(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* sin storage */ }
}

export default function DocumentosPage() {
  const { user } = useAuthStore();
  if (!hasModuleAccess(user, 'documentos')) {
    return <NoAccess message="No tienes permiso para acceder a los documentos." />;
  }
  return <DocumentsHub />;
}

function DocumentsHub() {
  const { user } = useAuthStore();
  const { documents, loading, error, createDocument, updateDocument, refetch, patchLocal, removeLocal } = useDocuments();

  const [view, setView] = useState<View>('all');
  const [kind, setKind] = useState<DocumentKind | ''>('');
  const [clientFilter, setClientFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<Layout>('table');
  const [sort, setSort] = useState<SortKey>('updated');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Preferencias + parámetros de URL (?doc= abre un documento, ?client= filtra)
  useEffect(() => {
    setLayout(readPref<Layout>('nexus-docs-layout', 'table'));
    const qs = new URLSearchParams(window.location.search);
    const doc = qs.get('doc'); if (doc) setOpenId(doc);
    const client = qs.get('client'); if (client) setClientFilter(client);
    const k = qs.get('tipo'); if (k && (DOC_KINDS as string[]).includes(k)) setKind(k as DocumentKind);
  }, []);

  const changeLayout = (l: Layout) => { setLayout(l); writePref('nexus-docs-layout', l); };

  const openDoc = useCallback((id: string | null) => {
    setOpenId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('doc', id); else url.searchParams.delete('doc');
    window.history.replaceState(null, '', url.pathname + (url.search || ''));
  }, []);

  /* ---------- Conteos para la barra lateral ---------- */
  const active = useMemo(() => documents.filter(d => !d.archived_at), [documents]);
  const counts = useMemo(() => ({
    all: active.length,
    recent: active.filter(d => d.last_viewed_at).length,
    favorites: active.filter(d => d.is_favorite).length,
    mine: active.filter(d => d.owner_id === user?.id).length,
    shared: active.filter(d => d.is_shared_with_me).length,
    archived: documents.length - active.length,
  }), [documents, active, user?.id]);

  const kindCounts = useMemo(() => Object.fromEntries(DOC_KINDS.map(k => [k, active.filter(d => (d.kind || 'documento') === k).length])), [active]);

  const clientsWithDocs = useMemo(() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const d of active) if (d.client) {
      const e = m.get(d.client.id);
      if (e) e.count++; else m.set(d.client.id, { id: d.client.id, name: d.client.name, count: 1 });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [active]);

  const topTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of active) for (const t of d.tags || []) m.set(t, (m.get(t) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  }, [active]);

  /* ---------- Filtro ---------- */
  const filtered = useMemo(() => {
    const q = norm(search.trim());
    let list = view === 'archived' ? documents.filter(d => d.archived_at) : active;
    if (view === 'recent') list = list.filter(d => d.last_viewed_at);
    if (view === 'favorites') list = list.filter(d => d.is_favorite);
    if (view === 'mine') list = list.filter(d => d.owner_id === user?.id);
    if (view === 'shared') list = list.filter(d => d.is_shared_with_me);
    if (kind) list = list.filter(d => (d.kind || 'documento') === kind);
    if (clientFilter) list = list.filter(d => clientFilter === 'none' ? !d.client_id : d.client_id === clientFilter);
    if (tagFilter) list = list.filter(d => (d.tags || []).includes(tagFilter));
    if (statusFilter) list = list.filter(d => (d.status || 'borrador') === statusFilter);
    if (q) list = list.filter(d => norm(`${d.title} ${(d.tags || []).join(' ')} ${d.client?.name || ''} ${d.excerpt || ''}`).includes(q));
    const sorted = [...list];
    const sortBy: SortKey = view === 'recent' ? 'viewed' : sort;
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'es'));
    else if (sortBy === 'viewed') sorted.sort((a, b) => (b.last_viewed_at || '').localeCompare(a.last_viewed_at || ''));
    else sorted.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    // Favoritos primero
    return sorted.sort((a, b) => Number(!!b.is_favorite) - Number(!!a.is_favorite));
  }, [documents, active, view, kind, clientFilter, tagFilter, statusFilter, search, sort, user?.id]);

  const effectiveLayout: Layout = kind === 'nota' && layout === 'table' ? 'board' : layout;

  /* ---------- Acciones ---------- */
  const createFromTemplate = async (key: string, extra: Partial<{ content: string; title: string; color: string }> = {}) => {
    const tpl = DOC_TEMPLATES.find(t => t.key === key) || DOC_TEMPLATES[0];
    setCreating(true); setActionError(null);
    try {
      const doc = await createDocument({
        title: extra.title || tpl.title,
        content: extra.content ?? tpl.content(),
        kind: tpl.kind,
        tags: tpl.tags,
        icon: tpl.key === 'blank' || tpl.key === 'note' ? null : tpl.icon,
        color: tpl.kind === 'nota' ? extra.color || NOTE_COLORS[0] : null,
        client_id: clientFilter && clientFilter !== 'none' ? clientFilter : null,
      });
      return doc;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'No se pudo crear');
      return null;
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (d: NexusDocument) => {
    patchLocal(d.id, { is_favorite: !d.is_favorite });
    try { await updateDocument(d.id, { favorite: !d.is_favorite }); }
    catch { patchLocal(d.id, { is_favorite: d.is_favorite }); }
  };

  const clearFilters = () => { setKind(''); setClientFilter(''); setTagFilter(''); setStatusFilter(''); setSearch(''); };
  const hasFilters = !!(kind || clientFilter || tagFilter || statusFilter || search);
  const clientName = clientFilter === 'none' ? 'Sin cliente' : clientsWithDocs.find(c => c.id === clientFilter)?.name;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Documentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Documentos, notas, reuniones y briefs del equipo. Vinculalos a clientes y tareas.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 md:w-80 md:flex-none">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en títulos, contenido y etiquetas…"
              className="h-10 w-full rounded-full border border-border bg-card pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <NewMenu creating={creating} onPick={async key => { const d = await createFromTemplate(key); if (d) openDoc(d.id); }} />
        </div>
      </div>

      {(error || actionError) && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error || actionError}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Barra lateral */}
        <aside className="space-y-3">
          <nav className="no-scrollbar flex gap-1 overflow-x-auto rounded-[1.4rem] border border-border bg-card p-2 lg:flex-col lg:overflow-visible">
            {VIEWS.map(v => {
              const Icon = v.icon;
              const on = view === v.key;
              return (
                <button key={v.key} type="button" onClick={() => setView(v.key)}
                  className={cn('flex shrink-0 items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] font-medium transition-colors',
                    on ? 'bg-brand-gradient shadow-brand' : 'text-foreground/75 hover:bg-muted hover:text-foreground')}>
                  <Icon className="h-4 w-4" />
                  <span className="flex-1 whitespace-nowrap">{v.label}</span>
                  <span className={cn('text-[11px]', on ? 'text-white/80' : 'text-muted-foreground')}>{counts[v.key]}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden space-y-3 lg:block">
            <SideSection title="Tipo">
              {DOC_KINDS.map(k => {
                const c = DOC_KIND_CONFIG[k]; const Icon = c.icon; const on = kind === k;
                return (
                  <button key={k} type="button" onClick={() => setKind(on ? '' : k)}
                    className={cn('flex w-full items-center gap-2.5 rounded-full px-3 py-1.5 text-left text-[13px] transition-colors', on ? 'bg-muted font-semibold' : 'text-foreground/75 hover:bg-muted')}>
                    <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', c.bgClass, c.colorClass)}><Icon className="h-3.5 w-3.5" /></span>
                    <span className="flex-1">{c.plural}</span>
                    <span className="text-[11px] text-muted-foreground">{kindCounts[k]}</span>
                  </button>
                );
              })}
            </SideSection>

            {clientsWithDocs.length > 0 && (
              <SideSection title="Clientes">
                <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1 sidebar-scroll">
                  {clientsWithDocs.map(c => (
                    <button key={c.id} type="button" onClick={() => setClientFilter(clientFilter === c.id ? '' : c.id)}
                      className={cn('flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-[13px] transition-colors', clientFilter === c.id ? 'bg-muted font-semibold' : 'text-foreground/75 hover:bg-muted')}>
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground">{c.count}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setClientFilter(clientFilter === 'none' ? '' : 'none')}
                    className={cn('flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-left text-[13px] transition-colors', clientFilter === 'none' ? 'bg-muted font-semibold' : 'text-foreground/75 hover:bg-muted')}>
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /><span className="flex-1">Sin cliente</span>
                  </button>
                </div>
              </SideSection>
            )}

            {topTags.length > 0 && (
              <SideSection title="Etiquetas">
                <div className="flex flex-wrap gap-1.5 px-1">
                  {topTags.map(([t, n]) => (
                    <button key={t} type="button" onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                      className={cn('rounded-full px-2.5 py-1 text-xs font-medium transition', tagClass(t), tagFilter === t && 'ring-2 ring-primary/50')}>
                      {t} <span className="opacity-60">{n}</span>
                    </button>
                  ))}
                </div>
              </SideSection>
            )}
          </div>
        </aside>

        {/* Contenido */}
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tipo en móvil */}
            <div className="no-scrollbar flex gap-1 overflow-x-auto lg:hidden">
              {DOC_KINDS.map(k => (
                <button key={k} type="button" onClick={() => setKind(kind === k ? '' : k)}
                  className={cn('shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium', kind === k ? 'bg-foreground text-background' : 'bg-card')}>
                  {DOC_KIND_CONFIG[k].plural}
                </button>
              ))}
            </div>
            <div className="w-[170px]"><Menu value={statusFilter} options={STATUS_FILTER} onChange={setStatusFilter} className="h-9 rounded-full border border-border bg-card text-xs" /></div>
            {view !== 'recent' && <div className="w-[160px]"><Menu value={sort} options={SORT_OPTIONS} onChange={k => setSort(k as SortKey)} className="h-9 rounded-full border border-border bg-card text-xs" /></div>}
            {kind && <FilterChip label={DOC_KIND_CONFIG[kind].plural} onClear={() => setKind('')} />}
            {clientName && <FilterChip label={clientName} onClear={() => setClientFilter('')} />}
            {tagFilter && <FilterChip label={`#${tagFilter}`} onClear={() => setTagFilter('')} />}
            {hasFilters && <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar filtros</button>}
            <div className="ml-auto flex rounded-full border border-border bg-card p-1">
              {([['table', Rows3, 'Tabla'], ['cards', LayoutGrid, 'Tarjetas'], ['board', StickyNote, 'Pizarra']] as const).map(([k, Icon, label]) => (
                <button key={k} type="button" title={label} onClick={() => changeLayout(k)}
                  className={cn('flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors', effectiveLayout === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {(effectiveLayout === 'board' || kind === 'nota') && view !== 'archived' && (
            <QuickNote creating={creating} onCreate={async (text, color) => {
              const [first, ...rest] = text.split('\n');
              const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
              const body = rest.join('\n').trim();
              await createFromTemplate('note', {
                title: first.slice(0, 120) || 'Nota',
                content: body ? `<p>${esc(body).replace(/\n/g, '<br>')}</p>` : '',
                color,
              });
            }} />
          )}

          {loading && documents.length === 0 ? <ContentSkeleton variant="cards" /> : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[1.6rem] border border-dashed border-border bg-card py-16 text-center">
              <Files className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">{hasFilters || view !== 'all' ? 'No hay documentos con estos filtros' : 'Todavía no hay documentos'}</p>
              {hasFilters ? <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar filtros</button>
                : <NewMenu creating={creating} onPick={async key => { const d = await createFromTemplate(key); if (d) openDoc(d.id); }} />}
            </div>
          ) : effectiveLayout === 'table' ? (
            <DocTable docs={filtered} onOpen={openDoc} onFavorite={toggleFavorite} />
          ) : effectiveLayout === 'cards' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map(d => <DocCard key={d.id} doc={d} onOpen={() => openDoc(d.id)} onFavorite={() => toggleFavorite(d)} />)}
            </div>
          ) : (
            <div className="columns-1 gap-3 sm:columns-2 xl:columns-3 2xl:columns-4">
              {filtered.map(d => <NoteCard key={d.id} doc={d} onOpen={() => openDoc(d.id)} onFavorite={() => toggleFavorite(d)} />)}
            </div>
          )}
        </section>
      </div>

      <DocumentModal
        documentId={openId}
        onOpenChange={o => { if (!o) { openDoc(null); refetch(true); } }}
        onChanged={patch => patchLocal(patch.id, patch)}
        onDeleted={id => removeLocal(id)}
      />
    </div>
  );
}

/* ---------------- Piezas ---------------- */

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-border bg-card p-2">
      <p className="px-3 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-tint-blue px-3 py-1.5 text-xs font-medium text-tint-blue-foreground">
      {label}<button type="button" onClick={onClear} className="opacity-70 hover:opacity-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

function NewMenu({ creating, onPick }: { creating: boolean; onPick: (key: string) => void }) {
  return (
    <Popover width={290} trigger={({ toggle, open }) => (
      <button type="button" onClick={toggle} disabled={creating}
        className="bg-brand-gradient shadow-brand flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition hover:brightness-105 disabled:opacity-70">
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nuevo
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-80 transition-transform', open && 'rotate-180')} />
      </button>
    )}>
      {close => (
        <div className="space-y-0.5">
          <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Crear desde plantilla</p>
          {DOC_TEMPLATES.map(t => (
            <button key={t.key} type="button" onClick={() => { close(); onPick(t.key); }}
              className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted">
              <span className="text-lg leading-6">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">{t.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

function StatusPill({ status }: { status?: string | null }) {
  const st = docStatus(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', st.bgClass, st.colorClass)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />{st.label}
    </span>
  );
}

function DocIcon({ doc, size = 'md' }: { doc: NexusDocument; size?: 'sm' | 'md' }) {
  const k = docKind(doc.kind); const KIcon = k.icon;
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', size === 'sm' ? 'h-8 w-8 text-sm' : 'h-10 w-10 text-lg', k.bgClass, k.colorClass)}
      style={doc.kind === 'nota' && doc.color ? { backgroundColor: doc.color, color: '#1e293b' } : undefined}>
      {doc.icon || <KIcon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />}
    </span>
  );
}

function FavButton({ on, onClick, className }: { on?: boolean; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={e => { e.stopPropagation(); onClick(); }} title={on ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      className={cn('rounded-full p-1.5 transition-colors hover:bg-muted', on ? 'text-amber-400' : 'text-muted-foreground/50 hover:text-foreground', className)}>
      <Star className={cn('h-4 w-4', on && 'fill-amber-400')} />
    </button>
  );
}

function Tags({ tags, max = 3 }: { tags?: string[]; max?: number }) {
  if (!tags?.length) return <span className="text-xs text-muted-foreground/50">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.slice(0, max).map(t => <span key={t} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', tagClass(t))}>{t}</span>)}
      {tags.length > max && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">+{tags.length - max}</span>}
    </span>
  );
}

function DocTable({ docs, onOpen, onFavorite }: { docs: NexusDocument[]; onOpen: (id: string) => void; onFavorite: (d: NexusDocument) => void }) {
  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-semibold">Nombre</th>
              <th className="px-3 py-3 font-semibold">Ubicación</th>
              <th className="px-3 py-3 font-semibold">Etiquetas</th>
              <th className="px-3 py-3 font-semibold">Estado</th>
              <th className="px-3 py-3 font-semibold">Actualizado</th>
              <th className="px-3 py-3 font-semibold">Visto</th>
              <th className="px-3 py-3 font-semibold">Compartido</th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {docs.map(d => (
              <tr key={d.id} onClick={() => onOpen(d.id)} className="group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface-inset">
                <td className="max-w-[360px] px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <DocIcon doc={d} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium group-hover:text-primary">{d.title}</p>
                      <p className="flex items-center gap-2 truncate text-[11px] text-muted-foreground">
                        <span>{docKind(d.kind).label}</span>
                        {!!d.comment_count && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{d.comment_count}</span>}
                        {d.is_public && <span className="inline-flex items-center gap-0.5"><Globe className="h-3 w-3" />Público</span>}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="space-y-0.5 text-xs">
                    {d.client ? <p className="flex items-center gap-1 font-medium"><Building2 className="h-3 w-3 text-muted-foreground" /><span className="max-w-[150px] truncate">{d.client.name}</span></p>
                      : <p className="text-muted-foreground">Personal</p>}
                    {!!d.linked_tasks?.length && (
                      <p className="flex items-center gap-1 text-muted-foreground" title={d.linked_tasks.map(t => t.title).join('\n')}>
                        <Link2 className="h-3 w-3" />{d.linked_tasks.length === 1 ? <span className="max-w-[150px] truncate">{d.linked_tasks[0].title}</span> : `${d.linked_tasks.length} tareas`}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5"><Tags tags={d.tags} max={2} /></td>
                <td className="px-3 py-2.5"><StatusPill status={d.status} /></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{shortDate(d.updated_at)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">{shortDate(d.last_viewed_at)}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center -space-x-1.5">
                    <Avatar className="h-6 w-6 ring-2 ring-card" title={d.owner?.full_name}><AvatarImage src={d.owner?.avatar_url} /><AvatarFallback className="text-[9px]">{d.owner?.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                    {(d.shared_users || []).slice(0, 3).map(u => (
                      <Avatar key={u.id} className="h-6 w-6 ring-2 ring-card" title={u.full_name}><AvatarImage src={u.avatar_url} /><AvatarFallback className="text-[9px]">{u.full_name?.charAt(0)}</AvatarFallback></Avatar>
                    ))}
                    {(d.shared_users || []).length > 3 && <span className="pl-2.5 text-[11px] text-muted-foreground">+{(d.shared_users || []).length - 3}</span>}
                  </span>
                </td>
                <td className="px-2 py-2.5"><FavButton on={d.is_favorite} onClick={() => onFavorite(d)} className={cn(!d.is_favorite && 'opacity-0 group-hover:opacity-100')} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocCard({ doc, onOpen, onFavorite }: { doc: NexusDocument; onOpen: () => void; onFavorite: () => void }) {
  return (
    <div onClick={onOpen} className="group flex cursor-pointer flex-col gap-3 rounded-[1.6rem] border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <DocIcon doc={doc} />
        <div className="flex items-center gap-1">
          <StatusPill status={doc.status} />
          <FavButton on={doc.is_favorite} onClick={onFavorite} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold group-hover:text-primary">{doc.title}</p>
        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{doc.excerpt || 'Sin contenido todavía'}</p>
      </div>
      <Tags tags={doc.tags} />
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar className="h-5 w-5"><AvatarImage src={doc.owner?.avatar_url} /><AvatarFallback className="text-[9px]">{doc.owner?.full_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
          <span className="truncate">{doc.client?.name || doc.owner?.full_name || 'Personal'}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {!!doc.linked_tasks?.length && <span className="inline-flex items-center gap-0.5"><Link2 className="h-3 w-3" />{doc.linked_tasks.length}</span>}
          {!!doc.comment_count && <span className="inline-flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{doc.comment_count}</span>}
          <span>{shortDate(doc.updated_at)}</span>
        </span>
      </div>
    </div>
  );
}

function NoteCard({ doc, onOpen, onFavorite }: { doc: NexusDocument; onOpen: () => void; onFavorite: () => void }) {
  const isNote = doc.kind === 'nota';
  const bg = isNote ? doc.color || NOTE_COLORS[0] : undefined;
  return (
    <div onClick={onOpen}
      className={cn('group mb-3 cursor-pointer break-inside-avoid rounded-[1.4rem] p-4 transition hover:-translate-y-0.5 hover:shadow-lg', !isNote && 'border border-border bg-card')}
      style={bg ? { backgroundColor: bg, color: '#1e293b' } : undefined}>
      <div className="flex items-start gap-2">
        {!isNote && <DocIcon doc={doc} size="sm" />}
        <p className="min-w-0 flex-1 font-semibold leading-snug">{doc.icon && isNote ? `${doc.icon} ` : ''}{doc.title}</p>
        <FavButton on={doc.is_favorite} onClick={onFavorite} className={cn(isNote && 'text-slate-700/50 hover:bg-black/5 hover:text-slate-900', !doc.is_favorite && 'opacity-0 group-hover:opacity-100')} />
      </div>
      {doc.excerpt && <p className={cn('mt-2 whitespace-pre-line text-[13px] leading-relaxed', isNote ? 'text-slate-700' : 'text-muted-foreground')}>{doc.excerpt}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(doc.tags || []).map(t => (
          <span key={t} className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', isNote ? 'bg-black/5 text-slate-700' : tagClass(t))}>{t}</span>
        ))}
        {doc.client && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', isNote ? 'bg-black/5 text-slate-700' : 'bg-muted text-muted-foreground')}><Building2 className="h-3 w-3" />{doc.client.name}</span>}
        {!!doc.linked_tasks?.length && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', isNote ? 'bg-black/5 text-slate-700' : 'bg-muted text-muted-foreground')}><Link2 className="h-3 w-3" />{doc.linked_tasks.length}</span>}
        <span className={cn('ml-auto text-[11px]', isNote ? 'text-slate-600' : 'text-muted-foreground')}>{shortDate(doc.updated_at)}</span>
      </div>
    </div>
  );
}

function QuickNote({ creating, onCreate }: { creating: boolean; onCreate: (text: string, color: string) => Promise<void> }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [focused, setFocused] = useState(false);
  const submit = async () => {
    if (!text.trim() || creating) return;
    await onCreate(text.trim(), color);
    setText('');
  };
  return (
    <div className="rounded-[1.4rem] p-3 transition-colors" style={{ backgroundColor: color }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); submit(); } }}
        rows={focused || text ? 3 : 1}
        placeholder="Nota rápida… (la primera línea es el título · Ctrl+Enter para guardar)"
        className="w-full resize-none bg-transparent px-1 text-sm text-slate-800 outline-none placeholder:text-slate-500"
      />
      {(focused || text) && (
        <div className="mt-1 flex items-center gap-1.5">
          {NOTE_COLORS.map(c => (
            <button key={c} type="button" onMouseDown={e => e.preventDefault()} onClick={() => setColor(c)} aria-label={`Color ${c}`}
              className={cn('h-5 w-5 rounded-full ring-1 ring-black/10', color === c && 'ring-2 ring-slate-700')} style={{ backgroundColor: c }} />
          ))}
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={submit} disabled={!text.trim() || creating}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-xs font-semibold text-white disabled:opacity-50">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Guardar nota
          </button>
        </div>
      )}
    </div>
  );
}
