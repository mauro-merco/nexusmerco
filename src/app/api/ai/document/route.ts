import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { createOpencodeClient, type Part } from '@opencode-ai/sdk';

const OPENCODE_URL = process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096';
const OPENCODE_USERNAME = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || '';
const AGENT = 'writer';

function getOpencodeClient() {
  return createOpencodeClient({
    baseUrl: OPENCODE_URL,
    ...(OPENCODE_PASSWORD
      ? {
          fetch: async (request: Request) => {
            const headers = new Headers(request.headers);
            headers.set(
              'Authorization',
              'Basic ' + Buffer.from(`${OPENCODE_USERNAME}:${OPENCODE_PASSWORD}`).toString('base64')
            );
            return fetch(new Request(request, { headers }));
          },
        }
      : {}),
  });
}

function extractText(parts: Part[] | undefined): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p): p is Part & { text?: string } => p.type === 'text' && !!p.text)
    .map((p) => p.text || '')
    .join('\n')
    .trim();
}

const FORBIDDEN_TAGS = [
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'select',
  'textarea', 'button', 'link', 'meta', 'svg', 'template', 'noscript', 'html', 'head', 'body',
];

function sanitizeHtml(html: string): string {
  let out = html;
  for (const tag of FORBIDDEN_TAGS) {
    out = out.replace(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'gi'), '');
    out = out.replace(new RegExp(`<${tag}[^>]*/?>`, 'gi'), '');
  }
  out = out.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  out = out.replace(/\s(?:href|src)\s*=\s*["']javascript:[^"']*["']/gi, '');
  return out;
}

function buildPrompt(p: { theme: string; tone: string; length: string }): string {
  return `Escribí el contenido completo de un documento sobre la siguiente temática.

TEMÁTICA: ${p.theme}
TONO: ${p.tone}
EXTENSIÓN: ${p.length}

Generá el contenido del documento y devolvélo exclusivamente como HTML, siguiendo las reglas de tu configuración.`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No hay token en el header Authorization' }, { status: 401 });
    }

    try {
      const payload = decodeJwt(token);
      if (!payload.sub) throw new Error('JWT no contiene sub');
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const theme = typeof body?.theme === 'string' ? body.theme.trim() : '';
    if (!theme) {
      return NextResponse.json({ error: 'Falta la temática' }, { status: 400 });
    }
    const tone = typeof body?.tone === 'string' && body.tone.trim() ? body.tone.trim() : 'profesional';
    const length = typeof body?.length === 'string' && body.length.trim() ? body.length.trim() : 'normal';

    const client = getOpencodeClient();
    const created = await client.session.create({
      body: { title: `Documento IA - ${theme.slice(0, 60)}` },
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.data?.message || 'No se pudo crear la sesión');
    }

    const res = await client.session.prompt({
      path: { id: created.data.id },
      body: { agent: AGENT, parts: [{ type: 'text', text: buildPrompt({ theme, tone, length }) }] },
    });

    if (res.error || !res.data) {
      throw new Error(res.error?.data?.message || 'El asistente no respondió');
    }

    const raw = extractText(res.data.parts);
    if (!raw) {
      return NextResponse.json({ error: 'El asistente no generó contenido' }, { status: 502 });
    }

    return NextResponse.json({ data: { html: sanitizeHtml(raw) } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect/i.test(msg)) {
      return NextResponse.json(
        { error: 'El servidor de IA no está disponible. Ejecuta `npm run ai` en la raíz del proyecto para iniciarlo.' },
        { status: 503 }
      );
    }
    console.error('POST /api/ai/document error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
