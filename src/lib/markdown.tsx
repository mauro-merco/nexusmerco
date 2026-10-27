import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DESCRIPTION_COLORS, safeDescriptionHref, type DescriptionColor } from './description-format';

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
  /(\{\{d1:(?:highlight|frame):(?:yellow|blue|green|pink|violet):[^{}\s]*\}\}|\\[\\*_[\]`~#>+.!()-]|\*\*\*[^*\n]+\*\*\*|\*\*(?:\*[^*\n]+\*|[^*\n])+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[(?:\\.|[^\]\\\n])+\]\([^)\s]+\)|\*(?:\*\*[^*\n]+\*\*|[^*\n])+\*|https?:\/\/[^\s`<>]+|www\.[^\s`<>]+)/gi;

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
  return safeDescriptionHref(href);
}

export type RenderMention = (token: string, key: string) => ReactNode;
export type RenderText = (text: string, key: string) => ReactNode;

const defaultRenderMention: RenderMention = (token, key) => <Fragment key={key}>{token}</Fragment>;
const defaultRenderText: RenderText = (text, key) => <Fragment key={key}>{text}</Fragment>;

function renderInlineChunk(chunk: string, keyBase: string, renderMention: RenderMention, renderText: RenderText, allowLinks = true, depth = 0): ReactNode[] {
   if (depth > 24) return [renderText(chunk, keyBase)];
  const out: ReactNode[] = [];
    const text = chunk;
    let cursor = 0;
    let tokenIdx = 0;
    let textIdx = 0;
    for (const match of text.matchAll(INLINE_TOKEN)) {
      const start = match.index ?? 0;
      if (start > cursor) out.push(renderText(text.slice(cursor, start), `${keyBase}-x${textIdx++}`));
      const token = match[0];
      const key = `${keyBase}-t${tokenIdx++}`;

      if (token.startsWith('{{d1:')) {
        const [, kind, color, payload] = token.slice(2, -2).split(':');
        try {
          const ink = DESCRIPTION_COLORS[color as DescriptionColor];
          out.push(<span key={key} data-description-kind={kind} data-description-color={color} style={{ backgroundColor: kind === 'highlight' ? `${ink}40` : undefined, border: kind === 'frame' ? `2px solid ${ink}` : undefined, borderRadius: '4px', padding: '0 2px', boxDecorationBreak: 'clone', whiteSpace: 'pre-wrap' }}>{renderInlineChunk(decodeURIComponent(payload), key, renderMention, renderText, allowLinks, depth + 1)}</span>);
        } catch { out.push(renderText(token, key)); }
      } else if (token.startsWith('\\')) {
        out.push(renderText(token.slice(1), key));
      } else if (token.startsWith('***')) {
        out.push(<strong key={key} className="font-bold text-foreground"><em>{renderInlineChunk(token.slice(3, -3), key, renderMention, renderText, allowLinks)}</em></strong>);
      } else if (/^(https?:\/\/|www\.)/i.test(token)) {
        const trailing = token.match(/[.,;:!?)\]]+$/)?.[0] ?? '';
        const raw = trailing ? token.slice(0, token.length - trailing.length) : token;
        const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
        out.push(allowLinks
          ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 break-all hover:opacity-80">{raw}</a>
          : renderText(raw, key));
        if (trailing) out.push(renderText(trailing, `${keyBase}-tr${tokenIdx++}`));
      } else if (token.startsWith('**') || token.startsWith('__')) {
        out.push(<strong key={key} className="font-bold text-foreground">{renderInlineChunk(token.slice(2, -2), key, renderMention, renderText, allowLinks)}</strong>);
      } else if (token.startsWith('~~')) {
        out.push(<s key={key} className="text-muted-foreground">{token.slice(2, -2)}</s>);
      } else if (token.startsWith('`')) {
        out.push(<code key={key} className="rounded bg-muted px-1 py-px font-mono text-[0.85em] text-foreground">{token.slice(1, -1)}</code>);
      } else if (token.startsWith('[')) {
        const split = token.indexOf('](');
        const label = token.slice(1, split);
        const href = token.slice(split + 2, -1);
        out.push(!allowLinks
          ? <Fragment key={key}>{renderInlineChunk(label, key, renderMention, renderText, false)}</Fragment>
          : isSafeHref(href)
            ? <a key={key} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-2 hover:opacity-80">{renderInlineChunk(label, key, defaultRenderMention, (value, k) => <Fragment key={k}>{value}</Fragment>, false)}</a>
            : label);
      } else {
        out.push(<em key={key}>{renderInlineChunk(token.slice(1, -1), key, renderMention, renderText, allowLinks)}</em>);
      }
      cursor = start + token.length;
    }
    if (cursor < text.length) out.push(renderText(text.slice(cursor), `${keyBase}-x${textIdx++}`));
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
  editable?: boolean;
}

const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;
const HEADING_CLS = ['text-xl font-bold', 'text-lg font-bold', 'text-base font-semibold'];

export function MarkdownBody({ text, renderMention = defaultRenderMention, renderText = defaultRenderText, className, editable = false }: MarkdownBodyProps) {
  const blocks = /\{\{d2:(highlight|frame):(yellow|blue|green|pink|violet):([^{}\s]*)\}\}/g;
  const matches = Array.from(text.matchAll(blocks));
  if (matches.length) {
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const match of matches) {
      const start = match.index!;
      if (start > cursor) parts.push(<MarkdownBody key={`before${start}`} text={text.slice(cursor, start).replace(/\n$/, '')} {...{ renderMention, renderText, editable }} />);
      try {
        const payload = decodeURIComponent(match[3]).replace(/\n$/, '');
        const ink = DESCRIPTION_COLORS[match[2] as DescriptionColor];
        parts.push(<div key={start} data-description-kind={match[1]} data-description-color={match[2]} data-description-block="true" style={{ borderRadius: 6, padding: 8, backgroundColor: match[1] === 'highlight' ? `${ink}40` : undefined, border: match[1] === 'frame' ? `2px solid ${ink}` : undefined }}><MarkdownBody text={payload} {...{ renderMention, renderText, editable }} /></div>);
      } catch { parts.push(<Fragment key={start}>{match[0]}</Fragment>); }
      cursor = start + match[0].length;
    }
    if (cursor < text.length) parts.push(<MarkdownBody key="after" text={text.slice(cursor).replace(/\n$/, '')} {...{ renderMention, renderText, editable }} />);
    return <div data-description-root="true" className={className}>{parts}</div>;
  }
  const plainText = renderText;
  renderText = (value, key) => <Fragment key={key}>{tokenizeAtoms(value).map((atom, i) => <Fragment key={`${key}-${i}`}>{atom.kind === 'mention' ? renderMention(atom.value, `${key}-${i}`) : plainText(atom.value, `${key}-${i}`)}</Fragment>)}</Fragment>;
  const inline = (t: string, k: string) => renderInline(t, k, renderMention, renderText);
  // Fast path: no block constructs -> flat inline nodes; newlines preserved.
  const hasBlockConstructs =
    /^\s*(?:[-*]\s|\d+[.)]\s|>\s?|```|#{1,3}\s)/m.test(text) || /\n[ \t]*\n/.test(text);

  if (!hasBlockConstructs) {
    if (editable) return <p className="whitespace-pre-wrap">{inline(text, 'flat')}</p>;
    return <span className={cn('whitespace-pre-wrap', className)}>{inline(text, 'flat')}</span>;
  }

  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const content = paragraph.join('\n');
    paragraph = [];
    const Paragraph = editable ? 'p' : 'span';
    out.push(<Paragraph key={`p${out.length}`} className="block whitespace-pre-wrap">{inline(content, `p${out.length}`)}</Paragraph>);
  };

  for (let i = 0; i < lines.length; ) {
    const line = lines[i];

    if (!line.trim()) { flushParagraph(); out.push(<span key={`blank${out.length}`} data-description-blank="true" className="block whitespace-pre-wrap">{'\n'}</span>); i++; continue; }

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
      const Heading = editable ? h[1].length === 1 ? 'h1' : h[1].length === 2 ? 'h2' : 'h3' : 'span';
      out.push(<Heading key={`h${out.length}`} className={cn('mt-1 block', HEADING_CLS[h[1].length - 1])}>{inline(h[2], `h${out.length}`)}</Heading>);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) { body.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      const Quote = editable ? 'blockquote' : 'span';
      out.push(<Quote key={`q${out.length}`} className="block whitespace-pre-wrap border-l-2 border-border pl-2.5 text-muted-foreground">{inline(body.join('\n'), `q${out.length}`)}</Quote>);
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
  if (editable) return <>{out}</>;
  return <span className={cn('block', className)}>{out}</span>;
}
