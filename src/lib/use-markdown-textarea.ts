'use client';

import { useEffect, useRef } from 'react';
import { readPastedMarkdown, spliceAtSelection } from './paste';

interface UseMarkdownTextareaOptions {
  value: string;
  onChange: (v: string) => void;
  /** Notified with the value and caret on every edit and after a paste. */
  onCaret?: (value: string, caret: number) => void;
  /** Grow the box with its content instead of scrolling. Defaults to true. */
  autoGrow?: boolean;
}

/**
 * Shared textarea behavior for every rich-text field: converts pasted
 * formatted text into markdown (keeping line breaks, spacing, bold and lists)
 * and optionally grows the box with its content.
 */
export function useMarkdownTextarea({
  value, onChange, onCaret, autoGrow = true,
}: UseMarkdownTextareaOptions) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!autoGrow) return;
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, autoGrow]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    onCaret?.(next, e.target.selectionStart ?? next.length);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = readPastedMarkdown(e.clipboardData);
    if (pasted === null) return;
    e.preventDefault();
    const el = e.currentTarget;
    const next = spliceAtSelection(value, el.selectionStart, el.selectionEnd, pasted);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = next.caret;
      onCaret?.(next.value, next.caret);
    });
  };

  return { ref, handleChange, handlePaste };
}
