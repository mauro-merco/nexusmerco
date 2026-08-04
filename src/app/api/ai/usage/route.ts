import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

function resolveDbPath(): string | null {
  const dir = process.env.OPENCODE_DATA_DIR || path.join(os.homedir(), '.local', 'share', 'opencode');
  const dbPath = path.join(dir, 'opencode.db');
  return fs.existsSync(dbPath) ? dbPath : null;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export async function GET(request: Request) {
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

  const dbPath = resolveDbPath();
  if (!dbPath) {
    return NextResponse.json({ data: { available: false } });
  }

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const url = new URL(request.url);
      const daysParam = url.searchParams.get('days');
      const days = daysParam === '7' || daysParam === '30' ? Number.parseInt(daysParam, 10) : null;
      const cutoff = days ? Date.now() - days * 86400000 : null;

      const overview = db
        .prepare(
          `SELECT
             COUNT(*) AS messages,
             COUNT(DISTINCT session_id) AS sessions,
             MIN(time_created) AS minTs,
             MAX(time_created) AS maxTs,
             COALESCE(SUM(json_extract(data, '$.cost')), 0) AS totalCost,
             COALESCE(SUM(json_extract(data, '$.tokens.input')), 0) AS inputTokens,
             COALESCE(SUM(json_extract(data, '$.tokens.output')), 0) AS outputTokens,
             COALESCE(SUM(json_extract(data, '$.tokens.cache.read')), 0) AS cacheRead,
             COALESCE(SUM(json_extract(data, '$.tokens.cache.write')), 0) AS cacheWrite
           FROM message${cutoff ? ' WHERE time_created >= ?' : ''}`
        )
        .get(...(cutoff ? [cutoff] : [])) as Record<string, unknown>;

      const models = (cutoff
        ? db.prepare(
            `SELECT
               json_extract(data, '$.modelID') AS model,
               json_extract(data, '$.providerID') AS provider,
               COUNT(*) AS messages,
               COALESCE(SUM(json_extract(data, '$.cost')), 0) AS cost,
               COALESCE(SUM(json_extract(data, '$.tokens.input')), 0) AS inputTokens,
               COALESCE(SUM(json_extract(data, '$.tokens.output')), 0) AS outputTokens,
               COALESCE(SUM(json_extract(data, '$.tokens.cache.read')), 0) AS cacheRead,
               COALESCE(SUM(json_extract(data, '$.tokens.cache.write')), 0) AS cacheWrite
             FROM message
             WHERE time_created >= ?
             GROUP BY model, provider
             ORDER BY cost DESC, messages DESC`
          ).all(cutoff)
        : db
            .prepare(
              `SELECT
                 json_extract(data, '$.modelID') AS model,
                 json_extract(data, '$.providerID') AS provider,
                 COUNT(*) AS messages,
                 COALESCE(SUM(json_extract(data, '$.cost')), 0) AS cost,
                 COALESCE(SUM(json_extract(data, '$.tokens.input')), 0) AS inputTokens,
                 COALESCE(SUM(json_extract(data, '$.tokens.output')), 0) AS outputTokens,
                 COALESCE(SUM(json_extract(data, '$.tokens.cache.read')), 0) AS cacheRead,
                 COALESCE(SUM(json_extract(data, '$.tokens.cache.write')), 0) AS cacheWrite
               FROM message
               GROUP BY model, provider
               ORDER BY cost DESC, messages DESC`
            )
            .all()) as Record<string, unknown>[];

      const messages = num(overview.messages);
      const sessions = num(overview.sessions);
      const minTs = num(overview.minTs);
      const maxTs = num(overview.maxTs);
      const spanDays = messages > 0 && maxTs >= minTs ? Math.max(1, Math.ceil((maxTs - minTs) / 86400000)) : 0;
      const totalTokens =
        num(overview.inputTokens) + num(overview.outputTokens) + num(overview.cacheRead) + num(overview.cacheWrite);

      return NextResponse.json({
        data: {
          available: true,
          overview: {
            messages,
            sessions,
            days: spanDays,
            totalCost: num(overview.totalCost),
            avgCostPerDay: spanDays > 0 ? num(overview.totalCost) / spanDays : 0,
            avgTokensPerSession: sessions > 0 ? totalTokens / sessions : 0,
            inputTokens: num(overview.inputTokens),
            outputTokens: num(overview.outputTokens),
            cacheRead: num(overview.cacheRead),
            cacheWrite: num(overview.cacheWrite),
          },
          models: models.map((m) => ({
            model: m.model ?? 'desconocido',
            provider: m.provider ?? '',
            messages: num(m.messages),
            cost: num(m.cost),
            inputTokens: num(m.inputTokens),
            outputTokens: num(m.outputTokens),
            cacheRead: num(m.cacheRead),
            cacheWrite: num(m.cacheWrite),
          })),
        },
      });
    } finally {
      db.close();
    }
  } catch (e) {
    console.error('GET /api/ai/usage error:', e);
    return NextResponse.json({ error: 'No se pudo leer el uso de la IA' }, { status: 500 });
  }
}
