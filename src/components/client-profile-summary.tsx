'use client';
import { calendarHref } from '@/lib/calendar-routes';
import { ContentSkeleton } from '@/components/content-skeleton';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TeamActivity } from '@/components/team-activity';
import { ActivityHistory } from '@/components/activity-history';
import { WorkStatistics } from '@/components/work-statistics';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { ClientWall } from '@/components/client-wall';
import { DocumentPanel } from '@/components/document-panel';
import { Input } from '@/components/ui/input';
import { TASK_ROLE_CONFIG, TASK_PRIORITY_CONFIG, taskStatusConfig, taskTypeInfo } from '@/lib/task-config';
import type { ActivityEvent } from '@/lib/activity-config';
import { cn } from '@/lib/utils';
import type { User, Task, NexusDocument } from '@/lib/types';
import { KanbanSquare, CheckCircle2, Users2, Loader2, ChevronRight, FileText, Plus, Calendar, FolderOpen, ExternalLink, Trash2, Layers, History } from 'lucide-react';

type DriveFolder = {
  id: string;
  name: string;
  url: string;
  created_at: string;
};

function TaskRowInline({ task, onOpen, closed }: { task: Task; onOpen: () => void; closed?: boolean }) {
  const sConfig = taskStatusConfig(task.status);
  const SIcon = sConfig.icon;
  return (
    <div className="rounded-xl bg-muted/40 p-2.5">
    <button
      type="button"
      onClick={onOpen}
      className="group w-full flex flex-wrap items-center justify-between gap-2 text-left hover:text-primary transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0 border-0', sConfig.bgColorClass, sConfig.colorClass)}>
          <SIcon className="h-3 w-3" /> {sConfig.label}
        </Badge>
        {taskTypeInfo(task.task_type) && (() => {
          const info = taskTypeInfo(task.task_type)!;
          const cat = info.category;
          const Icon = cat.icon;
          return (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0', cat.bgColorClass, cat.colorClass)}>
              <Icon className="h-3 w-3" />
              <span className="max-w-[160px] truncate">{info.label}</span>
            </span>
          );
        })()}
        <span className="w-full text-sm font-medium break-words">{task.title}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task.assignees.length > 0 && (
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 3).map(a => (
              <span key={`${a.id}-${a.task_role || ''}`} title={`${a.full_name || a.email}${a.task_role ? ` · ${TASK_ROLE_CONFIG[a.task_role]?.shortLabel || a.task_role}` : ''}`}>
                <Avatar className="h-5 w-5 border border-background">
                  <AvatarImage src={a.avatar_url} />
                  <AvatarFallback className="text-[8px]">{a.full_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
              </span>
            ))}
            {task.assignees.length > 3 && (
              <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-semibold">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
        {closed ? (
          task.completed_at ? (
            <span className="text-[10px] text-muted-foreground">{new Date(task.completed_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
          ) : null
        ) : task.due_date ? (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </span>
        ) : null}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
      </div>
    </button>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
      <span className={TASK_PRIORITY_CONFIG[task.priority].colorClass}>Prioridad: {TASK_PRIORITY_CONFIG[task.priority].label}</span>
      <span>{task.assignees.length ? task.assignees.map(a => `${a.full_name || a.email} (${TASK_ROLE_CONFIG[a.task_role]?.shortLabel || 'Integrante'})`).join(' · ') : 'Sin asignar'}</span>
      <a href={`/operations?task=${task.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline" aria-label={`Abrir origen de ${task.title} en otra pestaña`}>
        <ExternalLink className="h-3 w-3" /> Abrir origen
      </a>
    </div>
    </div>
  );
}

// Estilos compartidos de la vista (solo presentación)
const sectionClass = 'rounded-[1.6rem] border border-border bg-card p-5 md:p-6';
const sectionTitle = 'flex items-center gap-2.5 text-[15px] font-medium';
const sectionIcon = 'flex h-8 w-8 items-center justify-center rounded-full bg-tint-blue text-tint-blue-foreground';
const tabBtn = 'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors';
const tabOn = 'bg-foreground text-background';
const tabOff = 'text-muted-foreground hover:text-foreground';

export function ClientProfileSummary({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, loading, error, patchTask, refetch } = useTasks(clientId);
  const [sourceError, setSourceError] = useState('');
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskTab, setTaskTab] = useState<'active' | 'history'>('active');
  const [activityTab, setActivityTab] = useState<'team' | 'full'>('team');

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data || [])).catch(() => {});
  }, []);

  const openSource = async (event: ActivityEvent) => {
    setSourceError('');
    try {
      if (event.entity_type === 'calendar') {
        router.push(calendarHref(clientId));
        return;
      }
      if (!event.entity_id) return;
      const source = event.entity_type === 'task' ? 'tasks' : event.entity_type === 'social_idea' ? 'social-ideas' : 'ads-ideas';
      const res = await fetch(`/api/${source}/${event.entity_id}`);
      const json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error || 'El origen ya no está disponible.');
      if (source === 'tasks') setSelectedTask(json.data);
      else {
        router.push(calendarHref(clientId, { month: json.data.publish_date.slice(0, 7), idea: event.entity_id }));
      }
    } catch (e) {
      setSourceError(e instanceof Error ? e.message : 'No se pudo abrir el origen.');
    }
  };

  if (loading) {
    return (
      <div className={cn(sectionClass, 'flex items-center justify-center py-10')}>
        <ContentSkeleton />
      </div>
    );
  }

  if (error) return <div role="alert" className="space-y-2 text-sm text-destructive"><p>{error}</p><Button variant="outline" onClick={refetch}>Reintentar</Button></div>;

  const activeTasks = tasks.filter(t => t.status !== 'cerrada');
  const historyTasks = tasks.filter(t => t.status === 'cerrada');

  const teamMap = new Map<string, { user: User; count: number }>();
  for (const t of activeTasks) {
    for (const a of t.assignees) {
      const entry = teamMap.get(a.id);
      if (entry) entry.count += 1;
      else teamMap.set(a.id, { user: a, count: 1 });
    }
  }
  const team = [...teamMap.values()].sort((a, b) => b.count - a.count);
  const shownTasks = taskTab === 'active' ? activeTasks : historyTasks;

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* COLUMNA PRINCIPAL — el trabajo del día */}
        <div className="space-y-3.5">
          <section id="client-active-tasks" className={sectionClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={sectionTitle}><span className={sectionIcon}><KanbanSquare className="h-4 w-4" /></span>Tareas del cliente</h2>
              <div role="group" aria-label="Tareas" className="flex rounded-full border border-border bg-card p-1">
                <button type="button" onClick={() => setTaskTab('active')} className={cn(tabBtn, taskTab === 'active' ? tabOn : tabOff)}>
                  Activas ({activeTasks.length})
                </button>
                <button type="button" onClick={() => setTaskTab('history')} className={cn(tabBtn, taskTab === 'history' ? tabOn : tabOff)}>
                  Historial ({historyTasks.length})
                </button>
              </div>
            </div>
            {shownTasks.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-surface-inset py-8 text-center">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">{taskTab === 'active' ? 'Sin tareas activas' : 'Todavía no hay tareas finalizadas.'}</p>
              </div>
            ) : (
              <div className="mt-4 max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
                {shownTasks.map(t => (
                  <TaskRowInline key={t.id} task={t} closed={taskTab === 'history'} onOpen={() => setSelectedTask(t)} />
                ))}
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <ClientWall clientId={clientId} />
          </section>
        </div>

        {/* COLUMNA LATERAL — estado de un vistazo */}
        <div className="space-y-3.5">
          <section className="bg-brand-sky-gradient rounded-[1.6rem] p-5 md:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.07em]">Resumen</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div><p className="text-3xl font-light leading-none">{activeTasks.length}</p><p className="mt-1 text-xs">en curso</p></div>
              <div><p className="text-3xl font-light leading-none">{historyTasks.length}</p><p className="mt-1 text-xs">finalizadas</p></div>
              <div><p className="text-3xl font-light leading-none">{team.length}</p><p className="mt-1 text-xs">en el equipo</p></div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitle}><span className={sectionIcon}><Users2 className="h-4 w-4" /></span>Equipo trabajando</h2>
            {team.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Nadie tiene tareas activas para este cliente.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {team.map(({ user, count }) => (
                  <button key={user.id} type="button" onClick={() => router.push(`/u/${user.id}`)} className="flex items-center gap-1.5 rounded-full bg-surface-inset py-1 pl-1 pr-2.5 transition-colors hover:bg-muted">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-[9px] font-semibold">{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{user.full_name}</span>
                    <span className="text-[11px] text-muted-foreground">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className={sectionClass}>
            <h2 className={cn(sectionTitle, 'mb-4')}><span className={sectionIcon}><Layers className="h-4 w-4" /></span>Piezas y producción</h2>
            <WorkStatistics clientId={clientId} compact />
          </section>
        </div>
      </div>

      {/* Material del cliente */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <DocumentsSection clientId={clientId} />
        <DriveFoldersSection clientId={clientId} />
      </div>

      {/* Historial: lo más detallado va al final */}
      <section className={sectionClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={sectionTitle}><span className={sectionIcon}><History className="h-4 w-4" /></span>Actividad e historial</h2>
          <div role="group" aria-label="Actividad" className="flex rounded-full border border-border bg-card p-1">
            <button type="button" onClick={() => setActivityTab('team')} className={cn(tabBtn, activityTab === 'team' ? tabOn : tabOff)}>
              Equipo
            </button>
            <button type="button" onClick={() => setActivityTab('full')} className={cn(tabBtn, activityTab === 'full' ? tabOn : tabOff)}>
              Historial completo
            </button>
          </div>
        </div>
        <div className="mt-4">
          {activityTab === 'team' ? (
            <TeamActivity tasks={tasks} onTaskClick={setSelectedTask} />
          ) : (
            <>
              {sourceError && <p role="alert" className="mb-2 text-sm text-destructive">{sourceError}</p>}
              <ActivityHistory clientId={clientId} scrollHeight={440} onOpenSource={openSource} />
            </>
          )}
        </div>
      </section>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onTaskUpdated={(updated) => { patchTask(updated); setSelectedTask(updated); }}
          onTaskDeleted={() => { setSelectedTask(null); refetch(); }}
          users={users}
        />
      )}
    </div>
  );
}

function DriveFoldersSection({ clientId }: { clientId: string }) {
  const { token } = useAuthStore();
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const authHeaders = useCallback((json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/drive-folders`, { headers: authHeaders() });
      const json = await res.json();
      setFolders(json.data || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [clientId, authHeaders]);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const handleAdd = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${clientId}/drive-folders`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ name, url }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'No se pudo guardar'); return; }
      setFolders(current => [json.data, ...current]);
      setName('');
      setUrl('');
    } catch {
      setError('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (folderId: string) => {
    const previous = folders;
    setFolders(current => current.filter(folder => folder.id !== folderId));
    try {
      const res = await fetch(`/api/clients/${clientId}/drive-folders?folder_id=${folderId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) setFolders(previous);
    } catch {
      setFolders(previous);
    }
  };

  return (
    <section className={cn(sectionClass, 'space-y-4')}>
        <h2 className={sectionTitle}><span className={sectionIcon}><FolderOpen className="h-4 w-4" /></span>Carpetas en Drive</h2>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,160px)_1fr_auto]">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carpeta de logos" className="h-8 text-xs" />
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="h-8 text-xs" />
          <Button size="sm" variant="default" className="h-8 gap-1 rounded-lg" onClick={handleAdd} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Agregar
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading ? (
          <ContentSkeleton />
        ) : folders.length === 0 ? (
          <p className="rounded-2xl bg-surface-inset py-6 text-center text-sm text-muted-foreground">Todavía no hay carpetas importantes.</p>
        ) : (
          <div className="space-y-1.5">
            {folders.map(folder => (
              <div key={folder.id} className="group flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-2.5">
                <a href={folder.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 hover:text-primary transition-colors">
                  <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{folder.name}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
                <Button variant="ghost" size="icon-sm" className="opacity-60 hover:opacity-100 rounded-lg" onClick={() => handleDelete(folder.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
    </section>
  );
}

function DocumentsSection({ clientId }: { clientId: string }) {
  const router = useRouter();
  return (
    <section className={cn(sectionClass, 'space-y-4')}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={sectionTitle}><span className={sectionIcon}><FileText className="h-4 w-4" /></span>Documentos del cliente</h2>
        <button type="button" onClick={() => router.push(`/documentos?client=${clientId}`)} className="text-xs font-medium text-primary hover:underline">
          Ver en Documentos
        </button>
      </div>
      <DocumentPanel clientId={clientId} max={6} emptyText="Sin documentos para este cliente. Los que adjuntes a sus tareas también aparecen acá." />
    </section>
  );
}
