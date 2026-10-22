import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const loadDependency = createRequire(import.meta.url);

function compile(source, load = loadDependency) {
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const compiled = { exports: {} };
  new Function('require', 'module', 'exports', output)(load, compiled, compiled.exports);
  return compiled.exports;
}
const { MarkdownBody } = compile(fs.readFileSync('src/lib/markdown.tsx', 'utf8'), name => name === '@/lib/utils' ? { cn: (...values) => values.filter(Boolean).join(' ') } : loadDependency(name));
const source = fs.readFileSync('src/components/task-fields.tsx', 'utf8');
const ast = ts.createSourceFile('task-fields.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const serializer = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'descriptionMarkdown');
const { descriptionMarkdown } = compile(serializer.getText(ast));
global.Node = { TEXT_NODE: 3 };
global.HTMLElement = class {
  constructor(tag, children = [], style = {}, attrs = {}) {
    this.tagName = tag.toUpperCase(); this.childNodes = children; this.style = style; this.attrs = attrs;
    this.children = children.filter(child => child instanceof HTMLElement);
    this.classList = { contains: () => false };
    children.forEach(child => { child.parentElement = this; });
  }
  get textContent() { return this.childNodes.map(child => child.textContent).join(''); }
  getAttribute(key) { return this.attrs[key] || null; }
};
const text = value => ({ nodeType: 3, textContent: value });
const el = (tag, ...children) => new HTMLElement(tag, children.map(child => typeof child === 'string' ? text(child) : child));
const render = (value, editable = false) => renderToStaticMarkup(React.createElement(MarkdownBody, { text: value, editable }));
const cases = [
  [el('b', ' bold '), /<strong[^>]*>bold<\/strong>/],
  [el('i', 'italic'), /<em>italic<\/em>/],
  [el('b', el('i', 'both')), /<strong[^>]*><em>both<\/em><\/strong>/],
  [el('b', 'before ', el('i', 'italic')), /<strong[^>]*>before <em>italic<\/em><\/strong>/],
  [el('i', 'before ', el('b', 'bold'), ' after'), /<em>before <strong[^>]*>bold<\/strong> after<\/em>/],
  [el('h2', 'Heading'), /text-lg font-bold[^>]*>Heading/],
  [el('ul', el('li', 'one'), el('li', el('b', 'two'))), /<ul[^>]*>.*<li[^>]*>one<\/li>.*<strong[^>]*>two<\/strong>/],
  [el('ol', el('li', 'one'), el('li', 'two')), /<ol[^>]*>.*one.*two/],
  [new HTMLElement('a', [el('b', 'Link')], {}, { href: 'https://example.com/a(b)' }), /href="https:\/\/example.com\/a%28b%29".*<strong[^>]*>Link<\/strong>/],
  [el('b', 'first\nsecond'), /<strong[^>]*>first<\/strong>\n<strong[^>]*>second<\/strong>/],
  [el('span', '**literal**'), /\*\*literal\*\*/],
  [el('span', 'styled', ), /styled/],
];
for (const [node, expected] of cases) {
  const markdown = descriptionMarkdown(node).trim();
  assert.match(render(markdown), expected, markdown);
  assert.match(render(markdown, true), expected, `editable: ${markdown}`);
}
assert.match(render('## Heading', true), /^<h2/);
assert.match(render('plain text', true), /^<p/);
assert.match(render('**@Alice**'), /<strong[^>]*>@Alice<\/strong>/);
assert.doesNotMatch(render('[bad](javascript:alert%281%29)'), /href=/);
assert.doesNotMatch(render('<img src=x onerror=alert(1)>'), /<img/);
assert.equal(descriptionMarkdown(new HTMLElement('span', [text('both')], { fontWeight: '700', fontStyle: 'italic' })), '***both***');
console.log(`Passed ${cases.length} serialization/rendering cases plus semantic editing, mentions, styles and XSS checks.`);
