'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3,
  Link2, Undo2, Redo2,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type Tool = {
  icon: React.ReactNode;
  label: string;
  cmd: string;
  value?: string;
};

const TOOLS: Tool[] = [
  { icon: <Bold className="h-3.5 w-3.5" />, label: 'Negrita', cmd: 'bold' },
  { icon: <Italic className="h-3.5 w-3.5" />, label: 'Cursiva', cmd: 'italic' },
  { icon: <Underline className="h-3.5 w-3.5" />, label: 'Subrayado', cmd: 'underline' },
  { icon: <Strikethrough className="h-3.5 w-3.5" />, label: 'Tachado', cmd: 'strikeThrough' },
];

const HEADING_TOOLS: Tool[] = [
  { icon: <Heading1 className="h-3.5 w-3.5" />, label: 'Título 1', cmd: 'formatBlock', value: 'h1' },
  { icon: <Heading2 className="h-3.5 w-3.5" />, label: 'Título 2', cmd: 'formatBlock', value: 'h2' },
  { icon: <Heading3 className="h-3.5 w-3.5" />, label: 'Título 3', cmd: 'formatBlock', value: 'h3' },
];

const LIST_TOOLS: Tool[] = [
  { icon: <List className="h-3.5 w-3.5" />, label: 'Lista', cmd: 'insertUnorderedList' },
  { icon: <ListOrdered className="h-3.5 w-3.5" />, label: 'Lista numerada', cmd: 'insertOrderedList' },
  { icon: <Quote className="h-3.5 w-3.5" />, label: 'Cita', cmd: 'formatBlock', value: 'blockquote' },
];

const ALIGN_TOOLS: Tool[] = [
  { icon: <AlignLeft className="h-3.5 w-3.5" />, label: 'Izquierda', cmd: 'justifyLeft' },
  { icon: <AlignCenter className="h-3.5 w-3.5" />, label: 'Centro', cmd: 'justifyCenter' },
  { icon: <AlignRight className="h-3.5 w-3.5" />, label: 'Derecha', cmd: 'justifyRight' },
];

export function DocumentEditor({
  initialContent,
  onChange,
  readOnly = false,
}: {
  initialContent: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isExternalUpdate = useRef(false);

  // Update the editor's content only when initialContent changes from outside
  // (not from user input), to avoid cursor jumps
  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML === initialContent) return;
    isExternalUpdate.current = true;
    editorRef.current.innerHTML = initialContent;
    isExternalUpdate.current = false;
  }, [initialContent]);

  const exec = useCallback((cmd: string, value?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (cmd === 'createLink') {
      const url = window.prompt('URL del enlace:');
      if (url) document.execCommand(cmd, false, url);
      return;
    }
    document.execCommand(cmd, false, value);
    if (onChange && el.innerHTML) onChange(el.innerHTML);
  }, [onChange]);

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (isExternalUpdate.current) return;
    if (onChange) onChange(e.currentTarget.innerHTML);
  }, [onChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (isExternalUpdate.current) return;
    if (onChange) onChange(e.currentTarget.innerHTML);
  }, [onChange]);

  const ToolbarGroup = ({ tools }: { tools: Tool[] }) => (
    <div className="flex items-center gap-0.5">
      {tools.map((t) => (
        <Button
          key={t.label}
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={t.label}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec(t.cmd, t.value)}
        >
          {t.icon}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col rounded-lg border overflow-hidden bg-background">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
          <ToolbarGroup tools={TOOLS} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarGroup tools={HEADING_TOOLS} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarGroup tools={LIST_TOOLS} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <ToolbarGroup tools={ALIGN_TOOLS} />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Enlace"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec('createLink')}
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Deshacer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec('undo')}
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Rehacer"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec('redo')}
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        className={cn(
          'prose prose-sm max-w-none flex-1 min-h-[500px] overflow-y-auto p-6 outline-none leading-relaxed',
          readOnly && 'cursor-default'
        )}
        style={{
          fontSize: '1rem',
          color: 'var(--foreground)',
        }}
        onInput={handleInput}
        onBlur={handleBlur}
      />
    </div>
  );
}
