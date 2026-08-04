'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const MENTION_TOKEN = /@[\p{L}\p{N}'.-]+/gu;

/** Renders text highlighting @Mentions as gradient chips. */
export function MentionedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(MENTION_TOKEN);
  const tokens = text.match(MENTION_TOKEN) || [];

  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) out.push(<span key={`t${i}`}>{parts[i]}</span>);
    if (i < tokens.length) {
      out.push(
        <span key={`m${i}`} className="bg-gradient-tech mx-0.5 inline-block rounded-md px-1.5 py-px align-baseline font-semibold text-white">
          {tokens[i]}
        </span>
      );
    }
  }

  return <span className={cn('whitespace-pre-wrap', className)}>{out}</span>;
}

export interface MentionUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}

export function MentionInput({ value, onChange, users, placeholder, onKeyDown, disabled, className }: MentionInputProps) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [caret, setCaret] = useState(-1);
  const [activeIdx, setActiveIdx] = useState(0);

  const matches =
    mentionQuery !== ''
      ? users.filter((u) => {
          const q = mentionQuery.toLowerCase();
          const name = (u.full_name || '').toLowerCase();
          const email = (u.email || '').split('@')[0].toLowerCase();
          return name.startsWith(q) || email.startsWith(q);
        }).slice(0, 6)
      : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    const pos = e.target.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const lastAt = before.lastIndexOf('@');
    if (lastAt >= 0) {
      const word = before.slice(lastAt + 1);
      if (word && !word.includes(' ') && word.length <= 30 && !/@/.test(before.slice(lastAt + 1))) {
        setMentionQuery(word);
        setCaret(lastAt);
        setActiveIdx(0);
        return;
      }
    }
    setMentionQuery('');
    setCaret(-1);
  };

  const selectUser = (u: MentionUser) => {
    if (caret < 0) return;
    const name = u.full_name || u.email || '';
    const before = value.slice(0, caret);
    const after = value.slice(caret + 1 + mentionQuery.length);
    onChange(`${before}@${name} ${after}`);
    setMentionQuery('');
    setCaret(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (mentionQuery && matches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' && matches[activeIdx]) { e.preventDefault(); selectUser(matches[activeIdx]); return; }
      if (e.key === 'Escape') { setMentionQuery(''); return; }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
      {mentionQuery && matches.length > 0 && (
        <div className="absolute bottom-full left-0 z-30 mb-1.5 w-full max-w-xs overflow-hidden rounded-lg border bg-popover shadow-xl animate-[transition-fade_0.15s_ease-out]">
          {matches.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); selectUser(u); }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn('flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors', i === activeIdx ? 'bg-muted' : 'hover:bg-muted/50')}
            >
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-gradient-tech text-white">
                  {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{u.full_name || u.email}</span>
              {u.email && u.full_name && <span className="ml-auto text-muted-foreground">{u.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
