import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal markdown renderer (comments, descriptions).
 *
 * Supports: headings (#, ##, ###), paragraphs with preserved line breaks,
 * bullet/ordered lists, blockquotes, fenced code and inline **bold**, *italic*,
 * ~~strike~~, `code` and [links](url). Everything is built from React elements,
 * so any HTML in the source is rendered as literal text.
 */

const MENTION_TOKEN = /@[\p{L}\p{N}'.-]+/gu;

// Single-underscore italics are intentionally not supported (snake_case words).
const INLINE_TOKEN =
  /(\*\*(?:[^*\n]|\*(?!\*))+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*|https?:\/\/[^\s`<>]+|www\.[^\s`<>]+)/gi;

type Atom = { kind: 'mention' | 'text'; value: string };

export function tokenizeAtoms(text: string): Atom[] {
  const atoms: Atom[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MENTION_TOKEN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) atoms.push({ kind: 'text', value: text.slice(lastIndex, start) });
    atoms.push({ kind: 'mention', value: match[0] });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) atoms.push({ kind: 'text', value: text.slice(lastIndex) });
  return atoms;
}

function isSafeHref(href: string): boolean {
  return /^(https?:|mailto:|\/|#)/i.test(href.trim());
}

export type RenderMention = (token: string, key: string) => ReactNode;
export type RenderText = (text: string, key: string) => ReactNode;

const defaultRenderMention: RenderMention = (token, key) => <Fragment key={key}>{token}</Fragment>;
const defaultRenderText: RenderText = (text, key) => <Fragment key={key}>{text}</Fragment>;

function renderInlineChunk(chunk: string, keyBase: string, renderMention: RenderMention, renderText: RenderText): ReactNode[] {
  const out: ReactNode[] = [];
  tokenizeAtoms(chunk).forEach((atom, atomIdx) => {
    if (atom.kind === 'mention') {
      out.push(renderMention(atom.value, `${keyBase}-m${atomIdx}`));
      return;
    }
    const text = atom.value;
    let cursor = 0;
    let tokenIdx = 0;
    let textIdx = 0;
    for (const match of text.matchAll(INLINE_TOKEN)) {
      const start = match.index ?? 0;
      if (start > cursor) out.push(renderText(text.slice(cursor, start), `${keyBase}-x${atomIdx}-${textIdx++}`));
      const token = match[0];
      const key = `${keyBase}-t${atomIdx}-${tokenIdx++}`;

      if (/^(https?:\/\/|www\.)/i.test(token)) {
        const trailing = token.match(/[.,;:!?)\]]+$/)?.[0] ?? '';
        const raw = trailing ? token.slice(0, token.length - trailing.length) : token;
        const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
        out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 break-all hover:opacity-80">{raw}</a>);
        if (trailing) out.push(renderText(trailing, `${keyBase}-tr${atomIdx}-${tokenIdx++}`));
      } else if (token.startsWith('**') || token.startsWith('__')) {
        out.push(<strong key={key} className="font-bold text-foreground">{renderInlineChunk(token.slice(2, -2), key, renderMention, renderText)}</strong>);
      } else if (token.startsWith('~~')) {
        out.push(<s key={key} className="text-muted-foreground">{token.slice(2, -2)}</s>);
      } else if (token.startsWith('`')) {
        out.push(<code key={key} className="rounded bg-muted px-1 py-px font-mono text-[0.85em] text-foreground">{token.slice(1, -1)}</code>);
      } else if (token.startsWith('[')) {
        const split = token.indexOf('](');
        const label = token.slice(1, split);
        const href = token.slice(split + 2, -1);
        out.push(isSafeHref(href)
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 hover:opacity-80">{label}</a>
          : label);
      } else {
        out.push(<em key={key}>{token.slice(1, -1)}</em>);
      }
      cursor = start + token.length;
    }
    if (cursor < text.length) out.push(renderText(text.slice(cursor), `${keyBase}-x${atomIdx}-${textIdx++}`));
  });
  return out;
}

function renderInline(text: string, keyBase: string, renderMention: RenderMention, renderText: RenderText): ReactNode {
  return <>{renderInlineChunk(text, keyBase, renderMention, renderText)}</>;
}

export interface MarkdownBodyProps {
  text: string;
  renderMention?: RenderMention;
  renderText?: RenderText;
  className?: string;
}

const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;
const HEADING_CLS = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold'];

export function MarkdownBody({ text, renderMention = defaultRenderMention, renderText = defaultRenderText, className }: MarkdownBodyProps) {
  const inline = (t: string, k: string) => renderInline(t, k, renderMention, renderText);
  // Fast path: no block constructs -> flat inline nodes; newlines preserved.
  const hasBlockConstructs =
    /^\s*(?:[-*]\s|\d+[.)]\s|>\s?|```|#{1,3}\s)/m.test(text) || /\n[ \t]*\n/.test(text);

  if (!hasBlockConstructs) {
    return <span className={cn('whitespace-pre-wrap', className)}>{inline(text, 'flat')}</span>;
  }

  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n');
    paragraph = [];
    out.push(<span key={`p${out.length}`} className="block whitespace-pre-wrap">{inline(content, `p${out.length}`)}</span>);
  };

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (!line.trim()) { flushParagraph(); i++; continue; }

    if (line.trim().startsWith('```')) {
      flushParagraph();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { body.push(lines[i]); i++; }
      i++;
      out.push(<pre key={`code${out.length}`} className="block overflow-x-auto rounded-lg bg-muted p-2.5 font-mono text-[0.8em] text-foreground">{body.join('\n')}</pre>);
      continue;
    }

    const h = line.match(HEADING);
    if (h) {
      flushParagraph();
      out.push(<span key={`h${out.length}`} className={cn('mt-1 block', HEADING_CLS[h[1].length - 1])}>{inline(h[2], `h${out.length}`)}</span>);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { body.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push(<span key={`q${out.length}`} className="block whitespace-pre-wrap border-l-2 border-border pl-2.5 text-muted-foreground">{inline(body.join('\n'), `q${out.length}`)}</span>);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(<li key={`li${out.length}-${items.length}`} className="whitespace-pre-wrap">{inline(content, `li${out.length}-${items.length}`)}</li>);
        i++;
      }
      out.push(<ul key={`ul${out.length}`} className="list-disc space-y-0.5 pl-5">{items}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+[.)]\s+/, '');
        items.push(<li key={`oli${out.length}-${items.length}`} className="whitespace-pre-wrap">{inline(content, `oli${out.length}-${items.length}`)}</li>);
        i++;
      }
      out.push(<ol key={`ol${out.length}`} className="list-decimal space-y-0.5 pl-5">{items}</ol>);
      continue;
    }

    paragraph.push(line);
    i++;
  }

  flushParagraph();

  // Blocks are separated by a real gap so blank lines in the source are visible.
  return <span className={cn('flex flex-col gap-2.5', className)}>{out}</span>;
}
