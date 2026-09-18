'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TaskRow } from '@/components/client-tasks-tab';
import type { Task, User } from '@/lib/types';
import { KanbanSquare, CheckCircle2 } from 'lucide-react';

interface UserTasksModalProps {
  user: User | null;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserTasksModal({ user, tasks, open, onOpenChange }: UserTasksModalProps) {
  const router = useRouter();
  if (!user) return null;

  const activeTasks = tasks.filter(t => t.status !== 'cerrada');
  const historyTasks = tasks.filter(t => t.status === 'cerrada');

  const openTask = (id: string) => {
    onOpenChange(false);
    router.push(`/operations?task=${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="font-semibold">{user.full_name?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-base">{user.full_name}</DialogTitle>
            <DialogDescription className="text-xs">{user.email}</DialogDescription>
          </div>
        </div>

        <Tabs defaultValue="active" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="shrink-0">
            <TabsTrigger value="active" className="gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" /> En curso ({activeTasks.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Historial ({historyTasks.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="flex-1 overflow-y-auto mt-3 space-y-2">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic text-center py-10">Sin tareas activas.</p>
            ) : (
              activeTasks.map(t => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} showClient />)
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-1 overflow-y-auto mt-3 space-y-2">
            {historyTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground/60 italic text-center py-10">Todavía no hay tareas finalizadas.</p>
            ) : (
              historyTasks.map(t => <TaskRow key={t.id} task={t} onClick={() => openTask(t.id)} showClient />)
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
