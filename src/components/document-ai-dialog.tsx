'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Sparkles, Plus, ArrowLeftRight } from 'lucide-react';

export type AiInsertMode = 'append' | 'replace';

const TONES: { value: string; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'persuasivo', label: 'Persuasivo' },
];

const LENGTHS: { value: string; label: string }[] = [
  { value: 'breve', label: 'Breve (2-4 párrafos)' },
  { value: 'normal', label: 'Normal (~1 página)' },
  { value: 'extenso', label: 'Extenso (varias secciones)' },
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Asistente IA
          </DialogTitle>
          <DialogDescription>
            Contale al asistente la temática del documento y generá el contenido con un clic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Temática / instrucción</label>
            <Textarea
              placeholder="Ej: Estrategia de contenido para Instagram de una marca de moda sostenible"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tono</label>
              <Select value={tone} onValueChange={(v) => { if (v) setTone(v); }}>
                <SelectTrigger className="w-full justify-between">
                  <span className="flex-1 text-left truncate">{TONES.find((t) => t.value === tone)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Extensión</label>
              <Select value={length} onValueChange={(v) => { if (v) setLength(v); }}>
                <SelectTrigger className="w-full justify-between">
                  <span className="flex-1 text-left truncate">{LENGTHS.find((l) => l.value === length)?.label}</span>
                </SelectTrigger>
                <SelectContent>
                  {LENGTHS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Destino</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'append' ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => setMode('append')}
              >
                <Plus className="h-3.5 w-3.5" /> Insertar al final
              </Button>
              <Button
                type="button"
                variant={mode === 'replace' ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => setMode('replace')}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" /> Reemplazar
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={generate} variant="cta" disabled={loading || !theme.trim()} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generando...' : 'Generar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
