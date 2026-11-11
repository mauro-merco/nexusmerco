'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListChecks, Code2,
  Quote, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3, Heading4, Type,
  ImagePlus, Link2, Loader2, Undo2, Redo2, Table2, Minus, Info, AlertTriangle, CheckCircle2,
  OctagonAlert, ChevronDown, Check, type LucideIcon,
} from 'lucide-react';
import './document-content.css';

type BlockCmd = {
  key: string;
  label: string;
  icon: LucideIcon;
  group: 'Convertir en' | 'Listas' | 'Banners' | 'Insertar';
  shortcut?: string;
  keywords?: string;
};

const BLOCK_CMDS: BlockCmd[] = [
  { key: 'p', label: 'Texto', icon: Type, group: 'Convertir en', keywords: 'texto parrafo normal' },
  { key: 'h1', label: 'Título 1', icon: Heading1, group: 'Convertir en', shortcut: 'Alt+Ctrl+1', keywords: 'titulo heading h1' },
  { key: 'h2', label: 'Título 2', icon: Heading2, group: 'Convertir en', shortcut: 'Alt+Ctrl+2', keywords: 'titulo heading h2' },
  { key: 'h3', label: 'Título 3', icon: Heading3, group: 'Convertir en', shortcut: 'Alt+Ctrl+3', keywords: 'titulo heading h3' },
  { key: 'h4', label: 'Título 4', icon: Heading4, group: 'Convertir en', shortcut: 'Alt+Ctrl+4', keywords: 'titulo heading h4' },
  { key: 'blockquote', label: 'Cita', icon: Quote, group: 'Convertir en', keywords: 'cita quote' },
  { key: 'pre', label: 'Bloque de código', icon: Code2, group: 'Convertir en', keywords: 'codigo code' },
  { key: 'ul', label: 'Lista', icon: List, group: 'Listas', keywords: 'lista viñetas bullet' },
  { key: 'ol', label: 'Lista numerada', icon: ListOrdered, group: 'Listas', keywords: 'lista numerada' },
  { key: 'checklist', label: 'Lista de tareas', icon: ListChecks, group: 'Listas', keywords: 'checklist tareas check pendientes' },
  { key: 'callout-info', label: 'Banner info', icon: Info, group: 'Banners', keywords: 'banner callout info' },
  { key: 'callout-warning', label: 'Banner aviso', icon: AlertTriangle, group: 'Banners', keywords: 'banner callout aviso importante warning' },
  { key: 'callout-success', label: 'Banner éxito', icon: CheckCircle2, group: 'Banners', keywords: 'banner callout ok exito decision' },
  { key: 'callout-danger', label: 'Banner alerta', icon: OctagonAlert, group: 'Banners', keywords: 'banner callout alerta error' },
  { key: 'table', label: 'Tabla', icon: Table2, group: 'Insertar', keywords: 'tabla table' },
  { key: 'hr', label: 'Divisor', icon: Minus, group: 'Insertar', keywords: 'divisor linea separador' },
];

const BLOCK_LABEL: Record<string, string> = {
  p: 'Texto', h1: 'Título 1', h2: 'Título 2', h3: 'Título 3', h4: 'Título 4',
  blockquote: 'Cita', pre: 'Código', ul: 'Lista', ol: 'Lista numerada', checklist: 'Tareas', callout: 'Banner',
};

const INLINE_TOOLS: { icon: LucideIcon; label: string; cmd: string }[] = [
  { icon: Bold, label: 'Negrita (Ctrl+B)', cmd: 'bold' },
  { icon: Italic, label: 'Cursiva (Ctrl+I)', cmd: 'italic' },
  { icon: Underline, label: 'Subrayado (Ctrl+U)', cmd: 'underline' },
  { icon: Strikethrough, label: 'Tachado', cmd: 'strikeThrough' },
];

const ALIGN_TOOLS: { icon: LucideIcon; label: string; cmd: string }[] = [
  { icon: AlignLeft, label: 'Izquierda', cmd: 'justifyLeft' },
  { icon: AlignCenter, label: 'Centro', cmd: 'justifyCenter' },
  { icon: AlignRight, label: 'Derecha', cmd: 'justifyRight' },
];

function ToolBtn({ icon: Icon, label, onClick, active, className }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-foreground/75 transition-colors hover:bg-muted hover:text-foreground', active && 'bg-muted text-foreground', className)}
    >
      <Icon className="h-[15px] w-[15px]" />
    </button>
  );
}

function wordCount(html: string) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

export function DocumentEditor({
  initialContent,
  onChange,
  readOnly = false,
  onGenerateImage,
  className,
  placeholder = 'Escribí algo, o presioná "/" para insertar títulos, listas, tablas o banners…',
  compact = false,
}: {
  initialContent: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  onGenerateImage?: (context: string, html: string) => Promise<{ url: string; alt: string }>;
  className?: string;
  placeholder?: string;
  /** Sin borde ni fondo propio (para usar dentro de un pop-up). */
  compact?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isExternalUpdate = useRef(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [blockType, setBlockType] = useState('p');
  const [convertRect, setConvertRect] = useState<DOMRect | null>(null);
  const convertOpen = !!convertRect;
  const setConvertOpen = (_open: false) => setConvertRect(null);
  const convertBtnRef = useRef<HTMLButtonElement>(null);
  const [slash, setSlash] = useState<{ top: number; left: number; query: string; index: number } | null>(null);
  const [words, setWords] = useState(() => wordCount(initialContent || ''));
  const [empty, setEmpty] = useState(() => !(initialContent || '').replace(/<[^>]*>/g, '').trim());

  // Solo reemplazamos el HTML cuando cambia desde afuera (evita saltos del cursor).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML === initialContent) return;
    isExternalUpdate.current = true;
    el.innerHTML = initialContent || '';
    isExternalUpdate.current = false;
    setWords(wordCount(initialContent || ''));
    setEmpty(!(initialContent || '').replace(/<[^>]*>/g, '').trim() && !/<(img|table|hr)/i.test(initialContent || ''));
  }, [initialContent]);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el || isExternalUpdate.current) return;
    const html = el.innerHTML;
    setWords(wordCount(html));
    setEmpty(!el.textContent?.trim() && !el.querySelector('img,table,hr,li'));
    onChange(html);
  }, [onChange]);

  /** Bloque de primer nivel (hijo directo del editor) donde está el cursor. */
  const topBlock = useCallback((): HTMLElement | null => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (!el.contains(node)) return null;
    while (node && node.parentNode !== el) node = node.parentNode;
    return node instanceof HTMLElement ? node : null;
  }, []);

  const closestInEditor = useCallback((selector: string): HTMLElement | null => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.rangeCount) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
    const found = (node as HTMLElement | null)?.closest?.(selector) as HTMLElement | null;
    return found && el.contains(found) ? found : null;
  }, []);

  // Detectar el tipo de bloque actual para la etiqueta "Convertir en".
  useEffect(() => {
    if (readOnly) return;
    const onSel = () => {
      const el = editorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || !sel.rangeCount || !el.contains(sel.anchorNode)) return;
      const check = closestInEditor('ul[data-type="checklist"]');
      if (check) return setBlockType('checklist');
      if (closestInEditor('.doc-callout')) return setBlockType('callout');
      const b = closestInEditor('h1,h2,h3,h4,blockquote,pre,ul,ol');
      setBlockType(b ? b.tagName.toLowerCase() : 'p');
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [readOnly, closestInEditor]);

  const exec = useCallback((cmd: string, value?: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (cmd === 'createLink') {
      const url = window.prompt('URL del enlace:');
      if (url) document.execCommand('createLink', false, /^https?:\/\//i.test(url) ? url : `https://${url}`);
    } else {
      document.execCommand(cmd, false, value);
    }
    emit();
  }, [emit]);

  const placeCaret = useCallback((node: Node, atEnd = true) => {
    const sel = window.getSelection();
    if (!sel) return;
    const r = document.createRange();
    r.selectNodeContents(node);
    r.collapse(!atEnd);
    sel.removeAllRanges();
    sel.addRange(r);
  }, []);

  const runBlock = useCallback((key: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    if (['p', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(key)) {
      // Salir de un banner si corresponde
      document.execCommand('formatBlock', false, key);
    } else if (key === 'ul' || key === 'ol') {
      const check = closestInEditor('ul[data-type="checklist"]');
      if (check && key === 'ul') { check.removeAttribute('data-type'); check.querySelectorAll('li').forEach(li => li.removeAttribute('data-checked')); }
      else document.execCommand(key === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
    } else if (key === 'checklist') {
      let list = closestInEditor('ul');
      if (!list) {
        const ol = closestInEditor('ol');
        if (ol) document.execCommand('insertOrderedList');
        document.execCommand('insertUnorderedList');
        list = closestInEditor('ul');
      }
      if (list) {
        list.setAttribute('data-type', 'checklist');
        list.querySelectorAll(':scope > li').forEach(li => { if (!li.hasAttribute('data-checked')) li.setAttribute('data-checked', 'false'); });
      }
    } else if (key.startsWith('callout-')) {
      const tone = key.replace('callout-', '');
      const existing = closestInEditor('.doc-callout');
      if (existing) {
        existing.setAttribute('data-tone', tone);
      } else {
        const block = topBlock();
        const box = document.createElement('div');
        box.className = 'doc-callout';
        box.setAttribute('data-tone', tone);
        if (block) {
          block.replaceWith(box);
          box.appendChild(block.tagName === 'DIV' ? Object.assign(document.createElement('p'), { innerHTML: block.innerHTML || '<br>' }) : block);
        } else {
          box.innerHTML = '<p><br></p>';
          el.appendChild(box);
        }
        const after = document.createElement('p');
        after.innerHTML = '<br>';
        if (!box.nextSibling) box.after(after);
        placeCaret(box.lastChild || box);
      }
    } else if (key === 'table') {
      const cells = (n: number) => Array.from({ length: n }, () => '<td><br></td>').join('');
      document.execCommand('insertHTML', false,
        `<table><tbody><tr>${cells(3)}</tr><tr>${cells(3)}</tr><tr>${cells(3)}</tr></tbody></table><p><br></p>`);
    } else if (key === 'hr') {
      document.execCommand('insertHorizontalRule');
    }
    emit();
  }, [closestInEditor, topBlock, placeCaret, emit]);

  /* ---------- Menú "/" ---------- */
  const slashItems = useMemo(() => {
    if (!slash) return [];
    const q = slash.query.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (!q) return BLOCK_CMDS;
    return BLOCK_CMDS.filter(c => `${c.label} ${c.keywords || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q));
  }, [slash]);

  const chooseSlash = useCallback((cmd: BlockCmd) => {
    const block = topBlock();
    const target = closestInEditor('li,p,h1,h2,h3,h4,div,blockquote,pre') || block;
    if (target && target.textContent?.startsWith('/')) {
      target.innerHTML = '<br>';
      placeCaret(target, false);
    }
    setSlash(null);
    runBlock(cmd.key);
  }, [topBlock, closestInEditor, placeCaret, runBlock]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (slash) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlash(s => s && ({ ...s, index: Math.min(s.index + 1, Math.max(slashItems.length - 1, 0)) })); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlash(s => s && ({ ...s, index: Math.max(s.index - 1, 0) })); return; }
      if (e.key === 'Enter') { e.preventDefault(); const c = slashItems[slash.index]; if (c) chooseSlash(c); else setSlash(null); return; }
      if (e.key === 'Escape') { e.preventDefault(); setSlash(null); return; }
    }
    if (e.altKey && (e.ctrlKey || e.metaKey) && ['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      runBlock(`h${e.key}`);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      const li = closestInEditor('ul[data-type="checklist"] > li');
      if (li) setTimeout(() => { const cur = closestInEditor('ul[data-type="checklist"] > li'); if (cur && cur !== li) cur.setAttribute('data-checked', 'false'); }, 0);
    }
  }, [slash, slashItems, chooseSlash, runBlock, closestInEditor]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key) && slash) return;
    const target = closestInEditor('li,p,h1,h2,h3,h4,blockquote,pre,td') || topBlock();
    const text = target?.textContent || '';
    if (text.startsWith('/') && text.length <= 24 && !/\s/.test(text)) {
      const sel = window.getSelection();
      let rect: DOMRect | null = null;
      if (sel && sel.rangeCount) {
        const r = sel.getRangeAt(0).cloneRange();
        const rects = r.getClientRects();
        rect = rects.length ? rects[rects.length - 1] : null;
      }
      if (!rect || (!rect.width && !rect.height)) rect = target?.getBoundingClientRect() || null;
      if (!rect) return;
      const top = Math.min(rect.bottom + 6, window.innerHeight - 340);
      const left = Math.min(rect.left, window.innerWidth - 280);
      setSlash(s => ({ top, left, query: text.slice(1), index: s && s.query === text.slice(1) ? s.index : 0 }));
    } else if (slash) {
      setSlash(null);
    }
  }, [slash, closestInEditor, topBlock]);

  // Click en el casillero de una lista de tareas → marcar / desmarcar.
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const li = (e.target as HTMLElement).closest?.('ul[data-type="checklist"] > li') as HTMLElement | null;
    if (!li || readOnly) return;
    const r = li.getBoundingClientRect();
    if (e.clientX - r.left <= 22) {
      e.preventDefault();
      li.setAttribute('data-checked', li.getAttribute('data-checked') === 'true' ? 'false' : 'true');
      emit();
    }
  }, [readOnly, emit]);

  const insertGeneratedImage = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || !onGenerateImage || generatingImage) return;
    const selection = window.getSelection();
    const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const range = selectedRange && editor.contains(selectedRange.commonAncestorContainer) ? selectedRange.cloneRange() : null;
    const contextElement = range?.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range?.commonAncestorContainer as HTMLElement | undefined;
    const context = contextElement?.closest('p, h1, h2, h3, li, blockquote')?.textContent || editor.innerText.slice(0, 500);

    setGeneratingImage(true);
    try {
      const image = await onGenerateImage(context, editor.innerHTML);
      editor.focus();
      if (range && selection) { selection.removeAllRanges(); selection.addRange(range); }
      else placeCaret(editor);
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      document.execCommand('insertHTML', false,
        `<figure><img src="${esc(image.url)}" alt="${esc(image.alt)}" style="width:100%;height:auto;border-radius:12px" /><figcaption>${esc(image.alt)}</figcaption></figure><p><br></p>`);
      emit();
    } catch {
      // El padre muestra el error de la API.
    } finally {
      setGeneratingImage(false);
    }
  }, [generatingImage, emit, onGenerateImage, placeCaret]);


  const menuList = (items: BlockCmd[], onPick: (c: BlockCmd) => void, activeKey?: string, highlight?: number) => {
    let lastGroup = '';
    return items.map((c, i) => {
      const showGroup = c.group !== lastGroup;
      lastGroup = c.group;
      const Icon = c.icon;
      return (
        <div key={c.key}>
          {showGroup && <p className="px-3 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">{c.group}</p>}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(c)}
            className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-1.5 text-left text-sm hover:bg-muted', highlight === i && 'bg-muted')}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">{c.label}</span>
            {c.shortcut && <span className="text-[10px] text-muted-foreground">{c.shortcut}</span>}
            {activeKey === c.key && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>
        </div>
      );
    });
  };

  return (
    <div className={cn('relative flex flex-col', !compact && 'overflow-hidden rounded-[1.25rem] border border-border bg-card', className)}>
      {!readOnly && (
        <div className={cn('sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5', compact ? 'rounded-2xl border border-border bg-card/95 shadow-sm backdrop-blur' : 'border-b border-border bg-card/95 backdrop-blur')}>
          <button
            ref={convertBtnRef}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setConvertRect(r => r ? null : convertBtnRef.current?.getBoundingClientRect() ?? null)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-foreground/80 hover:bg-muted"
            title="Convertir el bloque en…"
          >
            {BLOCK_LABEL[blockType] || 'Texto'} <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          <span className="mx-1 h-5 w-px bg-border" />
          {INLINE_TOOLS.map(t => <ToolBtn key={t.cmd} icon={t.icon} label={t.label} onClick={() => exec(t.cmd)} />)}
          <ToolBtn icon={Code2} label="Código en línea" onClick={() => {
            const sel = window.getSelection();
            const text = sel?.toString();
            if (text) exec('insertHTML', `<code>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</code>&nbsp;`);
          }} />
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolBtn icon={List} label="Lista" onClick={() => runBlock('ul')} active={blockType === 'ul'} />
          <ToolBtn icon={ListOrdered} label="Lista numerada" onClick={() => runBlock('ol')} active={blockType === 'ol'} />
          <ToolBtn icon={ListChecks} label="Lista de tareas" onClick={() => runBlock('checklist')} active={blockType === 'checklist'} />
          <span className="mx-1 h-5 w-px bg-border" />
          {ALIGN_TOOLS.map(t => <ToolBtn key={t.cmd} icon={t.icon} label={t.label} onClick={() => exec(t.cmd)} />)}
          <span className="mx-1 h-5 w-px bg-border" />
          <ToolBtn icon={Link2} label="Enlace" onClick={() => exec('createLink')} />
          <ToolBtn icon={Table2} label="Tabla" onClick={() => runBlock('table')} />
          <ToolBtn icon={Info} label="Banner" onClick={() => runBlock('callout-info')} active={blockType === 'callout'} />
          {onGenerateImage && (
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-primary hover:bg-muted disabled:opacity-60"
              title="Generar e insertar una imagen con IA"
              disabled={generatingImage}
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertGeneratedImage}
            >
              {generatingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} Imagen IA
            </button>
          )}
          <span className="ml-auto flex items-center gap-0.5">
            <ToolBtn icon={Undo2} label="Deshacer" onClick={() => exec('undo')} />
            <ToolBtn icon={Redo2} label="Rehacer" onClick={() => exec('redo')} />
          </span>
        </div>
      )}

      <div className="relative flex-1">
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          data-empty={empty && !readOnly ? 'true' : 'false'}
          data-placeholder={placeholder}
          className={cn('doc-content min-h-[420px] px-6 py-5 outline-none md:px-10', compact && 'px-1 md:px-2', readOnly && 'cursor-default')}
          onInput={emit}
          onBlur={emit}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onMouseDown={handleMouseDown}
        />
      </div>

      <div className={cn('flex items-center justify-end gap-3 px-4 py-2 text-[11px] text-muted-foreground', !compact && 'border-t border-border')}>
        <span>{words} palabra{words === 1 ? '' : 's'}</span>
        <span>·</span>
        <span>{Math.max(1, Math.round(words / 200))} min de lectura</span>
      </div>

      {convertOpen && convertRect && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[300]" onMouseDown={() => setConvertOpen(false)} />
          <div
            style={{ top: Math.min(convertRect.bottom + 6, window.innerHeight - 420), left: Math.min(convertRect.left, window.innerWidth - 270) }}
            className="fixed z-[301] max-h-[min(420px,70vh)] w-[260px] overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-xl"
          >
            {menuList(BLOCK_CMDS, (c) => { setConvertOpen(false); runBlock(c.key); }, blockType)}
          </div>
        </>,
        document.body
      )}

      {slash && slashItems.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          style={{ top: slash.top, left: slash.left }}
          className="fixed z-[301] max-h-[320px] w-[260px] overflow-auto rounded-2xl border border-border bg-popover p-1.5 shadow-xl"
        >
          {menuList(slashItems, chooseSlash, undefined, slash.index)}
        </div>,
        document.body
      )}
    </div>
  );
}
