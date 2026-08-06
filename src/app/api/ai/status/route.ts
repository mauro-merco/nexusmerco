import { NextResponse } from 'next/server';

const OPENCODE_URL = process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096';
const OPENCODE_USERNAME = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || '';

function getAuthHeader(): Record<string, string> {
  if (OPENCODE_PASSWORD) {
    return {
      Authorization: 'Basic ' + Buffer.from(`${OPENCODE_USERNAME}:${OPENCODE_PASSWORD}`).toString('base64'),
    };
  }
  return {};
}

export async function GET(_request: Request) {
  try {
    const res = await fetch(`${OPENCODE_URL}/health`, {
      method: 'GET',
      headers: getAuthHeader(),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({ available: false, error: `HTTP ${res.status}` }, { status: 503 });
    }

    return NextResponse.json({ available: true });
 } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect|timeout/i.test(msg)) {
      return NextResponse.json({ available: false, error: 'El servidor de IA no está disponible' }, { status: 503 });
    }
    return NextResponse.json({ available: false, error: msg }, { status: 503 });
  }
}
