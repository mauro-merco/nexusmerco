'use client';
import { ContentSkeleton } from '@/components/content-skeleton';

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
  ArrowUpRight, ChevronRight, BookOpenText, CalendarClock, Clock3, ExternalLink, Eye, Image as ImageIcon,
  Loader2, Pencil, Plus, RefreshCw, Rocket, Search, Send, WandSparkles,
} from 'lucide-react';

type BlogPost = {
  _id: string;
  title: string;
  description?: string;
  urlSlug?: string;
  imageUrl?: string;
  imageAltText?: string;
  rawHTML?: string;
  canonicalLink?: string;
  status: string;
  author?: string;
  categories?: Array<string | { _id: string; label: string }>;
  tags?: string[];
  publishedAt?: string;
  scheduledAt?: string;
  updatedAt?: string;
};

type BlogData = {
  blog: { id: string; name: string };
  posts: BlogPost[];
  total: number;
  categories: Array<{ _id: string; label: string }>;
  authors: Array<{ _id: string; name: string }>;
};

const CANONICAL_BASE = 'https://mercodigital.com.ar/post';
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'border-slate-400/30 bg-slate-400/15 text-slate-600 dark:text-slate-300',
  PUBLISHED: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  SCHEDULED: 'border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-300',
  ARCHIVED: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador', PUBLISHED: 'Publicada', SCHEDULED: 'Programada', ARCHIVED: 'Archivada',
};
const IMAGE_STYLES = [
  { id: 'hyperrealistic', label: 'Hiperrealista', description: 'Fotografía real y detallada' },
  { id: 'cinematic', label: 'Cinemático', description: 'Dramático y profesional' },
  { id: 'editorial', label: 'Editorial', description: 'Estética de revista premium' },
  { id: 'minimal', label: 'Minimalista', description: 'Limpio y con foco claro' },
  { id: 'tech', label: 'Tecnológico', description: 'Futurista azul y violeta' },
] as const;

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatDate(value?: string) {
  if (!value) return 'Sin fecha';
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function toLocalDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function contentLength(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length;
}

function titleFromContent(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/[.!?]/)[0]
    .slice(0, 120);
}

function plainContent(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function seoPreviewDescription(html: string) {
  const text = plainContent(html);
  if (text.length <= 155) return text;
  const shortened = text.slice(0, 155);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 152).replace(/[,:;.-]+$/, '')}...`;
}

function contentWordCount(html: string) {
  const text = plainContent(html);
  return text ? text.split(' ').length : 0;
}

function seoPreviewKeywords(title: string, html: string) {
  const ignored = new Set(['para', 'como', 'pero', 'porque', 'desde', 'hasta', 'sobre', 'entre', 'este', 'esta', 'todo', 'todos', 'cada', 'tambien', 'puede', 'pueden', 'tiene', 'tienen', 'una', 'uno', 'unos', 'unas', 'del', 'las', 'los', 'que', 'con', 'sin', 'por', 'sus', 'son', 'ser', 'hay', 'mas', 'muy']);
  const words = `${title} ${title} ${plainContent(html)}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9]{3,}/g) || [];
  const counts = new Map<string, number>();
  for (const word of words) {
    if (!ignored.has(word) && !/^\d+$/.test(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

export default function BlogPage() {
  const { user, token } = useAuthStore();
  const [data, setData] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPost, setLoadingPost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [author, setAuthor] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [imageStyle, setImageStyle] = useState<(typeof IMAGE_STYLES)[number]['id']>('hyperrealistic');
  const resolvedTitle = title.trim() || titleFromContent(content);
  const slug = slugify(resolvedTitle);
  const canonicalLink = slug ? `${CANONICAL_BASE}/${slug}` : '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : '';
      const response = await fetch(`/api/ventry-blog${query}`, { headers: { Authorization: `Bearer ${token}` } });
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
    setEditingId(null);
    setTitle(''); setContent(''); setImageUrl(''); setImageAltText('');
    setAuthor(''); setCategories([]); setTags([]); setScheduledAt(''); setImageStyle('hyperrealistic'); setError(''); setSuccess('');
  };

  const openNew = () => {
    resetEditor();
    setEditorOpen(true);
  };

  const openEdit = async (post: BlogPost) => {
    setLoadingPost(true);
    setError('');
    try {
      const response = await fetch(`/api/ventry-blog/${encodeURIComponent(post._id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo abrir la nota');
      const detail: BlogPost = json.data;
      setEditingId(detail._id || post._id);
      setTitle(detail.title || '');
      setContent(detail.rawHTML || '');
      setImageUrl(detail.imageUrl || '');
      setImageAltText(detail.imageAltText || '');
      setAuthor(typeof detail.author === 'string' ? detail.author : '');
      setCategories(Array.isArray(detail.categories) ? detail.categories.map(category => typeof category === 'string' ? category : category._id) : []);
      setTags(Array.isArray(detail.tags) ? detail.tags : []);
      setScheduledAt(detail.status === 'SCHEDULED' ? toLocalDateTime(detail.scheduledAt) : '');
      setSuccess('');
      setEditorOpen(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo abrir la nota');
    } finally {
      setLoadingPost(false);
    }
  };

  const generateImage = async (type: 'cover' | 'inline', context = '', liveContent = content) => {
    setError('');
    const response = await fetch('/api/ventry-blog/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, title: resolvedTitle, content: liveContent, context, style: imageStyle }),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || 'No se pudo generar la imagen');
    return json.data as { url: string; alt: string };
  };

  const generateCover = async () => {
    setGeneratingCover(true);
    setError('');
    try {
      const image = await generateImage('cover');
      setImageUrl(image.url);
      setImageAltText(image.alt);
      setSuccess('Portada generada y guardada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo generar la portada');
    } finally {
      setGeneratingCover(false);
    }
  };

  const generateInlineImage = async (context: string, liveContent: string) => {
    try {
      const image = await generateImage('inline', context, liveContent);
      setSuccess('Imagen generada e insertada en la nota.');
      return image;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudo generar la imagen';
      setError(message);
      throw cause;
    }
  };

  const publish = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const status = scheduledAt ? 'SCHEDULED' : 'PUBLISHED';
      const endpoint = editingId ? `/api/ventry-blog/${encodeURIComponent(editingId)}` : '/api/ventry-blog';
      const response = await fetch(endpoint, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: resolvedTitle, rawHTML: content, imageUrl, imageAltText,
          author: author || data?.authors[0]?._id || undefined, categories, tags, status,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo publicar la nota');
      setEditorOpen(false);
      setSuccess(editingId ? 'Nota actualizada correctamente.' : status === 'SCHEDULED' ? 'Nota programada correctamente.' : 'Nota publicada correctamente.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo publicar la nota');
    } finally {
      setSaving(false);
    }
  };

  const canPublish = resolvedTitle.length > 0 && contentLength(content) > 0;
  const posts = data?.posts || [];
  const visiblePosts = posts.filter(post => statusFilter === 'ALL' || post.status === statusFilter);
  const cardClass = 'min-w-0 rounded-[1.6rem] border border-border bg-card shadow-[0_4px_24px_rgba(17,24,39,0.025)]';

  if (editorOpen) {
    return (
      <div className="w-full min-w-0 space-y-6 pb-10 pt-2 md:pt-5">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <a href="/dashboard" className="hover:text-primary">Centro de Control</a><ChevronRight className="size-3" />
          <button type="button" onClick={() => setEditorOpen(false)} className="hover:text-primary">Blog</button><ChevronRight className="size-3" />
          <span className="text-foreground">{editingId ? 'Editar nota' : 'Nueva nota'}</span>
        </nav>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-tint-blue px-3 py-1.5 text-xs font-medium text-tint-blue-foreground"><Pencil className="size-3.5" /> Espacio de escritura</span>
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">{editingId ? 'Editar nota' : 'Nueva nota'}</h1>
            <p className="mt-2 text-sm text-muted-foreground">Dale forma a tu idea. Prepará el contenido, la portada y su publicación.</p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button variant="outline" className="h-11 rounded-full bg-card px-5" onClick={() => setEditorOpen(false)}>Volver al blog</Button>
          <Button className="h-auto min-h-11 max-w-full whitespace-normal rounded-full bg-foreground px-5 py-3 text-background hover:bg-foreground/90" disabled={saving || !canPublish} onClick={publish}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduledAt ? <CalendarClock className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
            {scheduledAt ? 'Programar publicación' : editingId ? 'Actualizar publicación' : 'Publicar ahora'}
          </Button>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.5fr)]">
          <section className={cn(cardClass, 'relative isolate overflow-hidden p-5 md:p-6')}>
            <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 -z-10 size-64 rounded-full opacity-60 blur-[8px]" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 38%, #1A73E8 62%, transparent 72%)' }} />
            <p className="text-xs font-medium text-muted-foreground">MERCO BLOG / COMPOSICIÓN</p>
            <h2 className="mt-5 max-w-[75%] text-2xl font-light tracking-tight md:text-3xl">Una idea clara.<br />Una nota con tu voz.</h2>
            <p className="mt-4 w-fit max-w-full rounded-full bg-surface-inset px-4 py-2 text-xs text-muted-foreground">Escribí primero. El SEO se completa al publicar.</p>
          </section>
          <section aria-label="Resumen de la nota" className="bg-brand-sky-gradient min-w-0 rounded-[1.6rem] p-5 md:p-6">
            <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">Tu nota, de un vistazo</h2><BookOpenText className="size-5 shrink-0 opacity-60" /></div>
            <p className="mt-4 text-4xl font-light tracking-tight">{contentWordCount(content)} <span className="text-sm font-normal">palabras</span></p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/40 px-3 py-2">{Math.max(1, Math.ceil(contentWordCount(content) / 220))} min de lectura</span><span className="rounded-full bg-white/40 px-3 py-2">{scheduledAt ? 'Publicación programada' : 'Publicación inmediata'}</span></div>
          </section>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>}

        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section aria-labelledby="note-content" className={cn(cardClass, 'space-y-5 p-4 md:p-8')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><h2 id="note-content" className="flex items-center gap-2 text-sm font-medium"><Pencil className="size-4 text-brand-blue" /> Contenido de la nota</h2><span className="rounded-full bg-tint-blue px-3 py-1 text-xs text-tint-blue-foreground">Editor enriquecido + Imagen IA</span></div>
            <div className="space-y-2"><Label htmlFor="note-title" className="text-xs text-muted-foreground">Título</Label><Input id="note-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="La próxima gran idea empieza acá" className="h-auto min-w-0 rounded-none border-0 border-b bg-transparent px-0 py-3 text-xl font-medium shadow-none focus-visible:ring-0 md:text-3xl" /></div>
            <div className="min-w-0 overflow-x-auto"><DocumentEditor initialContent={content} onChange={setContent} onGenerateImage={generateInlineImage} compact /></div>
          </section>

          <aside className="min-w-0 space-y-5">
            <div className={cn(cardClass, 'space-y-4 p-5')}>
              <p className="flex items-center gap-2 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-full bg-tint-blue"><ImageIcon className="h-4 w-4 text-tint-blue-foreground" /></span> Portada e imágenes</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Estilo de las imágenes</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {IMAGE_STYLES.map(style => (
                    <button
                      key={style.id}
                      type="button"
                      title={style.description}
                      onClick={() => setImageStyle(style.id)}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-left text-[11px] font-medium transition-colors',
                        imageStyle === style.id
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Se aplica a la portada y a “Imagen IA”. Siempre sin textos ni logos.</p>
              </div>
              {imageUrl ? (
                <img src={imageUrl} alt={imageAltText || `Portada de ${title}`} className="aspect-video w-full rounded-xl border object-cover" />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed bg-muted/30"><ImageIcon className="h-8 w-8 text-muted-foreground/40" /></div>
              )}
              <Button variant="outline" className="h-auto min-h-10 w-full whitespace-normal rounded-full text-primary" disabled={generatingCover} onClick={generateCover}>
                {generatingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {generatingCover ? 'Generando portada...' : imageUrl ? 'Regenerar portada con IA' : 'Generar portada con IA'}
              </Button>
                <div className="space-y-1.5"><Label htmlFor="note-cover" className="text-xs">URL de portada</Label><Input id="note-cover" value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="O pegá la URL de una portada" className="min-w-0 rounded-xl text-xs" /></div>
            </div>

            <div className={cn(cardClass, 'space-y-4 p-5')}>
              <p className="flex items-center gap-2 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-full bg-tint-blue"><CalendarClock className="size-4 text-tint-blue-foreground" /></span> Publicación</p>
              <div className="space-y-1.5">
                <Label htmlFor="note-schedule" className="text-xs">Fecha y hora (opcional)</Label>
                <Input id="note-schedule" type="datetime-local" value={scheduledAt} min={toLocalDateTime(new Date().toISOString())} onChange={event => setScheduledAt(event.target.value)} className="w-full min-w-0 max-w-full rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Sin fecha, se publica inmediatamente.</p>
              </div>
            </div>

            <div className={cn(cardClass, 'space-y-4 p-5 [&_p]:break-words')}>
              <p className="flex items-center gap-2 text-sm font-medium"><span className="flex size-8 items-center justify-center rounded-full bg-tint-blue"><Search className="size-4 text-tint-blue-foreground" /></span> SEO automático</p>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                El título SEO, la descripción, las etiquetas, el texto alternativo y Open Graph se completan al publicar.
              </div>
              <div className="space-y-1"><Label className="text-xs">Título SEO</Label><p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{resolvedTitle || 'Se genera desde la nota'}</p></div>
              <div className="space-y-1"><Label className="text-xs">Meta descripción</Label><p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{seoPreviewDescription(content) || 'Se genera desde el contenido'}</p></div>
              <div className="space-y-1"><Label className="text-xs">Slug</Label><p className="break-all rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{slug || 'Se genera al escribir el título'}</p></div>
              <div className="space-y-1"><Label className="text-xs">Enlace canónico</Label><p className="break-all rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{canonicalLink || 'Se genera al escribir el título'}</p></div>
              <div className="space-y-1"><Label className="text-xs">Etiquetas sugeridas</Label><div className="flex flex-wrap gap-1">{seoPreviewKeywords(resolvedTitle, content).map(keyword => <Badge key={keyword} variant="outline" className="text-[10px]">{keyword}</Badge>)}</div></div>
              <div className="grid grid-cols-2 gap-2 text-center text-[10px] text-muted-foreground"><div className="rounded-lg bg-muted/40 p-2"><strong className="block text-sm text-foreground">{contentWordCount(content)}</strong>palabras</div><div className="rounded-lg bg-muted/40 p-2"><strong className="block text-sm text-foreground">{Math.max(1, Math.ceil(contentWordCount(content) / 220))} min</strong>de lectura</div></div>
            </div>
          </aside>
        </div>
        <footer className="sticky bottom-0 z-10 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">{canPublish ? 'Revisá la portada y los ajustes antes de publicar.' : 'Agregá un título o contenido para preparar la publicación.'}</p>
          <Button className="h-auto min-h-11 w-full whitespace-normal rounded-full bg-foreground px-5 py-3 text-background hover:bg-foreground/90 sm:w-auto" disabled={saving || !canPublish} onClick={publish}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : scheduledAt ? <CalendarClock className="size-4" /> : <Rocket className="size-4" />}
            {scheduledAt ? 'Programar publicación' : editingId ? 'Actualizar publicación' : 'Publicar ahora'}
          </Button>
        </footer>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-7 pb-10 pt-2 md:pt-5">
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-muted-foreground"><a href="/dashboard" className="hover:text-primary">Centro de Control</a><ChevronRight className="size-3" /><span className="text-foreground">Blog</span></nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-700 dark:text-violet-300"><BookOpenText className="size-3.5" /> Espacio editorial</span>
          <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Blog de Merco</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ideas que se convierten en contenido. Todo tu blog, en un lugar.</p>
        </div>
        <Button className="bg-brand-gradient h-11 rounded-full px-5" onClick={openNew}><Plus className="h-4 w-4" /> Nueva nota</Button>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className={cn(cardClass, 'relative isolate flex min-h-64 flex-col overflow-hidden p-6 md:p-8')}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-16 -z-10 size-72 rounded-full opacity-60 blur-[8px]" style={{ background: 'radial-gradient(circle at 35% 35%, #AECBFA 0%, #4285F4 38%, #1A73E8 62%, transparent 72%)' }} />
          <p className="max-w-[65%] break-words text-sm font-medium">{data?.blog.name || 'Merco Blog'}</p>
          <h2 className="mt-8 max-w-sm text-3xl font-light leading-tight tracking-tight md:text-4xl">Tu próxima idea<br />merece una buena nota.</h2>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-inset p-3 pl-4">
            <p className="text-xs text-muted-foreground">Escribí, prepará la portada y elegí cuándo publicar.</p>
            <button type="button" onClick={openNew} className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background">Empezar a escribir <ArrowUpRight className="size-3.5" /></button>
          </div>
        </section>
        <section className="bg-brand-sky-gradient flex min-w-0 flex-col rounded-[1.6rem] p-6 md:p-8" aria-label="Resumen editorial">
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">Resumen editorial</h2><BookOpenText className="size-5 opacity-60" /></div>
          <div className="my-5"><p className="text-6xl font-light tracking-tight">{data ? posts.length : '—'}</p><p className="mt-1 text-xs">notas en la lista cargada</p></div>
          <div className="mt-auto grid grid-cols-3 gap-2">
            {['PUBLISHED', 'DRAFT', 'SCHEDULED'].map(status => <div key={status} className="min-w-0 rounded-2xl bg-white/40 p-2.5"><p className="text-2xl font-light">{data ? posts.filter(post => post.status === status).length : '—'}</p><p className="mt-1 break-words text-[11px]">{status === 'PUBLISHED' ? 'Publicadas' : status === 'DRAFT' ? 'Borradores' : 'Programadas'}</p></div>)}
          </div>
        </section>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-medium tracking-tight">Biblioteca de notas</h2><span className="text-xs text-muted-foreground">{loading ? 'Cargando notas...' : `${visiblePosts.length} notas visibles`}</span></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex max-w-full flex-wrap gap-1 rounded-[1.4rem] border bg-card p-1" role="group" aria-label="Filtrar por estado">
            {['ALL', ...Object.keys(STATUS_LABEL)].map(status => <button key={status} type="button" aria-pressed={statusFilter === status} onClick={() => setStatusFilter(status)} className={cn('rounded-full px-3 py-2 text-xs font-medium transition-colors', statusFilter === status ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>{status === 'ALL' ? 'Todas' : STATUS_LABEL[status]}</button>)}
          </div>
          <form onSubmit={event => { event.preventDefault(); load(); }} className="flex min-w-0 flex-1 basis-72 gap-2">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Buscar notas" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar notas..." className="h-11 rounded-full bg-card pl-10" /></div>
            <Button type="submit" variant="outline" className="h-11 shrink-0 rounded-full bg-card px-4" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="hidden sm:inline">Actualizar</span><span className="sr-only sm:hidden">Actualizar</span></Button>
          </form>
        </div>
      </div>

      {loading ? (
        <ContentSkeleton variant="cards" />
      ) : visiblePosts.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visiblePosts.map(post => (
            <article key={post._id} className={cn(cardClass, 'group relative flex flex-col p-3 transition-colors hover:border-brand-sky')}>
              <div className="card-notch"><button type="button" aria-label={`Editar ${post.title}`} disabled={loadingPost} onClick={() => openEdit(post)} className="flex size-10 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:text-primary disabled:opacity-50">{loadingPost ? <Loader2 className="size-4 animate-spin" /> : <Pencil className="size-4" />}</button></div>
              {post.imageUrl ? <img loading="lazy" src={post.imageUrl} alt={post.imageAltText || ''} className="aspect-[16/9] w-full rounded-[1.1rem] object-cover" /> : <div className="flex aspect-[16/9] items-center justify-center rounded-[1.1rem] bg-surface-inset"><BookOpenText className="h-10 w-10 text-brand-blue/35" /></div>}
              <div className="flex flex-1 flex-col gap-4 p-3 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline" className={cn('rounded-full px-2.5 text-[10px]', STATUS_STYLE[post.status] || STATUS_STYLE.DRAFT)}>{STATUS_LABEL[post.status] || post.status}</Badge><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {formatDate(post.status === 'SCHEDULED' ? post.scheduledAt : post.updatedAt || post.publishedAt)}</span></div>
                <div className="min-w-0"><h3 className="line-clamp-2 break-words text-xl font-medium leading-snug tracking-tight">{post.title}</h3>{post.description && <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">{post.description}</p>}</div>
                {!!post.categories?.length && <div className="flex flex-wrap gap-1.5">{post.categories.map(category => {
                  const id = typeof category === 'string' ? category : category._id;
                  const label = typeof category === 'string' ? data?.categories.find(item => item._id === id)?.label || category : category.label;
                  return <span key={id} className="max-w-full break-words rounded-full bg-tint-blue px-2.5 py-1 text-[10px] text-tint-blue-foreground">{label}</span>;
                })}</div>}
                <p className="truncate text-[11px] text-muted-foreground">/{post.urlSlug || 'sin-slug'}</p>
                <div className="mt-auto flex flex-wrap gap-2 border-t pt-4">
                  <Button variant="outline" className="flex-1 rounded-full" disabled={loadingPost} onClick={() => openEdit(post)}>{loadingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Editar</Button>
                  {post.status === 'PUBLISHED' && post.urlSlug ? (
                    <a
                      href={`${CANONICAL_BASE}/${post.urlSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-foreground px-3 text-sm font-medium text-background transition-opacity hover:opacity-80"
                    >
                      <Eye className="h-4 w-4" /> Abrir nota
                    </a>
                  ) : (
                    <Button variant="outline" className="flex-1 rounded-full" disabled title="Disponible cuando la nota esté publicada"><Eye className="h-4 w-4" /> Abrir nota</Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={cn(cardClass, 'flex flex-col items-center px-6 py-16 text-center')}><span className="mb-5 flex size-16 items-center justify-center rounded-full bg-tint-blue"><Send className="size-6 text-primary" /></span><p className="text-xl font-medium">No encontramos notas</p><p className="mt-2 max-w-sm text-sm text-muted-foreground">{posts.length || search ? 'Probá con otra búsqueda o elegí otro estado para ver más notas.' : 'Tu biblioteca empieza con una idea. Creá la primera publicación de Merco.'}</p><Button onClick={openNew} className="bg-brand-gradient mt-5 rounded-full px-5"><Plus className="size-4" /> Nueva nota</Button></div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-5 text-xs text-muted-foreground">
        <span>{data?.total || 0} notas en Ventry</span>
        <a href="https://app.ventrycrm.com/v2/location/pT2rb1c149juOb2ih9Ad/marketing/blog" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">Abrir Ventry <ExternalLink className="h-3 w-3" /></a>
      </footer>
    </div>
  );
}
