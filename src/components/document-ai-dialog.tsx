'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Plus, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiInsertMode = 'append' | 'replace';

const TONES: { value: string; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'persuasivo', label: 'Persuasivo' },
];

const LENGTHS: { value: string; label: string }[] = [
  { value: 'breve', label: 'Breve' },
  { value: 'normal', label: 'Normal' },
  { value: 'extenso', label: 'Extenso' },
];

export function DocumentAiDialog({
  open,
  onOpenChange,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (html: string, mode: AiInsertMode) => void;
}) {
  const { token } = useAuthStore();
  const [theme, setTheme] = useState('');
  const [tone, setTone] = useState('profesional');
  const [length, setLength] = useState('normal');
  const [mode, setMode] = useState<AiInsertMode>('append');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!theme.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ theme: theme.trim(), tone, length }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Error al generar contenido');
      if (!json?.data?.html) throw new Error('No se generó contenido');
      onGenerated(json.data.html, mode);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al generar contenido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Asistente IA
          </DialogTitle>
          <DialogDescription>
            Contale al asistente la temática del documento y generá el contenido con un clic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Temática / instrucción</label>
            <Textarea
              placeholder="Ej: Estrategia de contenido para Instagram de una marca de moda sostenible"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              rows={3}
              className="rounded-xl border-0 bg-muted/50 dark:bg-white/[0.05]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tono</label>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      tone === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 dark:bg-white/[0.05] text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Extensión</label>
              <div className="flex flex-wrap gap-1.5">
                {LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLength(l.value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      length === l.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 dark:bg-white/[0.05] text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Destino</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('append')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'append' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 dark:bg-white/[0.05] text-muted-foreground hover:text-foreground'
                )}
              >
                <Plus className="h-3.5 w-3.5" /> Insertar al final
              </button>
              <button
                type="button"
                onClick={() => setMode('replace')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'replace' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 dark:bg-white/[0.05] text-muted-foreground hover:text-foreground'
                )}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Reemplazar
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={generate} disabled={loading || !theme.trim()} className="gap-2 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generando...' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
