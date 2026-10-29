const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function loadConfig(name) {
  const exports = {};
  const source = fs.readFileSync(`src/lib/${name}.ts`, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => {
    assert.equal(name, 'lucide-react');
    return new Proxy({}, { get: (_, icon) => icon });
  } });
  return exports;
}

const tasks = loadConfig('task-config');
const ideas = loadConfig('social-config');
const migration = fs.readFileSync('supabase/migrations/00079_add_ejecutando_workflow_status.sql', 'utf8');

test('ejecutando is an active, distinct step in both canonical workflows', () => {
  for (const [order, config] of [
    [tasks.TASK_STATUSES, tasks.TASK_STATUS_CONFIG],
    [ideas.IDEA_STATUS_ORDER, ideas.STATUS_CONFIG],
  ]) {
    const index = order.indexOf('ejecutando');
    assert.equal(order[index - 1], 'listo_para_disenar');
    assert.equal(order[index + 1], 'diseno_listo');
    assert.equal(order.filter(status => status === 'ejecutando').length, 1);
    assert.deepEqual(Object.keys(config).sort(), Array.from(order).sort());
    assert.equal(config.ejecutando.label, 'Ejecutando');
    assert.equal(config.ejecutando.dotColor.startsWith('bg-fuchsia-'), true);
  }
  assert.equal(tasks.TASK_STATUS_CONFIG.ejecutando.icon, 'Play');
  assert.equal(tasks.taskStatusConfig('ejecutando'), tasks.TASK_STATUS_CONFIG.ejecutando);
  assert.equal(ideas.STATUS_CONFIG.ejecutando.group, 2);
});

test('new constraints exactly match each workflow and preserve every previous status', () => {
  for (const [table, order, previousFile] of [
    ['tasks', tasks.TASK_STATUSES, '00071_task_status_material_problem.sql'],
    ['social_ideas', ideas.IDEA_STATUS_ORDER, '00074_add_programando_status.sql'],
    ['ads_ideas', ideas.IDEA_STATUS_ORDER, '00074_add_programando_status.sql'],
  ]) {
    const pattern = new RegExp(`ADD CONSTRAINT ${table}_status_check CHECK \\(\\s*status IN \\(([^)]+)\\)`, 'i');
    const statuses = text => Array.from(text.match(pattern)[1].matchAll(/'([^']+)'/g), match => match[1]);
    assert.deepEqual(statuses(migration), Array.from(order));
    for (const status of statuses(fs.readFileSync(`supabase/migrations/${previousFile}`, 'utf8'))) {
      assert.ok(statuses(migration).includes(status), `${table}: preserved ${status}`);
    }
  }
  assert.doesNotMatch(migration, /\b(?:UPDATE|DELETE|INSERT)\b/i);
  assert.match(migration, /BEGIN;[\s\S]*COMMIT;/);
});
