import 'server-only';

const API_BASE = 'https://services.leadconnectorhq.com';
const DEFAULT_PUBLIC_BLOG_URL = 'https://mercodigital.com.ar/post';

export function getVentryBlogConfig() {
  const token = process.env.VENTRY_PRIVATE_TOKEN;
  const locationId = process.env.VENTRY_LOCATION_ID;
  const blogId = process.env.VENTRY_BLOG_ID;
  if (!token || !locationId || !blogId) {
    throw new Error('La integración con Ventry no está configurada.');
  }
  return { token, locationId, blogId };
}

export async function ventryBlogRequest(path: string, init?: RequestInit) {
  const { token } = getVentryBlogConfig();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      Version: 'v3',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json.message || json.error || `Ventry respondió HTTP ${response.status}`);
  }
  return json;
}

export function blogSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function blogCanonicalLink(slug: string) {
  const base = (process.env.VENTRY_BLOG_PUBLIC_URL || DEFAULT_PUBLIC_BLOG_URL).replace(/\/$/, '');
  return slug ? `${base}/${slug}` : '';
}

export function buildVentryPostPayload(body: Record<string, unknown>, status: string) {
  const title = String(body.title || '').trim();
  const rawHTML = sanitizeBlogHtml(String(body.rawHTML || '')).trim();
  const urlSlug = blogSlug(title);
  const text = rawHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(' ').length : 0;
  const description = String(body.description || '').trim() || text.slice(0, 155);

  return {
    title,
    rawHTML,
    status,
    description,
    imageUrl: String(body.imageUrl || '').trim(),
    imageAltText: String(body.imageAltText || '').trim() || (title ? `Portada de ${title}` : ''),
    urlSlug,
    canonicalLink: blogCanonicalLink(urlSlug),
    categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
    tags: Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean) : [],
    author: body.author ? String(body.author) : undefined,
    wordCount,
    readTimeInMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    archived: false,
    ...(status === 'SCHEDULED' && body.scheduledAt
      ? { scheduledAt: new Date(String(body.scheduledAt)).toISOString() }
      : {}),
  };
}

const FORBIDDEN_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'select',
  'textarea', 'button', 'link', 'meta', 'svg', 'template', 'noscript', 'html', 'head', 'body',
];

export function sanitizeBlogHtml(html: string) {
  let output = html;
  for (const tag of FORBIDDEN_TAGS) {
    output = output.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), '');
    output = output.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }
  return output
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\s(?:href|src)\s*=\s*["']javascript:[^"']*["']/gi, '');
}
