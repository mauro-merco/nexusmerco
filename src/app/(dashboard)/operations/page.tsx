'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useClients } from '@/lib/hooks/use-clients';
import { useAuthStore } from '@/store/auth-store';
import { KanbanBoard } from '@/components/kanban-board';
import { NewTaskDialog } from '@/components/new-task-dialog';
import { TaskDetailModal } from '@/components/task-detail-modal';
import type { Task, TaskStatus } from '@/lib/types';
import { KanbanSquare, Plus, Loader2 } from 'lucide-react';

export default function OperationsPage() {
  const { user } = useAuthStore();
  const { clients, loading: clientsLoading } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string; }[]>([]);

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask, patchTask } = useTasks(selectedClientId);

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      setSelectedClientId(clients[0].id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(json => setUsers(json.data || []))
      .catch(() => {});
  }, []);

  // Deep link: open a specific task (?task=<id>)
  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('task');
    if (!taskId) return;
    let cancelled = false;
    fetch(`/api/tasks/${taskId}`)
      .then(r => r.json())
      .then(json => {
        if (cancelled || !json.data) return;
        setSelectedClientId(json.data.client_id || selectedClientId);
        setSelectedTask(json.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTaskMove = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    await updateTask(taskId, { status: newStatus });
  }, [updateTask]);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleTaskUpdated = useCallback((updated: Task) => {
    setSelectedTask(updated);
    patchTask(updated);
  }, [patchTask]);

  if (clientsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <KanbanSquare className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">Creá un cliente primero</p>
            <p className="text-sm text-center max-w-md">
              Necesitás al menos un cliente para poder crear tareas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground mt-1 text-sm">Tablero Kanban de tareas</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedClientId || ''}
            onChange={e => setSelectedClientId(e.target.value)}
            className="rounded-lg border bg-transparent px-3 py-2 text-sm"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button onClick={() => setShowNewTask(true)} variant="cta" size="cta" className="gap-2">
            <Plus className="h-4 w-4" /> Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {tasksLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <KanbanBoard tasks={tasks} onTaskClick={handleTaskClick} onTaskMove={handleTaskMove} />
      )}

      {/* New Task Dialog */}
      {selectedClientId && (
        <NewTaskDialog
          open={showNewTask}
          onOpenChange={setShowNewTask}
          clientId={selectedClientId}
          users={users}
          onCreateTask={(data) => createTask({ ...data, author_id: user?.id })}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => { if (!open) setSelectedTask(null); }}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={() => { deleteTask(selectedTask.id); setSelectedTask(null); }}
          users={users}
        />
      )}
    </div>
  );
}
