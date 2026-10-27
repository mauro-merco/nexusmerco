// Versioned Markdown extension. Payloads are encoded Markdown, never HTML.
export const DESCRIPTION_COLORS = {
  yellow: '#eab308', blue: '#3b82f6', green: '#22c55e', pink: '#ec4899', violet: '#8b5cf6',
} as const;
export type DescriptionColor = keyof typeof DESCRIPTION_COLORS;
// Split only selected text nodes; unselected content retains its inline semantics.
export function formatDescriptionRange(editor: HTMLElement, range: Range, kind: 'highlight' | 'frame', color: DescriptionColor | null): Range | null {
  if (range.collapsed || !editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;
  const blockSelection = range.toString().includes('\n') || Array.from(range.cloneContents().querySelectorAll('p,div,h1,h2,h3,ul,ol,blockquote,pre,br')).length > 0;
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) if (range.intersectsNode(walker.currentNode)) nodes.push(walker.currentNode as Text);
  const selected: Text[] = [];
  for (const node of nodes) {
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (end <= start) continue;
    if (end < node.length) node.splitText(end);
    const text = start ? node.splitText(start) : node;
    // Isolate the selected branch from existing marks, preserving inline semantics.
    let branch: Node = text;
    while (branch.parentElement !== editor && branch.parentElement?.closest('[data-description-kind]') && editor.contains(branch.parentElement)) {
      const parent = branch.parentElement;
      const before = parent.cloneNode(false);
      const after = parent.cloneNode(false);
      while (parent.firstChild && parent.firstChild !== branch) before.appendChild(parent.firstChild);
      while (branch.nextSibling) after.appendChild(branch.nextSibling);
      parent.before(before);
      parent.after(after);
      if (parent.hasAttribute('data-description-kind')) parent.replaceWith(branch);
      if (!before.hasChildNodes()) before.parentNode?.removeChild(before);
      if (!after.hasChildNodes()) after.parentNode?.removeChild(after);
      if (!parent.hasAttribute('data-description-kind')) branch = parent;
    }
    if (color && !blockSelection) {
      const host = document.createElement('span');
      host.dataset.descriptionKind = kind;
      host.dataset.descriptionColor = color;
      host.style.cssText = `border-radius:4px;padding:0 2px;box-decoration-break:clone;${kind === 'frame' ? `border:2px solid ${DESCRIPTION_COLORS[color]}` : `background-color:${DESCRIPTION_COLORS[color]}40`}`;
      text.before(host);
      host.append(text);
    }
    selected.push(text);
  }
  if (!selected.length) return null;
  const result = document.createRange();
  result.setStart(selected[0], 0);
  result.setEnd(selected[selected.length - 1], selected[selected.length - 1].length);
  if (color && blockSelection) {
    // Clone each side independently so partial paragraphs never put a div inside a p.
    const before = document.createRange();
    before.selectNodeContents(editor);
    before.setEnd(result.startContainer, result.startOffset);
    const after = document.createRange();
    after.selectNodeContents(editor);
    after.setStart(result.endContainer, result.endOffset);
    const host = document.createElement('div');
    host.dataset.descriptionKind = kind;
    host.dataset.descriptionColor = color;
    host.dataset.descriptionBlock = 'true';
    host.style.cssText = `border-radius:6px;padding:8px;${kind === 'frame' ? `border:2px solid ${DESCRIPTION_COLORS[color]}` : `background-color:${DESCRIPTION_COLORS[color]}40`}`;
    let content: Node = result.cloneContents();
    let ancestor = result.commonAncestorContainer instanceof HTMLElement ? result.commonAncestorContainer : result.commonAncestorContainer.parentElement;
    while (ancestor && ancestor !== editor) {
      if (!ancestor.dataset.descriptionKind) {
        const shell = ancestor.cloneNode(false);
        shell.appendChild(content);
        content = shell;
      }
      ancestor = ancestor.parentElement;
    }
    host.append(content);
    editor.replaceChildren(before.cloneContents(), host, after.cloneContents());
    result.selectNodeContents(host);
  }
  return result;
}
export function descriptionMark(kind: 'highlight' | 'frame', color: DescriptionColor, text: string, block = false): string {
  return `{{${block ? 'd2' : 'd1'}:${kind}:${color}:${encodeURIComponent(text).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16)}`)}}}`;
}
export function safeDescriptionHref(href: string): boolean {
  return !/[\u0000-\u0020\u007f\\]/.test(href) && /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href);
}
