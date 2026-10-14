'use client';

import { startTransition, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { DocumentEditor } from '@/components/document-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NoAccess } from '@/components/no-access';
import { cn } from '@/lib/utils';
import {
  BookOpenText, CalendarClock, CheckCircle2, Clock3, ExternalLink,
  FileText, Image as ImageIcon, Loader2, Plus, RefreshCw, Rocket, Search,
  Send, Tag, UserRound,
} from 'lucide-react';

type BlogPost = {
  _id: string;
  title: string;
  description?: string;
  urlSlug?: string;
  imageUrl?: string;
  status: string;
  publishedAt?: string;
  scheduledAt?: string;
  updatedAt?: string;
};

type BlogCategory = { _id: string; label: string; urlSlug?: string };
type BlogAuthor = { _id: string; name: string; imageUrl?: string };
type BlogData = {
  blog: { id: string; name: string };
  posts: BlogPost[];
  total: number;
  categories: BlogCategory[];
  authors: BlogAuthor[];
};

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'border-slate-400/30 bg-slate-400/15 text-slate-600 dark:text-slate-300',
  PUBLISHED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  SCHEDULED: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  ARCHIVED: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
};

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BlogPage() {
  const { user, token } = useAuthStore();
  const [data, setData] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [canonicalLink, setCanonicalLink] = useState('');
  const [author, setAuthor] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/ventry-blog${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo cargar el blog');
      startTransition(() => setData(json.data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el blog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  if (user?.role !== 'admin' && user?.role !== 'operador') {
    return <NoAccess message="Solo el equipo de Merco puede administrar el blog." />;
  }

  const resetEditor = () => {
    setTitle(''); setDescription(''); setContent(''); setSlug(''); setSlugTouched(false);
    setImageUrl(''); setImageAltText(''); setCanonicalLink(''); setAuthor('');
    setCategories([]); setTags(''); setScheduledAt(''); setError(''); setSuccess('');
  };

  const openNew = () => { resetEditor(); setEditorOpen(true); };

  const publish = async (status: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED') => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/ventry-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title, description, rawHTML: content, urlSlug: slug || slugify(title), imageUrl,
          imageAltText, canonicalLink, author: author || undefined, categories,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean), status, scheduledAt,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo guardar la nota');
      setSuccess(status === 'PUBLISHED' ? 'Nota publicada correctamente.' : status === 'SCHEDULED' ? 'Nota programada correctamente.' : 'Borrador guardado correctamente.');
      await load();
      if (status !== 'DRAFT') setEditorOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar la nota');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (id: string) => setCategories(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  if (editorOpen) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={() => setEditorOpen(false)} className="mb-1 text-xs font-medium text-muted-foreground hover:text-foreground">← Volver al blog</button>
            <h1 className="text-2xl font-bold text-gradient-tech">Nueva nota para Merco Blog</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-xl" disabled={saving} onClick={() => publish('DRAFT')}><FileText className="h-4 w-4" /> Guardar borrador</Button>
            <Button variant="outline" className="rounded-xl border-violet-500/40 text-violet-600" disabled={saving} onClick={() => publish('SCHEDULED')}><CalendarClock className="h-4 w-4" /> Programar</Button>
            <Button variant="cta" disabled={saving} onClick={() => publish('PUBLISHED')}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Publicar</Button>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
            <Input value={title} onChange={event => { const value = event.target.value; setTitle(value); if (!slugTouched) setSlug(slugify(value)); }} placeholder="Título de la nota" className="h-auto border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0" />
            <Input value={description} onChange={event => setDescription(event.target.value)} placeholder="Bajada o descripción breve para buscadores" className="rounded-xl bg-muted/30" />
            <DocumentEditor initialContent={content} onChange={setContent} />
          </section>

          <aside className="space-y-4">
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-blue-500" /> Portada</p>
              <Input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="URL de la imagen" className="rounded-xl" />
              <Input value={imageAltText} onChange={event => setImageAltText(event.target.value)} placeholder="Descripción de la imagen" className="rounded-xl" />
              {imageUrl && <img src={imageUrl} alt={imageAltText || 'Vista previa'} className="aspect-video w-full rounded-xl object-cover" />}
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><UserRound className="h-4 w-4 text-violet-500" /> Autor y clasificación</p>
              <select value={author} onChange={event => setAuthor(event.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm">
                <option value="">Seleccionar autor</option>
                {(data?.authors || []).map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
              <div className="flex flex-wrap gap-2">
                {(data?.categories || []).map(item => (
                  <button key={item._id} type="button" onClick={() => toggleCategory(item._id)} className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', categories.includes(item._id) ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-200' : 'border-border text-muted-foreground')}>
                    {item.label}
                  </button>
                ))}
              </div>
              <Input value={tags} onChange={event => setTags(event.target.value)} placeholder="Etiquetas separadas por coma" className="rounded-xl" />
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Tag className="h-4 w-4 text-emerald-500" /> SEO y programación</p>
              <div className="space-y-1.5"><Label className="text-xs">Slug</Label><Input value={slug} onChange={event => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} placeholder="url-de-la-nota" className="rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Enlace canónico</Label><Input value={canonicalLink} onChange={event => setCanonicalLink(event.target.value)} placeholder="https://..." className="rounded-xl" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Fecha para programar</Label><Input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="rounded-xl" /></div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10 p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300"><BookOpenText className="h-4 w-4" /> {data?.blog.name || 'Merco Blog'}</div>
          <h1 className="text-3xl font-black text-gradient-tech">BLOG DE MERCO</h1>
          <p className="mt-1 text-sm text-muted-foreground">Redactá, programá y publicá notas directamente en Ventry.</p>
        </div>
        <Button variant="cta" onClick={openNew}><Plus className="h-4 w-4" /> Nueva nota</Button>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') load(); }} placeholder="Buscar notas..." className="rounded-xl pl-9" /></div>
        <Button variant="outline" className="rounded-xl" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : data?.posts.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map(post => (
            <article key={post._id} className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-violet-500/35">
              {post.imageUrl ? <img src={post.imageUrl} alt="" className="aspect-[16/8] w-full object-cover" /> : <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-blue-500/10 to-violet-500/15"><BookOpenText className="h-9 w-9 text-violet-500/40" /></div>}
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2"><Badge variant="outline" className={cn('text-[10px]', STATUS_STYLE[post.status] || STATUS_STYLE.DRAFT)}>{post.status}</Badge><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {formatDate(post.updatedAt || post.publishedAt)}</span></div>
                <div><h2 className="line-clamp-2 font-bold leading-snug">{post.title}</h2>{post.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.description}</p>}</div>
                <p className="truncate text-[11px] text-muted-foreground">/{post.urlSlug || 'sin-slug'}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-3xl border border-dashed py-20 text-center"><Send className="mb-3 h-10 w-10 text-violet-500/35" /><p className="font-semibold">No encontramos notas</p><p className="text-sm text-muted-foreground">Creá la primera publicación desde el dashboard.</p></div>
      )}

      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{data?.total || 0} notas en Ventry</span>
        <a href="https://app.ventrycrm.com/v2/location/pT2rb1c149juOb2ih9Ad/marketing/blog" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">Abrir Ventry <ExternalLink className="h-3 w-3" /></a>
      </footer>
    </div>
  );
}
