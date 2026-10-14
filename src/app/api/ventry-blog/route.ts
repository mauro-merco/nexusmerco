import { NextResponse } from 'next/server';
import { getRequestUser, isStaff, safeError } from '@/lib/api-security';
import { getVentryBlogConfig, sanitizeBlogHtml, ventryBlogRequest } from '@/lib/ventry-blog';

async function authorize(request: Request) {
  const user = await getRequestUser(request);
  return user && isStaff(user) ? user : null;
}

export async function GET(request: Request) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { locationId, blogId } = getVentryBlogConfig();
    const query = new URL(request.url).searchParams.get('q')?.trim() || '';
    const common = `locationId=${encodeURIComponent(locationId)}`;
    const [posts, categories, authors] = await Promise.all([
      ventryBlogRequest(`/blogs/posts/all?${common}&blogId=${encodeURIComponent(blogId)}&limit=50&offset=0&status=ALL${query ? `&searchTerm=${encodeURIComponent(query)}` : ''}`),
      ventryBlogRequest(`/blogs/categories?${common}&limit=50&offset=0`),
      ventryBlogRequest(`/blogs/authors?${common}&limit=50&offset=0`),
    ]);
    return NextResponse.json({
      data: {
        blog: { id: blogId, name: 'Merco Blog' },
        posts: posts.blogs || [],
        total: posts.count || 0,
        categories: categories.categories || [],
        authors: authors.authors || [],
      },
    });
  } catch (error) {
    console.error('GET /api/ventry-blog:', safeError(error));
    return NextResponse.json({ error: safeError(error, 'No se pudo cargar el blog') }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { locationId, blogId } = getVentryBlogConfig();
    const body = await request.json();
    const title = String(body.title || '').trim();
    const rawHTML = sanitizeBlogHtml(String(body.rawHTML || '')).trim();
    const status = String(body.status || 'DRAFT').toUpperCase();
    if (!title) return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });
    if (!rawHTML || rawHTML === '<br>') return NextResponse.json({ error: 'El contenido es obligatorio.' }, { status: 400 });
    if (!['DRAFT', 'PUBLISHED', 'SCHEDULED'].includes(status)) {
      return NextResponse.json({ error: 'Estado de publicación inválido.' }, { status: 400 });
    }
    if (status === 'SCHEDULED' && !body.scheduledAt) {
      return NextResponse.json({ error: 'Elegí una fecha para programar la nota.' }, { status: 400 });
    }

    const text = rawHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = text ? text.split(' ').length : 0;
    const payload = {
      title,
      locationId,
      blogId,
      rawHTML,
      status,
      description: String(body.description || '').trim(),
      imageUrl: String(body.imageUrl || '').trim(),
      imageAltText: String(body.imageAltText || '').trim(),
      urlSlug: String(body.urlSlug || '').trim(),
      canonicalLink: String(body.canonicalLink || '').trim(),
      categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
      tags: Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [],
      author: body.author ? String(body.author) : undefined,
      wordCount,
      readTimeInMinutes: Math.max(1, Math.ceil(wordCount / 220)),
      archived: false,
      ...(status === 'SCHEDULED' ? { scheduledAt: new Date(body.scheduledAt).toISOString() } : {}),
      ...(status === 'PUBLISHED' ? { publishedAt: new Date().toISOString() } : {}),
    };
    const created = await ventryBlogRequest('/blogs/posts', { method: 'POST', body: JSON.stringify(payload) });
    return NextResponse.json({ data: created.data || created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/ventry-blog:', safeError(error));
    return NextResponse.json({ error: safeError(error, 'No se pudo guardar la nota') }, { status: 502 });
  }
}
