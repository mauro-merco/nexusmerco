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

const SEO_STOP_WORDS = new Set([
  'para', 'como', 'pero', 'porque', 'desde', 'hasta', 'sobre', 'entre', 'este', 'esta', 'estos', 'estas',
  'tambien', 'tiene', 'tienen', 'puede', 'pueden', 'cuando', 'donde', 'cada', 'todo', 'todos', 'toda', 'todas',
  'mucho', 'muchos', 'muy', 'mas', 'menos', 'solo', 'algo', 'esto', 'eso', 'una', 'uno', 'unos', 'unas',
  'del', 'las', 'los', 'que', 'con', 'sin', 'por', 'sus', 'son', 'ser', 'hay', 'fue', 'han', 'al', 'se',
]);

function seoDescription(text: string) {
  if (text.length <= 155) return text;
  const shortened = text.slice(0, 155);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > 120 ? lastSpace : 152).replace(/[,:;.-]+$/, '')}...`;
}

function seoKeywords(title: string, text: string) {
  const normalized = `${title} ${title} ${text}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]{3,}/g) || [];
  const counts = new Map<string, number>();
  for (const word of normalized) {
    if (!SEO_STOP_WORDS.has(word) && !/^\d+$/.test(word)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
}

export function buildBlogSeo(title: string, rawHTML: string) {
  const text = rawHTML.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  const urlSlug = blogSlug(title);
  return {
    description: seoDescription(text),
    urlSlug,
    canonicalLink: blogCanonicalLink(urlSlug),
    tags: seoKeywords(title, text),
    imageAltText: title ? `Imagen principal del artículo: ${title}` : '',
    wordCount: text ? text.split(' ').length : 0,
  };
}

export function buildVentryPostPayload(body: Record<string, unknown>, status: string) {
  const title = String(body.title || '').trim();
  const rawHTML = sanitizeBlogHtml(String(body.rawHTML || '')).trim();
  const seo = buildBlogSeo(title, rawHTML);

  return {
    title,
    rawHTML,
    status,
    description: seo.description,
    imageUrl: String(body.imageUrl || '').trim(),
    imageAltText: seo.imageAltText,
    urlSlug: seo.urlSlug,
    canonicalLink: seo.canonicalLink,
    categories: Array.isArray(body.categories) ? body.categories.map(String) : [],
    tags: seo.tags,
    author: body.author ? String(body.author) : undefined,
    wordCount: seo.wordCount,
    readTimeInMinutes: Math.max(1, Math.ceil(seo.wordCount / 220)),
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
