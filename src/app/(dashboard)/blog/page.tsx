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
  BookOpenText, CalendarClock, Clock3, ExternalLink, Eye, Image as ImageIcon,
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
  categories?: string[];
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
      setCategories(Array.isArray(detail.categories) ? detail.categories : []);
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

  if (editorOpen) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 pb-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <button type="button" onClick={() => setEditorOpen(false)} className="mb-1 text-xs font-medium text-muted-foreground hover:text-foreground">← Volver al blog</button>
            <h1 className="text-2xl font-bold text-gradient-tech">{editingId ? 'Editar nota' : 'Nueva nota para Merco Blog'}</h1>
          </div>
          <Button variant="cta" disabled={saving || !canPublish} onClick={publish}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : scheduledAt ? <CalendarClock className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
            {scheduledAt ? 'Programar publicación' : editingId ? 'Actualizar publicación' : 'Publicar ahora'}
          </Button>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="space-y-4 rounded-2xl border bg-card p-4 md:p-6">
            <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Título de la nota" className="h-auto border-0 bg-transparent px-0 text-3xl font-bold shadow-none focus-visible:ring-0" />
            <DocumentEditor initialContent={content} onChange={setContent} onGenerateImage={generateInlineImage} />
          </section>

          <aside className="space-y-4">
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-blue-500" /> Portada</p>
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
                          ? 'border-violet-500/50 bg-violet-500/15 text-violet-700 dark:text-violet-200'
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
              <Button variant="outline" className="w-full rounded-xl border-violet-500/40 text-violet-600 dark:text-violet-300" disabled={generatingCover} onClick={generateCover}>
                {generatingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                {generatingCover ? 'Generando portada...' : imageUrl ? 'Regenerar portada con IA' : 'Generar portada con IA'}
              </Button>
              <Input value={imageUrl} onChange={event => setImageUrl(event.target.value)} placeholder="O pegá la URL de una portada" className="rounded-xl text-xs" />
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">Publicación</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha y hora (opcional)</Label>
                <Input type="datetime-local" value={scheduledAt} min={toLocalDateTime(new Date().toISOString())} onChange={event => setScheduledAt(event.target.value)} className="rounded-xl" />
                <p className="text-[11px] text-muted-foreground">Sin fecha, se publica inmediatamente.</p>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold">SEO automático</p>
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
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10 p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-300"><BookOpenText className="h-4 w-4" /> {data?.blog.name || 'Merco Blog'}</div>
          <h1 className="text-3xl font-black text-gradient-tech">BLOG DE MERCO</h1>
          <p className="mt-1 text-sm text-muted-foreground">Creá, editá y publicá notas directamente en Ventry.</p>
        </div>
        <Button variant="cta" onClick={openNew}><Plus className="h-4 w-4" /> Nueva nota</Button>
      </header>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{success}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') load(); }} placeholder="Buscar notas..." className="rounded-xl pl-9" /></div>
        <Button variant="outline" className="rounded-xl" onClick={load} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Actualizar</Button>
      </div>

      {loading ? (
        <ContentSkeleton variant="cards" />
      ) : data?.posts.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map(post => (
            <article key={post._id} className="group overflow-hidden rounded-2xl border bg-card transition-colors hover:border-violet-500/35">
              {post.imageUrl ? <img src={post.imageUrl} alt={post.imageAltText || ''} className="aspect-[16/8] w-full object-cover" /> : <div className="flex aspect-[16/8] items-center justify-center bg-gradient-to-br from-blue-500/10 to-violet-500/15"><BookOpenText className="h-9 w-9 text-violet-500/40" /></div>}
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2"><Badge variant="outline" className={cn('text-[10px]', STATUS_STYLE[post.status] || STATUS_STYLE.DRAFT)}>{STATUS_LABEL[post.status] || post.status}</Badge><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {formatDate(post.updatedAt || post.publishedAt)}</span></div>
                <div><h2 className="line-clamp-2 font-bold leading-snug">{post.title}</h2>{post.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{post.description}</p>}</div>
                <p className="truncate text-[11px] text-muted-foreground">/{post.urlSlug || 'sin-slug'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" disabled={loadingPost} onClick={() => openEdit(post)}>{loadingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Editar</Button>
                  {post.status === 'PUBLISHED' && post.urlSlug ? (
                    <a
                      href={`${CANONICAL_BASE}/${post.urlSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Eye className="h-4 w-4" /> Abrir nota
                    </a>
                  ) : (
                    <Button variant="outline" className="rounded-xl" disabled title="Disponible cuando la nota esté publicada"><Eye className="h-4 w-4" /> Abrir nota</Button>
                  )}
                </div>
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
