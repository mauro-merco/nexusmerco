const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load({ owner = 'viewer', client = 'client', month = '2026-10', type = 'social', viewer = { id: 'viewer' }, readFailure = false, seen = false } = {}) {
  const writes = [];
  const row = { id: 'comment', user_id: owner, client_id: client, month, calendar_type: type };
  const db = { from(table) {
    const filters = {};
    let operation;
    const q = {
      select() { return q; },
      eq(key, value) { filters[key] = value; return q; },
      update(value) { operation = ['update', value]; return q; },
      delete() { operation = ['delete']; return q; },
      insert(value) { operation = ['insert', value]; return q; },
      async maybeSingle() {
        if (table === 'comment_reads') return { data: seen ? { user_id: 'viewer' } : null, error: null };
        return { data: table === 'calendar_comments' && Object.entries(filters).every(([k, v]) => row[k] === v) ? row : null, error: null };
      },
      then(resolve, reject) {
        writes.push({ table, operation, filters });
        return Promise.resolve({ data: null, error: readFailure && table === 'comment_reads' ? { code: '23514' } : null }).then(resolve, reject);
      },
    };
    return q;
  } };
  const exports = {};
  const deps = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/api-security': { getRequestUser: async () => null, safeError: () => 'Error interno' },
    '@/lib/mentions': {}, '@/lib/activity-events': {},
    '@/lib/calendar-access-server': {
      getSupabaseAdmin: () => db,
      isCalendarType: v => ['social', 'ads'].includes(v),
      isValidMonth: v => /^\d{4}-\d{2}$/.test(v),
      resolveCalendarLink: async () => ({ client: { id: 'client' }, link: {}, type: 'social', month: '2026-10' }),
      resolveCalendarViewer: async () => viewer,
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/api/calendar-comments/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => deps[name], URL, Response });
  return { ...exports, writes };
}

function request(method, body, query = '') {
  return new Request(`https://example.test/api/calendar-comments?token=share&client_id=client&calendar_type=social&month=2026-10${query}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('monthly edit derives owner from verified viewer and never references parent_id', async () => {
  const route = load();
  assert.equal((await route.PUT(request('PUT', { id: 'comment', content: ' Updated ', user_id: 'forged' }))).status, 200);
  assert.equal(route.writes[0].operation[1].content, 'Updated');
  assert.equal(route.writes[0].filters.user_id, 'viewer');
  assert.ok(!JSON.stringify(route.writes).includes('parent_id'));
});

test('edit/delete require ownership, including staff viewers', async () => {
  for (const method of ['PUT', 'DELETE']) {
    const route = load({ owner: 'other', viewer: { id: 'viewer', isStaff: true } });
    assert.equal((await route[method](request(method, { id: 'comment', content: 'Text' }))).status, 403);
    assert.equal(route.writes.length, 0);
  }
});

test('every monthly mutation rejects targets outside client/type/month', async () => {
  for (const mismatch of [{ client: 'other' }, { type: 'ads' }, { month: '2026-09' }]) {
    for (const method of ['PUT', 'DELETE', 'POST']) {
      const route = load(mismatch);
      assert.equal((await route[method](request(method, { id: 'comment', content: 'Text', ...(method === 'POST' ? { action: 'seen' } : {}) }))).status, 404);
      assert.equal(route.writes.length, 0);
    }
  }
});

test('monthly seen uses its own namespace and verified identity', async () => {
  const route = load({ owner: 'other' });
  assert.equal((await route.POST(request('POST', { id: 'comment', action: 'seen', user_id: 'forged' }))).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(route.writes[0].operation[1])), { comment_type: 'calendar_comment', comment_id: 'comment', user_id: 'viewer' });
});

test('missing seen migration reports an actionable error', async () => {
  const route = load({ readFailure: true });
  const response = await route.POST(request('POST', { id: 'comment', action: 'seen' }));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /00078_calendar_comment_reads/);
});

test('seen toggles off only the verified viewer mark', async () => {
  const route = load({ seen: true });
  assert.equal((await route.POST(request('POST', { id: 'comment', action: 'seen' }))).status, 200);
  assert.equal(route.writes[0].operation[0], 'delete');
  assert.equal(route.writes[0].filters.user_id, 'viewer');
  assert.equal(route.writes[0].filters.comment_type, 'calendar_comment');
});

test('public mutations reject a requested month/type outside the link', async () => {
  for (const query of ['&month=2026-09', '&calendar_type=ads']) {
    const route = load();
    const req = request('PUT', { id: 'comment', content: 'Text' });
    const url = new URL(req.url);
    const [key, value] = query.slice(1).split('=');
    url.searchParams.set(key, value);
    assert.equal((await route.PUT(new Request(url, req))).status, 403);
    assert.equal(route.writes.length, 0);
  }
});

test('unauthenticated viewer cannot mutate monthly comments', async () => {
  const route = load({ viewer: null });
  assert.equal((await route.DELETE(request('DELETE', { id: 'comment' }))).status, 401);
  assert.equal(route.writes.length, 0);
});

test('empty and oversized monthly edits are rejected', async () => {
  for (const content of [' ', 'x'.repeat(5001)]) {
    const route = load();
    assert.equal((await route.PUT(request('PUT', { id: 'comment', content }))).status, 400);
    assert.equal(route.writes.length, 0);
  }
});
