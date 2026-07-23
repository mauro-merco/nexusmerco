'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PostType, IdeaStatus, Responsable } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, RESPONSABLE_CONFIG } from '@/lib/social-config';
import { Loader2, User } from 'lucide-react';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'historia', label: 'Historia' },
  { value: 'reel', label: 'Reel' },
  { value: 'carrusel', label: 'Carrusel' },
];

interface SocialNewIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string | null;
  onCreateIdea: (data: {
    title: string;
    description?: string;
    brief?: string;
    eje_contenido?: string;
    responsable?: Responsable;
    post_type: PostType;
    status?: IdeaStatus;
    publish_date: string;
  }) => Promise<unknown>;
}

export function SocialNewIdeaDialog({ open, onOpenChange, initialDate, onCreateIdea }: SocialNewIdeaDialogProps) {
  const [responsable, setResponsable] = useState<Responsable>('mau');
  const [publishDate, setPublishDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [ejeContenido, setEjeContenido] = useState('');
  const [brief, setBrief] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState<PostType>('historia');
  const [status, setStatus] = useState<IdeaStatus>('borrador');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPublishDate(initialDate || new Date().toISOString().split('T')[0]);
      setResponsable('mau');
      setEjeContenido('');
      setBrief('');
      setDescription('');
      setPostType('historia');
      setStatus('borrador');
      setError(null);
    }
  }, [open, initialDate]);

  const handleSave = async () => {
    if (!ejeContenido.trim() && !brief.trim() && !description.trim()) {
      setError('Completá al menos un campo de contenido');
      return;
    }
    if (!publishDate) { setError('Seleccioná una fecha'); return; }
    setSaving(true);
    setError(null);
    try {
      await onCreateIdea({
        title: ejeContenido.trim() || brief.trim().slice(0, 50) || 'Sin título',
        description: description.trim(),
        brief: brief.trim(),
        eje_contenido: ejeContenido.trim(),
        responsable,
        post_type: postType,
        status,
        publish_date: publishDate,
      });
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
        <DialogTitle>Nueva Idea de Publicación</DialogTitle>
        <DialogDescription>Creá una nueva idea para el calendario de redes</DialogDescription>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Responsable *</Label>
            <div className="flex gap-2">
              {(['nico', 'mau'] as Responsable[]).map(r => {
                const cfg = RESPONSABLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResponsable(r)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm transition-colors font-medium',
                      responsable === r
                        ? cfg.colorClass
                        : 'border-border text-muted-foreground hover:border-border/60',
                    )}
                  >
                    <User className="h-4 w-4" /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Fecha de publicación *</Label>
            <Input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de publicación *</Label>
            <div className="flex gap-2">
              {POST_TYPES.map(pt => {
                const cfg = POST_TYPE_CONFIG[pt.value];
                const Icon = cfg.icon;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPostType(pt.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors',
                      postType === pt.value
                        ? cfg.bgColorClass + ' ' + cfg.colorClass + ' font-medium'
                        : 'border-border hover:border-border/60 text-muted-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" /> {pt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Eje de contenido *</Label>
            <Input
              placeholder="Ej: Promoción de verano, Tips de productividad..."
              value={ejeContenido}
              onChange={(e) => setEjeContenido(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Brief</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
              placeholder="Descripción general de la publicación..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Guión / Descripción</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-none"
              placeholder="Guión detallado o descripción del contenido..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Estado</Label>
            <div className="space-y-2">
              <div className="flex gap-1.5 flex-wrap">
                {(['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada'] as IdeaStatus[]).map(key => {
                  const s = STATUS_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs transition-colors font-medium',
                        status === key ? s.colorClass : 'border-border text-muted-foreground hover:border-border/60',
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['listo_para_postear', 'posteado'] as IdeaStatus[]).map(key => {
                  const s = STATUS_CONFIG[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-xs transition-colors font-medium',
                        status === key ? s.colorClass : 'border-border text-muted-foreground hover:border-border/60',
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Crear Idea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
