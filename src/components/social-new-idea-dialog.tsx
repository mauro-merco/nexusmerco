'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PostType, IdeaStatus, User, WorkRole } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG } from '@/lib/social-config';
import { TaskRolesPicker, emptyRoles, rolesToList, type TaskRolesState } from '@/components/task-roles-picker';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Calendar, Users2, FileText, ListChecks } from 'lucide-react';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'historia', label: 'Historia' },
  { value: 'reel', label: 'Reel' },
  { value: 'carrusel', label: 'Carrusel' },
  { value: 'sugerencia', label: 'Sugerencia' },
];

const CONTENT_TABS = [
  { key: 'brief', label: 'Brief', placeholder: 'Descripción general de la publicación...' },
  { key: 'copy', label: 'Copy', placeholder: 'Texto del copy para la publicación...' },
  { key: 'description', label: 'Guión', placeholder: 'Guión detallado o descripción del contenido...' },
] as const;
type ContentTabKey = typeof CONTENT_TABS[number]['key'];

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
  const [contentTab, setContentTab] = useState<ContentTabKey>('brief');
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
      setContentTab('brief');
      setError(null);
    }
  }, [open, initialDate]);

  const contentValues: Record<ContentTabKey, string> = { brief, copy: copyText, description };
  const contentSetters: Record<ContentTabKey, (v: string) => void> = { brief: setBrief, copy: setCopyText, description: setDescription };

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
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg md:w-[min(92vw,680px)] md:max-w-none rounded-2xl p-0">
        <div className="px-6 pt-6 pb-4">
          <DialogTitle>{calendarType === 'ads' ? 'Nueva pieza ADS' : 'Nueva idea de publicación'}</DialogTitle>
          <DialogDescription>Creá contenido y definí quién responde, ejecuta y controla</DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* Section: qué / cuándo */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {POST_TYPES.map(pt => {
                const cfg = POST_TYPE_CONFIG[pt.value];
                const Icon = cfg.icon;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPostType(pt.value)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      postType === pt.value ? cfg.bgColorClass + ' ' + cfg.colorClass + ' font-semibold' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {pt.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/35 px-3 py-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  type="date"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <Input
                placeholder="Eje de contenido: Promoción de verano..."
                value={ejeContenido}
                onChange={(e) => setEjeContenido(e.target.value)}
                className="rounded-xl bg-muted/35 border-0 h-[42px]"
              />
            </div>
          </div>

          {/* Section: contenido (tabs) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Contenido
            </div>
            <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
              {CONTENT_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setContentTab(tab.key)}
                  className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-colors', contentTab === tab.key ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <textarea
              className="w-full rounded-xl bg-muted/30 px-3.5 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px] resize-none"
              placeholder={CONTENT_TABS.find(t => t.key === contentTab)!.placeholder}
              value={contentValues[contentTab]}
              onChange={(e) => contentSetters[contentTab](e.target.value)}
            />
          </div>

          {/* Section: equipo */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Users2 className="h-3.5 w-3.5" /> Equipo asignado
            </div>
            <TaskRolesPicker roles={roles} onChange={setRoles} users={users} />
          </div>

          {/* Section: estado */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Estado
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['borrador', 'en_revision', 'necesita_modificaciones', 'aprobada', 'listo_para_postear', 'posteado'] as IdeaStatus[]).map(key => {
                const s = STATUS_CONFIG[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    className={cn('rounded-lg px-2.5 py-1.5 text-xs transition-colors font-medium', status === key ? s.colorClass : 'bg-muted/40 text-muted-foreground hover:bg-muted/60')}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t border-border/40">
          <DialogClose render={<Button variant="outline" className="rounded-lg" />}>Cancelar</DialogClose>
          <Button onClick={handleSave} variant="default" disabled={saving} className="rounded-lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {calendarType === 'ads' ? 'Crear pieza' : 'Crear idea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
