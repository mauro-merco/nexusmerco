// Run with node scripts/test-description.cjs; uses the installed TypeScript compiler.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
require.extensions['.css'] = () => {};
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name, ...args);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText, filename);
};
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { MarkdownBody } = require('../src/lib/markdown.tsx');
const { descriptionMark, safeDescriptionHref, DESCRIPTION_COLORS } = require('../src/lib/description-format.ts');
const { descriptionMarkdown } = require('../src/components/task-fields.tsx');
// Minimal DOM fixtures exercise the serializer without adding a runtime dependency.
global.Node = { TEXT_NODE: 3 };
global.HTMLElement = class {
  constructor(tag, children = [], attrs = {}) {
    this.tagName = tag; this.childNodes = children; this.children = children.filter(x => x instanceof HTMLElement);
    this.dataset = attrs.dataset || {}; this.style = {}; this.classList = { contains: x => (attrs.className || '').split(' ').includes(x) };
    this.getAttribute = key => attrs[key] || null;
    children.forEach(x => { x.parentElement = this; });
  }
};
const text = value => ({ nodeType: 3, textContent: value });
const el = (tag, children, attrs) => new HTMLElement(tag, children, attrs);
const html = (value, props = {}) => renderToStaticMarkup(React.createElement(MarkdownBody, { text: value, ...props }));
const serialize = nodes => nodes.map(descriptionMarkdown).join('').trim();
const fixture = [el('P', [text('uno\ndos')]), el('SPAN', [text('\n')], { dataset: { descriptionBlank: 'true' } }), el('P', [text('tres')])];
assert.equal(serialize(fixture), 'uno\ndos\n\ntres');
assert.match(html(serialize(fixture)), /uno\ndos/);
assert.match(html(serialize(fixture)), /data-description-blank="true"/);
assert.equal((html('uno\n\n\n\ndos').match(/data-description-blank/g) || []).length, 3);
assert.equal(serialize([el('DIV', [text('uno')]), el('DIV', [el('BR', [])]), el('DIV', [text('dos')])]), 'uno\n\ndos');
assert.equal(serialize([el('H2', [text('Titulo')]), el('SPAN', [text('\n')], { dataset: { descriptionBlank: 'true' } }), el('UL', [el('LI', [text('uno')]), el('LI', [text('dos')])]), el('P', [text('fin')])]), '## Titulo\n\n- uno\n- dos\nfin');
for (const color of Object.keys(DESCRIPTION_COLORS)) for (const kind of ['highlight', 'frame']) {
  const mark = descriptionMark(kind, color, '**hola**\n\n@Ana [web](https://example.com)');
  assert.equal(serialize([el('SPAN', [el('B', [text('hola')]), text('\n\n@Ana '), el('A', [text('web')], { href: 'https://example.com' })], { dataset: { descriptionKind: kind, descriptionColor: color } })]), mark);
  const rendered = html(mark);
  assert.match(rendered, new RegExp(`data-description-kind="${kind}"`));
  assert.match(rendered, /<strong/);
  assert.match(rendered, /\n\n/);
  assert.equal((rendered.match(/<a /g) || []).length, 1);
}
assert.match(html('[un \\[texto\\]](https://example.com)'), /href="https:\/\/example.com"/);
for (const href of ['javascript:alert(1)', 'data:text/html,test', '//evil.test', '/\\evil.test', 'https://ok.test\n']) {
  assert.equal(safeDescriptionHref(href), false);
}
assert.doesNotMatch(html(descriptionMark('frame', 'blue', '<img src=x onerror=alert(1)> [x](javascript:alert)')), /<img|href="javascript:/);
assert.match(html('{{d1:frame:blue:%ZZ}}'), /%ZZ/);
assert.match(html('{{d1:frame:red:text}}'), /\{\{d1:frame:red:text\}\}/);
assert.doesNotMatch(html(descriptionMark('highlight', 'pink', '<script>alert(1)</script>')), /<script>/);
const nested = html('[https://example.com @Ana](https://example.com)', { renderMention: token => React.createElement('a', { href: '/u/a' }, token) });
assert.equal((nested.match(/<a /g) || []).length, 1);
assert.match(html('**negrita** *cursiva* ~~tachado~~ `codigo`'), /<strong/);
const blockMark = descriptionMark('frame', 'blue', 'first\n\n## Heading\n- item\nlast', true);
const blockHtml = html(`before ${blockMark} after`, { editable: true });
assert.equal((blockHtml.match(/data-description-block="true"/g) || []).length, 1);
assert.match(blockHtml, /<h2/);
assert.match(blockHtml, /<ul/);
assert.doesNotMatch(blockHtml, /<p[^>]*><div/);
assert.doesNotMatch(html(descriptionMark('highlight', 'pink', '<script>bad</script>', true)), /<script>/);
console.log('Description regressions passed: Markdown, breaks, color/frame round trips, escaping, safe links and anchor nesting.');
