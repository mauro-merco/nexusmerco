import 'server-only';

const API_BASE = 'https://services.leadconnectorhq.com';

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
