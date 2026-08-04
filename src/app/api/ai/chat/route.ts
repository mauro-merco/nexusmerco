import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';
import { createOpencodeClient, type Part } from '@opencode-ai/sdk';
import { getClientMetrics, type AggregatedMetrics } from '@/lib/data-helper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const OPENCODE_URL = process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:4096';
const OPENCODE_USERNAME = process.env.OPENCODE_SERVER_USERNAME || 'opencode';
const OPENCODE_PASSWORD = process.env.OPENCODE_SERVER_PASSWORD || '';
const AGENT = 'dashboard';

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

async function buildDashboardContext(supabase: ReturnType<typeof getSupabase>, clientId: string | null): Promise<string> {
  const lines: string[] = [];
  lines.push('CONTEXTO ACTUAL DEL DASHBOARD:');

  if (!clientId) {
    lines.push('- El usuario no tiene un cliente asignado (sin datos específicos de campaña).');
    lines.push('  Puedes responder preguntas generales sobre la plataforma, pero no sobre cifras de campañas.');
  } else {
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', clientId)
      .single();
    if (client?.name) lines.push(`- Cliente: ${client.name}`);

    try {
      const metrics: AggregatedMetrics = await getClientMetrics(clientId);

      lines.push(
        `- Totales: Revenue ${fmt(metrics.totalRevenue)}, Gasto/Inversión ${fmt(metrics.totalSpend)}, ` +
          `Órdenes ${metrics.totalOrders}, ROAS promedio ${fmt(metrics.avgRoas)}, CPA ${fmt(metrics.avgCpa)}, CR ${fmt(metrics.avgCr)}%`
      );
      lines.push(
        `- Google Ads: Gasto ${fmt(metrics.platforms.google.spend)}, Revenue ${fmt(metrics.platforms.google.revenue)}, ` +
          `Conversiones ${fmt(metrics.platforms.google.conversions)}, ROAS ${fmt(metrics.platforms.google.roas)}`
      );
      lines.push(
        `- Meta Ads: Gasto ${fmt(metrics.platforms.meta.spend)}, Revenue ${fmt(metrics.platforms.meta.revenue)}, ` +
          `Conversiones ${fmt(metrics.platforms.meta.conversions)}, ROAS ${fmt(metrics.platforms.meta.roas)}`
      );
      lines.push(
        `- Analytics: Sesiones ${fmt(metrics.platforms.analytics.sessions)}, ` +
          `Conversiones ${fmt(metrics.platforms.analytics.conversions)}, Revenue ${fmt(metrics.platforms.analytics.revenue)}`
      );

      if (metrics.topCampaigns.length > 0) {
        lines.push('- Top campañas (por ROAS):');
        for (const c of metrics.topCampaigns) {
          lines.push(
            `  - ${c.name} (${c.platform}): gasto ${fmt(c.spend)}, revenue ${fmt(c.revenue)}, ` +
              `ROAS ${fmt(c.roas)}, conversiones ${c.conversions}`
          );
        }
      }

      if (metrics.trafficSources.length > 0) {
        lines.push('- Fuentes de tráfico (principales):');
        for (const s of metrics.trafficSources.slice(0, 10)) {
          lines.push(`  - ${s.source}: sesiones ${s.sessions}, conversiones ${s.conversions}, CR ${fmt(s.conversionRate)}%`);
        }
      }

      if (metrics.gcData) {
        const gc = metrics.gcData;
        lines.push(
          `- Gestión comercial (mes ${gc.month}): proyección facturación ${fmt(gc.projections.facturacion)}, ` +
            `órdenes ${gc.projections.ordenes}, inversión total ${fmt(gc.projections.inversionTotal)}, ` +
            `CPA ${fmt(gc.projections.cpa)}, ROAS tiendas ${fmt(gc.projections.roasTiendas)}`
        );
      }
    } catch {
      lines.push('- No se pudieron cargar las métricas del cliente (error al leer datos).');
    }

    const { data: opts } = await supabase
      .from('optimizations')
      .select('title, status, priority, platform')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (opts && opts.length > 0) {
      lines.push('- Optimizaciones recientes:');
      for (const o of opts) {
        lines.push(`  - [${o.status || 'sin estado'}] (${o.priority || '-'}) ${o.title}`);
      }
    }
  }

  lines.push('');
  lines.push('Usa ESTE contexto como referencia de los datos actuales. No inventes cifras que no aparezcan aquí.');
  return lines.join('\n');
}

function extractText(parts: Part[] | undefined): string {
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p): p is Part & { text?: string } => p.type === 'text' && !!p.text)
    .map((p) => p.text || '')
    .join('\n')
    .trim();
}

function buildPrompt(context: string, question: string): string {
  return `${context}

PREGUNTA DEL USUARIO: ${question}

Eres Mini Merco, el asistente amable y cercano del Nexus Marketing Dashboard. Hablá en el mismo idioma de la pregunta. Mantené un tono cálido y amigable, podés usar emojis con moderación (😊 👋 ✨ ✅ 📊 💡). Respondé en texto plano (sin markdown, sin asteriscos, sin tablas). Sé conciso pero cálido: empezá con un saludo breve cuando sea natural. Si la pregunta no está relacionada con el dashboard, respondé amablemente que solo podés ayudar con temas del dashboard.`;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No hay token en el header Authorization' }, { status: 401 });
    }

    let userId: string;
    try {
      const payload = decodeJwt(token);
      if (!payload.sub) throw new Error('JWT no contiene sub');
      userId = payload.sub;
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
    }
    const sessionId = typeof body?.session_id === 'string' && body.session_id ? body.session_id : undefined;

    const supabase = getSupabase();
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, email, full_name, client_id')
      .eq('id', userId)
      .single();
    if (!dbUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const context = await buildDashboardContext(supabase, dbUser.client_id || null);

    const client = getOpencodeClient();

    let session: { id: string } | null = null;
    if (sessionId) {
      const existing = await client.session.get({ path: { id: sessionId } });
      if (existing.data) session = existing.data;
    }
    if (!session) {
      const created = await client.session.create({
        body: { title: `Chat IA - ${dbUser.full_name || dbUser.email}` },
      });
      if (created.error || !created.data) {
        throw new Error(created.error?.data?.message || 'No se pudo crear la sesión');
      }
      session = created.data;
    }

    const res = await client.session.prompt({
      path: { id: session.id },
      body: {
        agent: AGENT,
        parts: [{ type: 'text', text: buildPrompt(context, message) }],
      },
    });

    if (res.error || !res.data) {
      throw new Error(res.error?.data?.message || 'El asistente no respondió');
    }

    const reply = extractText(res.data.parts);
    if (!reply) {
      return NextResponse.json(
        { error: 'El asistente no generó una respuesta' },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: { session_id: session.id, reply } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|connect/i.test(msg)) {
      return NextResponse.json(
        {
          error: 'El servidor de IA no está disponible. Ejecuta `npm run ai` en la raíz del proyecto para iniciarlo.',
        },
        { status: 503 }
      );
    }
    console.error('POST /api/ai/chat error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
