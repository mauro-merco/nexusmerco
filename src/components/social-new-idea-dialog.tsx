'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { PostType, IdeaStatus, User, WorkRole } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { TaskRolesPicker, emptyRoles, rolesToList, type TaskRolesState } from '@/components/task-roles-picker';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

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
    copy_text?: string;
    post_type: PostType;
    status?: IdeaStatus;
    publish_date: string;
    author_id?: string;
    assignees: { id: string; role: WorkRole }[];
  }) => Promise<unknown>;
  users: User[];
  calendarType?: 'social' | 'ads';
}

export function SocialNewIdeaDialog({ open, onOpenChange, initialDate, onCreateIdea, users, calendarType = 'social' }: SocialNewIdeaDialogProps) {
  const { user } = useAuthStore();
  const [roles, setRoles] = useState<TaskRolesState>(emptyRoles);
  const [publishDate, setPublishDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [ejeContenido, setEjeContenido] = useState('');
  const [brief, setBrief] = useState('');
  const [copyText, setCopyText] = useState('');
  const [description, setDescription] = useState('');
  const [postType, setPostType] = useState<PostType>('historia');
  const [status, setStatus] = useState<IdeaStatus>('borrador');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPublishDate(initialDate || new Date().toISOString().split('T')[0]);
      setRoles(emptyRoles());
      setEjeContenido('');
      setBrief('');
      setCopyText('');
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
    if (!roles.lead.length || !roles.executor.length || !roles.reviewer.length) {
      setError('Asigná al menos una persona como responsable, ejecutor y control');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreateIdea({
        title: ejeContenido.trim() || brief.trim().slice(0, 50) || 'Sin título',
        description: description.trim(),
        brief: brief.trim(),
        eje_contenido: ejeContenido.trim(),
        copy_text: copyText.trim(),
        post_type: postType,
        status,
        publish_date: publishDate,
        author_id: user?.id,
        assignees: rolesToList(roles),
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
      <DialogContent className="flex max-h-[92dvh] flex-col overflow-hidden sm:max-w-lg md:aspect-video md:w-[min(92vw,1120px)] md:max-w-none">
        <DialogTitle>{calendarType === 'ads' ? 'Nueva pieza ADS' : 'Nueva idea de publicación'}</DialogTitle>
        <DialogDescription>Creá contenido y definí quién responde, ejecuta y controla</DialogDescription>

        <div className="grid gap-4 overflow-y-auto py-2 pr-1 md:grid-cols-2 md:content-start">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Equipo asignado *</Label>
            <TaskRolesPicker roles={roles} onChange={setRoles} users={users} />
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
            <Label>COPY</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
              placeholder="Texto del copy para la publicación..."
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
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

        <DialogFooter className="shrink-0">
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="cta" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {calendarType === 'ads' ? 'Crear pieza' : 'Crear idea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
