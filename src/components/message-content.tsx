'use client';

import Link from 'next/link';
import { Fragment } from 'react';

type Part = { type: 'text' | 'link'; value: string; internal?: boolean; href?: string };

const URL_RE = /(https?:\/\/[^\s]+|\/\/[^\s]+|\/[A-Za-z0-9][^\s]*|\bwww\.[^\s]+)/g;
const TRAILING = /[.,;:!?"')\]]+$/;

function tokenize(text: string): Part[] {
  const parts: Part[] = [];
  let lastIndex = 0;
  URL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    let token = match[0];
    let trailing = '';
    const t = token.match(TRAILING);
    if (t) {
      trailing = t[0];
      token = token.slice(0, -trailing.length);
    }
    const internal = token.startsWith('/') && !token.startsWith('//');
    const href = internal ? token : token.startsWith('www.') ? `https://${token}` : token;
    if (token) parts.push({ type: 'link', value: token, internal, href });
    if (trailing) parts.push({ type: 'text', value: trailing });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ type: 'text', value: text.slice(lastIndex) });
  return parts;
}

export function MessageContent({ text, className }: { text: string; className?: string }) {
  const parts = tokenize(text || '');
  return (
    <p className={className}>
      {parts.map((part, i) => {
        if (part.type === 'text') return <Fragment key={i}>{part.value}</Fragment>;
        const linkClass = 'underline underline-offset-2 font-medium break-all hover:opacity-80';
        return part.internal ? (
          <Link key={i} href={part.href!} className={linkClass}>
            {part.value}
          </Link>
        ) : (
          <a key={i} href={part.href} target="_blank" rel="noreferrer noopener" className={linkClass}>
            {part.value}
          </a>
        );
      })}
    </p>
  );
}
