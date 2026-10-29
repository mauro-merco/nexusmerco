const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadRoute({ insertError = null, viewer = { id: 'viewer', isStaff: false } } = {}) {
  let inserted;
  const database = { from(table) {
    const query = {
      insert(value) { inserted = value; return query; },
      select() { return query; },
      eq() { return query; },
      async single() {
        return table === 'calendar_comments'
          ? { data: insertError ? null : { id: 'created', ...inserted }, error: insertError }
          : { data: null };
      },
      async maybeSingle() { return { data: { id: 'parent' }, error: null }; },
    };
    return query;
  } };
  const exports = {};
  const dependencies = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/api-security': { getRequestUser: async () => null, safeError: value => String(value) },
    '@/lib/mentions': { createMentionNotifications: async () => {} },
    '@/lib/activity-events': { logActivity: async () => {} },
    '@/lib/calendar-access-server': {
      getSupabaseAdmin: () => database,
      isCalendarType: value => ['social', 'ads'].includes(value),
      isValidMonth: value => /^\d{4}-\d{2}$/.test(value),
      resolveCalendarLink: async () => ({ client: { id: 'client' }, link: {}, type: 'social', month: '2026-10' }),
      resolveCalendarViewer: async () => viewer,
    },
  };
  const source = fs.readFileSync('src/app/api/calendar-comments/route.ts', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  }, URL, Response, Request });
  return { POST: exports.POST, inserted: () => inserted };
}

function request(extra = {}) {
  return new Request('https://example.test/api/calendar-comments?token=share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'Test', ...extra }),
  });
}

test('monthly root comments omit the unavailable replies column', async () => {
  const route = loadRoute();
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  assert.equal(Object.hasOwn(route.inserted(), 'parent_id'), false);
  assert.equal(route.inserted().user_id, 'viewer');
  assert.equal(route.inserted().client_id, 'client');
});

test('plain Supabase errors retain their message and code', async () => {
  const route = loadRoute({ insertError: { code: '23503', message: 'Foreign key violation' } });
  const response = await route.POST(request());
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.code, '23503');
  assert.match(body.error, /Foreign key violation/);
});

test('replies report the required migration instead of literal Error', async () => {
  const route = loadRoute({ insertError: { code: 'PGRST204', message: "Could not find the 'parent_id' column" } });
  const response = await route.POST(request({ parent_id: 'parent' }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /00076_calendar_comments_replies.sql/);
});

test('public links still require an authorized viewer', async () => {
  const route = loadRoute({ viewer: null });
  assert.equal((await route.POST(request())).status, 401);
  assert.equal(route.inserted(), undefined);
});

test('frontend handles non-JSON failures, literal Error and malformed success', async () => {
  const exports = {};
  const source = fs.readFileSync('src/lib/hooks/use-calendar-comments.ts', 'utf8')
    + '\nexport { readCommentResponse };';
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: () => ({}) });
  const read = exports.readCommentResponse;
  await assert.rejects(read(new Response('<html>Gateway error</html>', { status: 502 })), /HTTP 502/);
  await assert.rejects(read(Response.json({ error: 'Error' }, { status: 500 })), /HTTP 500/);
  await assert.rejects(read(Response.json({ error: 'Sesion vencida' }, { status: 401 })), /Sesion vencida/);
  await assert.rejects(read(Response.json(42)), /respuesta.*invalida/);
  await assert.rejects(read(Response.json({})), /respuesta.*invalida/);
  assert.deepEqual(await read(Response.json({ success: true }), false), { success: true });
});
