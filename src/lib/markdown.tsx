import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Minimal markdown renderer for comments.
 *
 * Supports: paragraphs, bullet/ordered lists, blockquotes, fenced code,
 * and inline **bold**, *italic*, ~~strike~~, `code` and [links](url).
 * Everything is built from React elements, so any HTML in the source is
  * rendered as literal text — there is no dangerouslySetInnerHTML anywhere.
 */

const MENTION_TOKEN = /@[\p{L}\p{N}'.-]+/gu;

// Single-underscore italics are intentionally not supported: otherwise
// snake_case words like `mi_variable` would render as italic.
const INLINE_TOKEN =
  /(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\n]+\*)/g;

type Atom = { kind: 'mention' | 'text'; value: string };

/** Splits text into @mention tokens and plain runs, preserving order. */
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

/** Renders a run of plain text, so callers can highlight search matches in it. */
export type RenderText = (text: string, key: string) => ReactNode;

const defaultRenderMention: RenderMention = (token, key) => <Fragment key={key}>{token}</Fragment>;

const defaultRenderText: RenderText = (text, key) => <Fragment key={key}>{text}</Fragment>;

function renderInlineChunk(
  chunk: string,
  keyBase: string,
  renderMention: RenderMention,
  renderText: RenderText,
): ReactNode[] {
  const out: ReactNode[] = [];
  const atoms = tokenizeAtoms(chunk);

  atoms.forEach((atom, atomIdx) => {
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
      if (start > cursor) {
        out.push(renderText(text.slice(cursor, start), `${keyBase}-x${atomIdx}-${textIdx++}`));
      }
      const token = match[0];
      const key = `${keyBase}-t${atomIdx}-${tokenIdx++}`;

      if (token.startsWith('**') || token.startsWith('__')) {
        out.push(<strong key={key} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('~~')) {
        out.push(<s key={key} className="text-muted-foreground">{token.slice(2, -2)}</s>);
      } else if (token.startsWith('`')) {
        out.push(
          <code key={key} className="rounded bg-muted px-1 py-px font-mono text-[0.85em] text-foreground">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith('[')) {
        const split = token.indexOf('](');
        const label = token.slice(1, split);
        const href = token.slice(split + 2, -1);
        out.push(
          isSafeHref(href) ? (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {label}
            </a>
          ) : (
            label
          )
        );
      } else {
        out.push(<em key={key}>{token.slice(1, -1)}</em>);
      }
      cursor = start + token.length;
    }
    if (cursor < text.length) {
      out.push(renderText(text.slice(cursor), `${keyBase}-x${atomIdx}-${textIdx++}`));
    }
  });

  return out;
}

function renderInline(
  text: string,
  keyBase: string,
  renderMention: RenderMention,
  renderText: RenderText,
): ReactNode {
  return <>{renderInlineChunk(text, keyBase, renderMention, renderText)}</>;
}

export interface MarkdownBodyProps {
  text: string;
  /** Renders an @mention token, so the caller can style it as a chip. */
  renderMention?: RenderMention;
  /** Renders plain text runs, so the caller can highlight a search query. */
  renderText?: RenderText;
  className?: string;
}

/** Renders markdown as a vertical stack of blocks. */
export function MarkdownBody({
  text,
  renderMention = defaultRenderMention,
  renderText = defaultRenderText,
  className,
}: MarkdownBodyProps) {
  const inline = (t: string, k: string) => renderInline(t, k, renderMention, renderText);
  // Fast path: no block constructs, so render flat inline nodes. This keeps the
  // DOM shallow and lets callers use line-clamp / whitespace normally.
  const hasBlockConstructs =
    /^\s*(?:[-*]\s|\d+[.)]\s|>\s?|```)/m.test(text) || /\n[ \t]*\n/.test(text);

  if (!hasBlockConstructs) {
    return (
      <span className={cn('whitespace-pre-wrap', className)}>
        {inline(text, 'flat')}
      </span>
    );
  }

  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n');
    paragraph = [];
    out.push(
      <span key={`p${out.length}`} className="block whitespace-pre-wrap">
        {inline(content, `p${out.length}`)}
      </span>
    );
  };

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (!line.trim()) {
      flushParagraph();
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith('```')) {
      flushParagraph();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre
          key={`code${out.length}`}
          className="block overflow-x-auto rounded-lg bg-muted p-2.5 font-mono text-[0.8em] text-foreground"
        >
          {body.join('\n')}
        </pre>
      );
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(
        <span
          key={`q${out.length}`}
          className="block whitespace-pre-wrap border-l-2 border-border pl-2.5 text-muted-foreground"
        >
          {inline(body.join('\n'), `q${out.length}`)}
        </span>
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(
          <li key={`li${out.length}-${items.length}`} className="whitespace-pre-wrap">
            {inline(content, `li${out.length}-${items.length}`)}
          </li>
        );
        i++;
      }
      out.push(
        <ul key={`ul${out.length}`} className="my-1 list-disc space-y-0.5 pl-5">
          {items}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        const content = lines[i].replace(/^\s*\d+[.)]\s+/, '');
        items.push(
          <li key={`oli${out.length}-${items.length}`} className="whitespace-pre-wrap">
            {inline(content, `oli${out.length}-${items.length}`)}
          </li>
        );
        i++;
      }
      out.push(
        <ol key={`ol${out.length}`} className="my-1 list-decimal space-y-0.5 pl-5">
          {items}
        </ol>
      );
      continue;
    }

    paragraph.push(line);
    i++;
  }

  flushParagraph();

  return <span className={className}>{out}</span>;
}
