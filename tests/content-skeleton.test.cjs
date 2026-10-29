const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] || require(name) });
  return exports;
}

const utils = { cn: (...classes) => classes.filter(Boolean).join(' ') };
const { Skeleton } = load('src/components/ui/skeleton.tsx', { '@/lib/utils': utils });
const { ContentSkeleton, PageSkeleton } = load('src/components/content-skeleton.tsx', {
  '@/lib/utils': utils, '@/components/ui/skeleton': { Skeleton },
});

test('all content layouts expose one loading status and hide decorative placeholders', () => {
  for (const variant of ['cards', 'list', 'comments', 'calendar', 'board', 'form', 'report']) {
    const html = renderToStaticMarkup(React.createElement(ContentSkeleton, { variant }));
    assert.equal((html.match(/role="status"/g) || []).length, 1, variant);
    assert.match(html, /class="sr-only">Cargando contenido/);
    assert.match(html, /aria-hidden="true"/);
    assert.doesNotMatch(html, /animate-spin|<button|<input/);
    assert.match(html, /motion-reduce:animate-none/);
  }
});

test('calendar reserves weekday headings and five weeks without exposing fake dates', () => {
  const html = renderToStaticMarkup(React.createElement(ContentSkeleton, { variant: 'calendar' }));
  assert.equal((html.match(/min-h-20/g) || []).length, 35);
  assert.match(html, /grid-cols-7/);
  assert.doesNotMatch(html, /lunes|martes|2026/);
});

test('page fallback supports an accessible custom content status', () => {
  const html = renderToStaticMarkup(React.createElement(PageSkeleton, { variant: 'report' }));
  assert.equal((html.match(/role="status"/g) || []).length, 1);
  const comments = renderToStaticMarkup(React.createElement(ContentSkeleton, { label: 'Cargando comentarios' }));
  assert.match(comments, /Cargando comentarios/);
});
