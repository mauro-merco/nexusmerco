'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MarkdownBody, type RenderMention } from '@/lib/markdown';
import { readPastedMarkdown, spliceAtSelection } from '@/lib/paste';

const mentionChip: RenderMention = (token, key) => (
  <span
    key={key}
    className="bg-gradient-tech mx-0.5 inline-block rounded-md px-1.5 py-px align-baseline font-semibold text-white"
  >
    {token}
  </span>
);

/**
 * Renders comment text: @mentions become gradient chips and the rest is
 * rendered as markdown, so bold / italic / lists pasted from Word or Google
 * Docs keep their shape.
 */
export function MentionedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      <MarkdownBody text={text} renderMention={mentionChip} />
    </span>
  );
}

export interface MentionUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

type MentionKeyHandler = (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;

interface MentionAutocompleteOptions {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  disabled?: boolean;
  onKeyDown?: MentionKeyHandler;
}

/**
 * Shared "@" autocomplete: tracks the word after the last @ in the field and
 * exposes the ranked matches, insertion and key handling.
 */
function useMentionAutocomplete({ value, onChange, users, disabled, onKeyDown }: MentionAutocompleteOptions) {
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

  const handleKeyDown: MentionKeyHandler = (e) => {
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
            <span className="ml-auto truncate text-muted-foreground">{u.email}</span>
          )}
        </button>
      ))}
    </div>
  );
}

interface MentionTextareaProps {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  placeholder?: string;
  onKeyDown?: MentionKeyHandler;
  disabled?: boolean;
  className?: string;
  /** Initial height before the box grows with its content. */
  rows?: number;
  /** Where to render the suggestion dropdown. Defaults to above the field. */
  dropdownPlacement?: 'above' | 'below';
}

/**
 * Comment box: grows with its content, offers @mention autocomplete, and
 * converts pasted rich text into markdown so line breaks, spacing, bold and
 * lists survive the paste.
 */
export function MentionTextarea({
  value, onChange, users, placeholder, onKeyDown, disabled, className, rows = 2, dropdownPlacement = 'above',
}: MentionTextareaProps) {
  const { open, matches, activeIdx, setActiveIdx, selectUser, track, handleKeyDown } =
    useMentionAutocomplete({ value, onChange, users, disabled, onKeyDown });

  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow: the box expands with the content instead of scrolling.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = readPastedMarkdown(e.clipboardData);
    if (pasted === null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const next = spliceAtSelection(value, el.selectionStart, el.selectionEnd, pasted);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = next.caret;
      track(next.value, next.caret);
    });
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        onChange={(e) => {
          onChange(e.target.value);
          track(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
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
