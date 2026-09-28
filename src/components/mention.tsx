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

type MentionKeyHandler<E extends HTMLInputElement | HTMLTextAreaElement> = (e: React.KeyboardEvent<E>) => void;

interface MentionAutocompleteOptions<E extends HTMLInputElement | HTMLTextAreaElement> {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  disabled?: boolean;
  onKeyDown?: MentionKeyHandler<E>;
}

/**
 * Shared "@" autocomplete: tracks the word after the last @ in the field and
 * exposes the ranked matches, insertion and key handling. Used by both
 * MentionInput and MentionTextarea so any comment box behaves the same.
 */
function useMentionAutocomplete<E extends HTMLInputElement | HTMLTextAreaElement>({
  value, onChange, users, disabled, onKeyDown,
}: MentionAutocompleteOptions<E>) {
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

  const open = mentionQuery !== '' && matches.length > 0;

  const track = (v: string, pos: number) => {
    if (disabled) {
      setMentionQuery('');
      setCaret(-1);
      return;
    }
    const before = v.slice(0, pos);
    const lastAt = before.lastIndexOf('@');
    if (lastAt >= 0) {
      const word = before.slice(lastAt + 1);
      if (word && !word.includes(' ') && word.length <= 30 && !word.includes('@')) {
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

  const handleKeyDown: MentionKeyHandler<E> = (e) => {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => (i + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => (i - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' && matches[activeIdx]) { e.preventDefault(); selectUser(matches[activeIdx]); return; }
      if (e.key === 'Escape') { setMentionQuery(''); return; }
    }
    onKeyDown?.(e);
  };

  return { open, matches, activeIdx, setActiveIdx, selectUser, track, handleKeyDown };
}

function MentionDropdown({
  matches,
  activeIdx,
  onSelect,
  onHover,
  placement,
}: {
  matches: MentionUser[];
  activeIdx: number;
  onSelect: (u: MentionUser) => void;
  onHover: (i: number) => void;
  placement: 'above' | 'below';
}) {
  return (
    <div
      className={cn(
        'absolute left-0 z-30 w-full max-w-xs overflow-hidden rounded-lg border bg-popover shadow-xl animate-[transition-fade_0.15s_ease-out]',
        placement === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
      )}
    >
      {matches.map((u, i) => (
        <button
          key={u.id}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(u); }}
          onMouseEnter={() => onHover(i)}
          className={cn(
            'flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors',
            i === activeIdx ? 'bg-muted' : 'hover:bg-muted/50'
          )}
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[8px] bg-gradient-tech text-white">
              {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{u.full_name || u.email}</span>
          {u.email && u.full_name && (
            <span className="ml-auto text-muted-foreground truncate">{u.email}</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  /** Where to render the suggestion dropdown. Defaults to above the field. */
  dropdownPlacement?: 'above' | 'below';
}

export function MentionInput({
  value, onChange, users, placeholder, onKeyDown, disabled, className, autoFocus, dropdownPlacement = 'above',
}: MentionInputProps) {
  const { open, matches, activeIdx, setActiveIdx, selectUser, track, handleKeyDown } =
    useMentionAutocomplete<HTMLInputElement>({ value, onChange, users, disabled, onKeyDown });

  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
      {open && (
        <MentionDropdown
          matches={matches}
          activeIdx={activeIdx}
          onSelect={selectUser}
          onHover={setActiveIdx}
          placement={dropdownPlacement}
        />
      )}
    </div>
  );
}

interface MentionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled?: boolean;
  className?: string;
  rows?: number;
  /** Where to render the suggestion dropdown. Defaults to above the field. */
  dropdownPlacement?: 'above' | 'below';
}

/** Multi-line variant of MentionInput, for comment boxes. */
export function MentionTextarea({
  value, onChange, users, placeholder, onKeyDown, disabled, className, rows = 3, dropdownPlacement = 'above',
}: MentionTextareaProps) {
  const { open, matches, activeIdx, setActiveIdx, selectUser, track, handleKeyDown } =
    useMentionAutocomplete<HTMLTextAreaElement>({ value, onChange, users, disabled, onKeyDown });

  return (
    <div className="relative w-full">
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
      {open && (
        <MentionDropdown
          matches={matches}
          activeIdx={activeIdx}
          onSelect={selectUser}
          onHover={setActiveIdx}
          placement={dropdownPlacement}
        />
      )}
    </div>
  );
}
