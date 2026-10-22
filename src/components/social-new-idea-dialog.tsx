'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PostType, IdeaStatus, User, WorkRole } from '@/lib/types';
import { POST_TYPE_CONFIG, STATUS_CONFIG, IDEA_STATUS_ORDER } from '@/lib/social-config';
import { TaskRolesPicker, emptyRoles, rolesToList, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { useAuthStore } from '@/store/auth-store';
import { Scroller, Menu, type MenuOption } from '@/components/task-ui';
import { Module, DateTimeField, DescriptionEditor } from '@/components/task-fields';
import { Loader2, Shapes, CalendarDays, ListChecks, Users2, ChevronDown } from 'lucide-react';

const POST_TYPE_OPTIONS: MenuOption[] = (Object.keys(POST_TYPE_CONFIG) as PostType[]).map(k => {
  const c = POST_TYPE_CONFIG[k];
  return { key: k, label: c.label, icon: c.icon, colorClass: c.colorClass };
});
const STATUS_OPTIONS: MenuOption[] = IDEA_STATUS_ORDER.map(k => {
  const s = STATUS_CONFIG[k];
  return { key: k, label: s.label, dot: s.dotColor, bgClass: s.colorClass };
});

const CONTENT_TABS = [
  { key: 'brief', label: 'Brief', placeholder: 'Descripción general de la publicación...' },
  { key: 'description', label: 'Guión', placeholder: 'Guión detallado o descripción del contenido...' },
  { key: 'copy', label: 'Copy', placeholder: 'Texto del copy para la publicación...' },
] as const;
type ContentTabKey = typeof CONTENT_TABS[number]['key'];

interface SocialNewIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: string | null;
  onCreateIdea: (data: {
    title: string; description?: string; brief?: string; eje_contenido?: string; copy_text?: string;
    post_type: PostType; status?: IdeaStatus; publish_date: string; author_id?: string;
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
  const [teamOpen, setTeamOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPublishDate(initialDate || new Date().toISOString().split('T')[0]);
      setRoles(emptyRoles()); setEjeContenido(''); setBrief(''); setCopyText(''); setDescription('');
      setPostType('historia'); setStatus('borrador'); setContentTab('brief'); setTeamOpen(true); setError(null);
    }
  }, [open, initialDate]);

  const values: Record<ContentTabKey, [string, (v: string) => void]> = { brief: [brief, setBrief], description: [description, setDescription], copy: [copyText, setCopyText] };
  const [tabValue, setTabValue] = values[contentTab];
  const rolesMissing = !roles.lead.length || !roles.executor.length || !roles.reviewer.length;
  const isAds = calendarType === 'ads';

  const handleSave = async () => {
    if (!ejeContenido.trim() && !brief.trim() && !description.trim()) { setError('Completá el eje de contenido, el brief o el guión'); return; }
    if (!publishDate) { setError('Seleccioná una fecha'); return; }
    if (rolesMissing) { setError('Asigná al menos una persona como responsable, ejecutor y control'); setTeamOpen(true); return; }
    setSaving(true); setError(null);
    try {
      await onCreateIdea({
        title: ejeContenido.trim() || brief.trim().slice(0, 50) || 'Sin título',
        description: description.trim(), brief: brief.trim(), eje_contenido: ejeContenido.trim(), copy_text: copyText.trim(),
        post_type: postType, status, publish_date: publishDate, author_id: user?.id, assignees: rolesToList(roles),
      });
      onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-[min(94dvh,900px)] w-[min(96vw,1200px)] max-w-none! flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none">
        <div className="shrink-0 bg-muted/20 px-5 py-3 pr-14">
          <DialogTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{isAds ? 'Nueva pieza ADS' : 'Nueva idea de publicación'}</DialogTitle>
          <DialogDescription className="sr-only">Creá contenido y definí quién responde, ejecuta y controla</DialogDescription>
          <Input autoFocus placeholder="Eje de contenido: Promoción de verano..." value={ejeContenido} onChange={e => setEjeContenido(e.target.value)}
            className="mt-2 h-11 rounded-xl border-0 bg-background/70 text-lg font-bold" />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
          <Scroller innerClassName="tm-stagger space-y-3 pb-32">
            <Module icon={Shapes} title="Formato" tone="text-pink-600" toneBg="bg-pink-500/15">
              <Menu value={postType} options={POST_TYPE_OPTIONS} onChange={k => setPostType(k as PostType)} />
            </Module>
            <Module icon={CalendarDays} title="Publicación" tone="text-blue-600" toneBg="bg-blue-500/15">
              <DateTimeField value={publishDate} onChange={v => v && setPublishDate(v)} placeholder="Elegí la fecha" />
            </Module>
            <Module icon={ListChecks} title="Estado" tone="text-emerald-600" toneBg="bg-emerald-500/15">
              <Menu value={status} options={STATUS_OPTIONS} onChange={k => setStatus(k as IdeaStatus)} />
            </Module>
          </Scroller>

          <Scroller innerClassName="flex min-h-full flex-col gap-4 pb-40">
            <DescriptionEditor key={contentTab} className="min-h-[440px] flex-1" value={tabValue} onChange={setTabValue}
              placeholder={CONTENT_TABS.find(t => t.key === contentTab)!.placeholder}
              title={
                <div className="flex rounded-xl bg-background/70 p-0.5">
                  {CONTENT_TABS.map(t => (
                    <button key={t.key} type="button" onClick={() => setContentTab(t.key)}
                      className={cn('tm-press rounded-lg px-3 py-1.5 text-xs font-semibold', contentTab === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                      {t.label}{values[t.key][0].trim() ? ' •' : ''}
                    </button>
                  ))}
                </div>
              } />
            <section className="tm-rise rounded-2xl bg-muted/25">
              <button type="button" onClick={() => setTeamOpen(v => !v)} className="tm-press flex w-full items-center gap-2 p-4 text-left">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15"><Users2 className="h-3.5 w-3.5 text-violet-600" /></span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Equipo asignado</h3>
                <span className="text-xs text-muted-foreground">{totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''}</span>
                {rolesMissing && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Falta asignar</span>}
                <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', teamOpen && 'rotate-180')} />
              </button>
              {/* Collapse inline para no depender de otro import */}
              <div className={cn('grid transition-[grid-template-rows,opacity] duration-300 ease-out', teamOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                <div className={cn('min-h-0', !teamOpen && 'overflow-hidden')}><div className="px-4 pb-4"><TaskRolesPicker roles={roles} onChange={setRoles} users={users} /></div></div>
              </div>
            </section>
          </Scroller>
        </div>

        <div className="flex shrink-0 items-center gap-3 bg-muted/20 px-5 py-3">
          {error && <p className="tm-pop flex-1 text-xs text-destructive">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            <DialogClose render={<Button variant="outline" className="tm-press rounded-lg" />}>Cancelar</DialogClose>
            <Button onClick={handleSave} disabled={saving} className="tm-press rounded-lg">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} {isAds ? 'Crear pieza' : 'Crear idea'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
