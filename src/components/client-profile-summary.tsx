'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TeamActivity } from '@/components/team-activity';
import { WorkStatistics } from '@/components/work-statistics';
import { TaskDetailModal } from '@/components/task-detail-modal';
import { ClientWall } from '@/components/client-wall';
import { Input } from '@/components/ui/input';
import { TASK_ROLE_CONFIG, TASK_STATUS_CONFIG, taskTypeInfo } from '@/lib/task-config';
import { cn } from '@/lib/utils';
import type { User, Task, NexusDocument } from '@/lib/types';
import { KanbanSquare, CheckCircle2, Users2, Loader2, ChevronRight, FileText, Plus, Calendar, FolderOpen, ExternalLink, Trash2, MessageSquare, Send } from 'lucide-react';

type DriveFolder = {
  id: string;
  name: string;
  url: string;
  created_at: string;
};

function TaskRowInline({ task, onOpen, closed }: { task: Task; onOpen: () => void; closed?: boolean }) {
  const sConfig = TASK_STATUS_CONFIG[task.status];
  const SIcon = sConfig.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-2.5 text-left hover:bg-muted/70 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
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
        <span className="text-sm font-medium truncate">{task.title}</span>
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
  );
}

function StatTile({ icon: Icon, iconClass, bgClass, value, label }: { icon: React.ComponentType<{ className?: string }>; iconClass: string; bgClass: string; value: number; label: string }) {
  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-4">
        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center mb-2.5', bgClass)}>
          <Icon className={cn('h-4 w-4', iconClass)} />
        </div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

export function ClientProfileSummary({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { tasks, loading, patchTask, refetch } = useTasks(clientId);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskTab, setTaskTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data || [])).catch(() => {});
  }, []);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
    <div className="space-y-4">
      {/* Row 1 — stats + equipo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatTile icon={KanbanSquare} iconClass="text-blue-600" bgClass="bg-blue-500/10" value={activeTasks.length} label="Tareas en curso" />
        <StatTile icon={CheckCircle2} iconClass="text-emerald-600" bgClass="bg-emerald-500/10" value={historyTasks.length} label="Finalizadas (historial)" />
        <Card className="border-0 shadow-sm rounded-2xl sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Users2 className="h-3.5 w-3.5" /> Equipo trabajando
              </p>
              <button type="button" onClick={() => router.push('/operations')} className="flex items-center gap-1 text-[11px] text-primary font-medium">
                Ver tareas <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            {team.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 italic">Nadie tiene tareas activas para este cliente.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {team.map(({ user, count }) => (
                  <button key={user.id} type="button" onClick={() => router.push(`/u/${user.id}`)} className="flex items-center gap-1.5 rounded-full bg-muted/50 pl-1 pr-2.5 py-1 hover:bg-muted transition-colors">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-[9px] font-semibold">{user.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] font-medium">{user.full_name}</span>
                    <span className="text-[10px] text-muted-foreground">({count})</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — tasks tabs + piezas */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setTaskTab('active')} className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors', taskTab === 'active' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  Activas ({activeTasks.length})
                </button>
                <button type="button" onClick={() => setTaskTab('history')} className={cn('text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors', taskTab === 'history' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  Historial ({historyTasks.length})
                </button>
              </div>
            </div>
            {shownTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 italic py-2">{taskTab === 'active' ? 'Sin tareas activas' : 'Todavía no hay tareas finalizadas.'}</p>
            ) : (
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {shownTasks.map(t => (
                  <TaskRowInline key={t.id} task={t} closed={taskTab === 'history'} onOpen={() => (taskTab === 'history' ? router.push(`/operations?task=${t.id}`) : setSelectedTask(t))} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Piezas &amp; producción</p>
            <WorkStatistics clientId={clientId} compact />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — actividad del equipo */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <TeamActivity tasks={tasks} />
        </CardContent>
      </Card>

      {/* Row 4 — archivos + drive */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DocumentsSection clientId={clientId} />
        <DriveFoldersSection clientId={clientId} />
      </div>

      {/* Row 5 — muro */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-4">
          <ClientWall clientId={clientId} />
        </CardContent>
      </Card>

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
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-bold flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-amber-500" /> Carpetas en Drive
        </p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,160px)_1fr_auto]">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Carpeta de logos" className="h-8 text-xs" />
          <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/..." className="h-8 text-xs" />
          <Button size="sm" variant="default" className="h-8 gap-1 rounded-lg" onClick={handleAdd} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Agregar
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : folders.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 italic text-center py-3">Todavía no hay carpetas importantes.</p>
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
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const [docs, setDocs] = useState<NexusDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const authHeaders = useCallback((json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?client_id=${clientId}`, { headers: authHeaders() });
      const json = await res.json();
      setDocs(json.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [clientId, authHeaders]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ title: 'Nuevo documento', client_id: clientId }),
      });
      const json = await res.json();
      if (res.ok && json.data) router.push(`/documentos?doc=${json.data.id}`);
    } finally {
      setCreating(false);
    }
  }, [clientId, authHeaders, router]);

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Archivos del cliente
          </p>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 rounded-lg" onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Nuevo
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 italic text-center py-3">Sin documentos para este cliente</p>
        ) : (
          <div className="space-y-1.5">
            {docs.map(d => (
              <button key={d.id} type="button" onClick={() => router.push(`/documentos?doc=${d.id}`)} className="w-full flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-2.5 text-left hover:bg-muted/70 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{d.title}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(d.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
