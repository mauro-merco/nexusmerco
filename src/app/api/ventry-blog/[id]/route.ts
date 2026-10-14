import { NextResponse } from 'next/server';
import { getRequestUser, isStaff, safeError } from '@/lib/api-security';
import { buildVentryPostPayload, getVentryBlogConfig, ventryBlogRequest } from '@/lib/ventry-blog';

async function authorize(request: Request) {
  const user = await getRequestUser(request);
  return user && isStaff(user) ? user : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { id } = await params;
    const { locationId } = getVentryBlogConfig();
    const result = await ventryBlogRequest(`/blogs/posts/${encodeURIComponent(id)}?locationId=${encodeURIComponent(locationId)}`);
    return NextResponse.json({ data: result.blogPost || result.data || result });
  } catch (error) {
    console.error('GET /api/ventry-blog/[id]:', safeError(error));
    return NextResponse.json({ error: safeError(error, 'No se pudo cargar la nota') }, { status: 502 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!await authorize(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const { id } = await params;
    const { locationId, blogId } = getVentryBlogConfig();
    const body = await request.json();
    const title = String(body.title || '').trim();
    const rawHTML = String(body.rawHTML || '').trim();
    const status = String(body.status || 'PUBLISHED').toUpperCase();

    if (!title) return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });
    if (!rawHTML || rawHTML === '<br>') return NextResponse.json({ error: 'El contenido es obligatorio.' }, { status: 400 });
    if (!['PUBLISHED', 'SCHEDULED'].includes(status)) {
      return NextResponse.json({ error: 'Estado de publicación inválido.' }, { status: 400 });
    }
    if (status === 'SCHEDULED' && !body.scheduledAt) {
      return NextResponse.json({ error: 'Elegí una fecha para programar la nota.' }, { status: 400 });
    }

    const currentResult = await ventryBlogRequest(`/blogs/posts/${encodeURIComponent(id)}?locationId=${encodeURIComponent(locationId)}`);
    const current = currentResult.blogPost || currentResult.data || currentResult;
    const payload = {
      ...buildVentryPostPayload({ ...current, ...body }, status),
      locationId,
      blogId,
      ...(status === 'PUBLISHED' ? { publishedAt: current.publishedAt || new Date().toISOString() } : {}),
    };
    const updated = await ventryBlogRequest(`/blogs/posts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ data: updated.data || updated.blogPost || updated });
  } catch (error) {
    console.error('PUT /api/ventry-blog/[id]:', safeError(error));
    return NextResponse.json({ error: safeError(error, 'No se pudo actualizar la nota') }, { status: 502 });
  }
}
