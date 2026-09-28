/**
 * Paste handling for comment boxes.
 *
 * The goal is that pasting from Word / Google Docs / a code editor keeps the
 * shape of the text: line breaks, multiple spaces, bold, italic and lists.
 * Everything is normalized to a small markdown subset, so nothing HTML-ish is
 * ever stored or rendered.
 */

/** Replaces non-breaking spaces, normalizes newlines and trims excess blank lines. */
export function normalizePastedText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeHref(raw: string | null): string | null {
  if (!raw) return null;
  const href = raw.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(href)) return href;
  return null;
}

function wrap(inner: string, marker: string): string {
  const trimmed = inner.trim();
  if (!trimmed) return '';
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map(line => `${marker}${line}${marker}`)
      .join('\n');
  }
  return `${marker}${trimmed}${marker}`;
}

/** Serializes a pasted HTML fragment into the supported markdown subset. */
function serialize(node: Node): string {
  if (node.nodeType === 3) return (node.textContent || '').replace(/\u00A0/g, ' ');
  if (node.nodeType !== 1) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'HEAD') return '';
  if (tag === 'BR') return '\n';
  if (tag === 'IMG') {
    const alt = el.getAttribute('alt')?.trim();
    return alt ? `[${alt}]` : '';
  }

  const inner = Array.from(el.childNodes).map(serialize).join('');

  switch (tag) {
    case 'B':
    case 'STRONG':
      return wrap(inner, '**');
    case 'I':
    case 'EM':
      return wrap(inner, '*');
    case 'DEL':
    case 'S':
    case 'STRIKE':
      return wrap(inner, '~~');
    case 'CODE':
      return el.closest('pre') ? inner : wrap(inner, '`');
    case 'PRE':
      return `\n\n\`\`\`\n${inner.trim()}\n\`\`\`\n\n`;
    case 'A': {
      const href = safeHref(el.getAttribute('href'));
      if (!href) return inner;
      const label = inner.trim() || href;
      return `[${label}](${href})`;
    }
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
      return `\n\n**${inner.trim()}**\n\n`;
    case 'BLOCKQUOTE':
      return `\n\n${inner
        .trim()
        .split('\n')
        .map(line => `> ${line.trim()}`)
        .join('\n')}\n\n`;
    case 'LI': {
      const parent = el.parentElement;
      const ordered = parent?.tagName.toUpperCase() === 'OL';
      const position = parent ? Array.from(parent.children).indexOf(el) + 1 : 1;
      return `\n${ordered ? `${position}.` : '-'} ${inner.trim()}\n`;
    }
    case 'UL':
    case 'OL':
      return `\n${inner}\n`;
    case 'TD':
    case 'TH':
      return `${inner.trim()} | `;
    case 'TR':
      return `${inner.replace(/[ \t]*\|[ \t]*$/, '')}\n`;
    case 'TABLE':
    case 'TBODY':
    case 'THEAD':
    case 'TFOOT':
      return `\n${inner.trim()}\n\n`;
    case 'P':
    case 'DIV':
    case 'SECTION':
    case 'ARTICLE':
    case 'HEADER':
    case 'FOOTER':
    case 'MAIN':
    case 'ASIDE':
    case 'FIGURE':
    case 'FORM':
    case 'BODY':
    case 'HTML':
      return `\n\n${inner}\n\n`;
    case 'HR':
      return '\n\n---\n\n';
    default:
      return inner;
  }
}

/**
 * Reads the clipboard and returns the markdown to insert, or null when the
 * paste should fall through to the browser default. Prefers text/html so the
 * bold/italic/lists survive, and falls back to plain text otherwise.
 */
export function readPastedMarkdown(clipboardData: DataTransfer): string | null {
  const html = clipboardData.getData('text/html');
  const plain = clipboardData.getData('text/plain');

  if (html) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const markdown = normalizePastedText(serialize(doc.body));
      if (markdown) return markdown;
    } catch {
      /* fall through to plain text */
    }
  }

  if (plain) {
    const normalized = normalizePastedText(plain);
    if (normalized) return normalized;
  }

  return null;
}

/** Replaces the current selection with `insert`, returning the new value and caret offset. */
export function spliceAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string
): { value: string; caret: number } {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  return { value: `${before}${insert}${after}`, caret: before.length + insert.length };
}
