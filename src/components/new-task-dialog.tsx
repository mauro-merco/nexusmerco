'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { TaskStatus, TaskPriority, TaskRole, TaskDepartment } from '@/lib/types';
import { TASK_PRIORITY_CONFIG, PIECE_TYPES } from '@/lib/task-config';
import { TaskRolesPicker, emptyRoles, rolesToList, totalPeople, type TaskRolesState } from '@/components/task-roles-picker';
import { departmentInfo } from '@/lib/department-config';
import { Scroller, Menu, Collapse, Switch, Stepper, type MenuOption } from '@/components/task-ui';
import { Module, DepartmentMenu, DateTimeField, DescriptionEditor, STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS, isoIn, parseDT, fmtDT } from '@/components/task-fields';
import { Loader2, Flag, Tag, Clock, Boxes, Users2, AlertTriangle, ChevronDown, Zap } from 'lucide-react';

interface UserRecord { id: string; full_name: string; email: string; avatar_url: string; }

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: { id: string; name: string }[];
  users: UserRecord[];
  onCreateTask: (data: {
    client_id: string; title: string; description?: string; status?: TaskStatus;
    assignees?: { id: string; role: TaskRole }[]; author_id?: string; priority?: TaskPriority;
    due_date?: string; task_type?: string; department?: TaskDepartment; start_date?: string; is_urgent?: boolean;
    blocked_by_task_id?: string; problem_note?: string; needs_client_material?: boolean; client_material_note?: string;
    pieces_stories?: number | null; pieces_feed?: number | null; pieces_reels?: number | null;
  }) => Promise<unknown>;
}

export function NewTaskDialog({ open, onOpenChange, clients, users, onCreateTask }: NewTaskDialogProps) {
  const [selClient, setSelClient] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('borrador');
  const [roles, setRoles] = useState<TaskRolesState>(emptyRoles());
  const [taskType, setTaskType] = useState('');
  const [department, setDepartment] = useState<TaskDepartment | null>(null);
  const [startDate, setStartDate] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [piecesStories, setPiecesStories] = useState('');
  const [piecesFeed, setPiecesFeed] = useState('');
  const [piecesReels, setPiecesReels] = useState('');
  const [problemNote, setProblemNote] = useState('');
  const [needsMaterial, setNeedsMaterial] = useState(false);
  const [materialNote, setMaterialNote] = useState('');
  const [teamOpen, setTeamOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(''); setDescription(''); setStatus('borrador'); setRoles(emptyRoles());
      setPriority('medium'); setDueDate(''); setTaskType(''); setSelClient('');
      setPiecesStories(''); setPiecesFeed(''); setPiecesReels(''); setError(null);
      setProblemNote(''); setNeedsMaterial(false); setMaterialNote('');
      setDepartment(null); setStartDate(''); setIsUrgent(false); setTeamOpen(true);
    }
  }, [open]);

  // Vencimiento automático según SLA del departamento (solo fecha)
  useEffect(() => {
    const cfg = departmentInfo(department);
    const start = parseDT(startDate);
    if (cfg && start) {
      const hours = isUrgent ? cfg.urgentSlaHours : cfg.slaHours;
      setDueDate(fmtDT(new Date(start.getTime() + hours * 3600000), false));
    }
  }, [department, startDate, isUrgent]);

  const handleSave = async () => {
    if (!selClient) { setError('Seleccioná el cliente de la tarea'); return; }
    if (!title.trim()) { setError('Ingresá un título'); return; }
    if (!department) { setError('Seleccioná el departamento responsable'); return; }
    if (status === 'problemas' && !problemNote.trim()) { setError('Escribí cuál es el problema'); return; }
    if (!roles.lead.length || !roles.executor.length || !roles.reviewer.length) {
      setError('Asigná al menos una persona como responsable, ejecutor y control'); setTeamOpen(true); return;
    }
    setSaving(true); setError(null);
    try {
      await onCreateTask({
        client_id: selClient, title: title.trim(), description: description.trim(), status,
        assignees: rolesToList(roles), priority, department,
        start_date: startDate || new Date().toISOString(), is_urgent: isUrgent,
        due_date: dueDate || undefined, task_type: taskType || undefined,
        problem_note: status === 'problemas' ? problemNote.trim() : undefined,
        needs_client_material: needsMaterial, client_material_note: needsMaterial ? materialNote.trim() : undefined,
        pieces_stories: piecesStories.trim() === '' ? null : Number(piecesStories),
        pieces_feed: piecesFeed.trim() === '' ? null : Number(piecesFeed),
        pieces_reels: piecesReels.trim() === '' ? null : Number(piecesReels),
      });
      onOpenChange(false);
    } catch (e) {
      const err = e as { message?: string; urgentTask?: { title: string } };
      setError(err?.message && err?.urgentTask ? `${err.message}\n\nTarea urgente actual: ${err.urgentTask.title}` : e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const dept = departmentInfo(department);
  const clientOptions: MenuOption[] = [{ key: '', label: 'Seleccioná el cliente' }, ...clients.map(c => ({ key: c.id, label: c.name }))];
  const pieceValues = { pieces_stories: [piecesStories, setPiecesStories], pieces_feed: [piecesFeed, setPiecesFeed], pieces_reels: [piecesReels, setPiecesReels] } as const;
  const rolesMissing = !roles.lead.length || !roles.executor.length || !roles.reviewer.length;
  const fieldCls = 'w-full rounded-xl bg-background/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex! top-0! right-0! bottom-0! left-0! m-auto! translate-x-0! translate-y-0! h-[min(94dvh,900px)] w-[min(96vw,1280px)] max-w-none! flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none">
        {/* Header */}
        <div className="shrink-0 bg-muted/20 px-5 py-3 pr-14">
          <DialogTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Nueva tarea</DialogTitle>
          <DialogDescription className="sr-only">Creá una nueva tarea para el tablero Kanban</DialogDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input autoFocus placeholder="Título de la tarea..." value={title} onChange={e => setTitle(e.target.value)}
              className="h-11 min-w-[240px] flex-1 rounded-xl border-0 bg-background/70 text-lg font-bold" />
            <div className="w-[220px]"><Menu value={selClient} options={clientOptions} onChange={setSelClient} /></div>
            <div className="w-[230px]"><Menu value={status} options={STATUS_OPTIONS} onChange={k => setStatus(k as TaskStatus)} /></div>
          </div>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
          {/* Detalle */}
          <Scroller innerClassName="tm-stagger space-y-3 pb-32">
            <Module icon={Flag} title="Prioridad" tone="text-orange-600" toneBg="bg-orange-500/15">
              <Menu value={priority} options={PRIORITY_OPTIONS} onChange={k => setPriority(k as TaskPriority)} />
            </Module>

            <Module icon={Tag} title="Clasificación" tone="text-pink-600" toneBg="bg-pink-500/15">
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Tipo de tarea</Label>
                  <Menu value={taskType} options={TYPE_OPTIONS} onChange={setTaskType} placeholder="Elegí un tipo" /></div>
                <div className="space-y-1"><Label className="text-xs">Departamento <span className="text-red-500">*</span></Label>
                  <DepartmentMenu value={department} onChange={setDepartment} /></div>
              </div>
            </Module>

            <Module icon={Clock} title="Plazos" tone="text-blue-600" toneBg="bg-blue-500/15">
              <div className="space-y-3">
                <div className="space-y-1"><Label className="text-xs">Inicio</Label>
                  <DateTimeField withTime value={startDate} onChange={setStartDate} placeholder="Ahora" /></div>
                <div className="space-y-1">
                  <Label className="text-xs">Vencimiento {dept && <span className="font-normal text-muted-foreground">· SLA {isUrgent ? dept.urgentSlaHours : dept.slaHours}hs</span>}</Label>
                  <DateTimeField value={dueDate} onChange={setDueDate} placeholder="Elegí vencimiento" />
                </div>
                <Collapse open={!!department}>
                  <div className="pt-1"><Switch checked={isUrgent} onChange={setIsUrgent} tone="bg-amber-500"
                    label={<span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><Zap className="h-3.5 w-3.5" /> Suma urgencia <span className="font-normal text-muted-foreground">· 24hs</span></span>} /></div>
                </Collapse>
              </div>
            </Module>

            <Module icon={Boxes} title="Piezas a diseñar" tone="text-violet-600" toneBg="bg-violet-500/15">
              <div className="space-y-2">
                {PIECE_TYPES.map(pt => {
                  const Icon = pt.icon; const [val, set] = pieceValues[pt.field];
                  return (
                    <div key={pt.field} className="flex items-center gap-2">
                      <span className={cn('flex flex-1 items-center gap-1.5 text-xs font-medium', pt.colorClass)}><Icon className="h-3.5 w-3.5" /> {pt.label}</span>
                      <div className="w-[118px]"><Stepper value={val} onChange={set} /></div>
                    </div>
                  );
                })}
              </div>
            </Module>

            <Module icon={AlertTriangle} title="Material del cliente" tone="text-red-600" toneBg="bg-red-500/15">
              <Switch checked={needsMaterial} onChange={setNeedsMaterial} tone="bg-red-500" label={<span className="text-red-600 dark:text-red-400">Necesito material</span>} />
              <Collapse open={needsMaterial}>
                <textarea value={materialNote} onChange={e => setMaterialNote(e.target.value)} rows={3} placeholder="Qué material se necesita..."
                  className={cn(fieldCls, 'tm-noscroll mt-3 min-h-[72px] resize-none')} />
              </Collapse>
            </Module>
          </Scroller>

          {/* Principal */}
          <Scroller innerClassName="flex min-h-full flex-col gap-4 pb-40">
            <Collapse open={status === 'problemas'}>
              <div className="space-y-1.5 rounded-2xl bg-red-500/5 p-4 ring-1 ring-red-500/30">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400"><AlertTriangle className="h-3.5 w-3.5" /> ¿Cuál es el problema?</div>
                <textarea value={problemNote} onChange={e => setProblemNote(e.target.value)} rows={2}
                  placeholder="Describí qué está pasando y qué bloquea la tarea..." className={cn(fieldCls, 'min-h-[60px] resize-none')} />
              </div>
            </Collapse>

            <DescriptionEditor className="min-h-[440px] flex-1" value={description} onChange={setDescription} />

            <section className="tm-rise rounded-2xl bg-muted/25">
              <button type="button" onClick={() => setTeamOpen(v => !v)} className="tm-press flex w-full items-center gap-2 p-4 text-left">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15"><Users2 className="h-3.5 w-3.5 text-violet-600" /></span>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/80">Equipo y roles</h3>
                <span className="text-xs text-muted-foreground">{totalPeople(roles)} persona{totalPeople(roles) !== 1 ? 's' : ''}</span>
                {rolesMissing && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-500">Falta asignar</span>}
                <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300', teamOpen && 'rotate-180')} />
              </button>
              <Collapse open={teamOpen}><div className="px-4 pb-4"><TaskRolesPicker roles={roles} onChange={setRoles} users={users} /></div></Collapse>
            </section>
          </Scroller>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 bg-muted/20 px-5 py-3">
          {error && <p className="tm-pop flex-1 whitespace-pre-line text-xs text-destructive">{error}</p>}
          <div className="ml-auto flex items-center gap-2">
            <DialogClose render={<Button variant="outline" className="tm-press rounded-lg" />}>Cancelar</DialogClose>
            <Button onClick={handleSave} disabled={saving} className="tm-press rounded-lg">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Crear tarea
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
