'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SuggestionType } from '@/lib/types';
import { SUGGESTION_TYPE_CONFIG } from '@/lib/suggestion-config';
import { Loader2, MessageSquarePlus } from 'lucide-react';

interface SuggestionComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: SuggestionType;
  onSubmit: (data: { type: SuggestionType; title: string; content: string }) => Promise<unknown>;
}

export function SuggestionComposeDialog({ open, onOpenChange, defaultType, onSubmit }: SuggestionComposeDialogProps) {
  const [type, setType] = useState<SuggestionType>(defaultType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setTitle('');
      setContent('');
      setError(null);
    }
  }, [open, defaultType]);

  const handleSave = async () => {
    if (!title.trim()) { setError('Ingresá un título'); return; }
    if (!content.trim()) { setError('Contá un poco más en detalle'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ type, title: title.trim(), content: content.trim() });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          {type === 'bug' ? 'Reportar un bug' : 'Enviar una sugerencia'}
        </DialogTitle>
        <DialogDescription>Queda registrado en el muro visible para todo el equipo.</DialogDescription>

        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SUGGESTION_TYPE_CONFIG) as SuggestionType[]).map(t => {
            const cfg = SUGGESTION_TYPE_CONFIG[t];
            const Icon = cfg.icon;
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn('flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors',
                  type === t ? cn(cfg.bgColorClass, cfg.colorClass, cfg.borderClass) : 'border-border text-muted-foreground hover:border-border/60')}>
                <Icon className="h-4 w-4" /> {cfg.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label>Título *</Label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resumen corto..."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label>Detalle *</Label>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Explicá qué idea tenés o qué falla, pasos para reproducirlo si es un bug..."
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[110px] resize-none" />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="cta" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}