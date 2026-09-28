'use client';

import { useMarkdownTextarea } from '@/lib/use-markdown-textarea';
import { cn } from '@/lib/utils';

interface MarkdownTextareaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Initial height before the box grows with its content. */
  rows?: number;
  /** Grow with the content instead of scrolling. Defaults to true. */
  autoGrow?: boolean;
}

/**
 * Plain rich-text field (no @mentions): keeps line breaks, spacing, bold and
 * lists when you paste formatted text from Word, Google Docs or elsewhere.
 */
export function MarkdownTextarea({
  value, onChange, placeholder, disabled, className, rows = 2, autoGrow = true,
}: MarkdownTextareaProps) {
  const { ref, handleChange, handlePaste } = useMarkdownTextarea({ value, onChange, autoGrow });

  return (
    <textarea
      ref={ref}
      value={value}
      rows={rows}
      onChange={handleChange}
      onPaste={handlePaste}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full rounded-xl bg-muted/35 px-3 py-2 text-sm outline-none',
        autoGrow ? 'resize-none overflow-hidden' : 'resize-y',
        className
      )}
    />
  );
}
