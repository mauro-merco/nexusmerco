'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserTasksModal } from '@/components/user-tasks-modal';
import type { Task, User } from '@/lib/types';
import { Loader2, Users2, KanbanSquare, CheckCircle2, Shield } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = { admin: 'Admin', operador: 'Operador' };
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/15 text-purple-500',
  operador: 'bg-blue-500/15 text-blue-500',
};

export default function TeamPage() {
  const { user } = useAuthStore();
  const isAdminOrTeam = user?.role === 'admin' || user?.role === 'operador';

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isAdminOrTeam) { setLoading(false); return; }
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
    ]).then(([usersJson, tasksJson]) => {
      setUsers((usersJson.data || []).filter((u: User) => u.role === 'admin' || u.role === 'operador'));
      setTasks(tasksJson.data || []);
    }).finally(() => setLoading(false));
  }, [isAdminOrTeam]);

  if (!isAdminOrTeam) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users2 className="h-12 w-12 opacity-30" />
          <p className="text-base font-medium">Sin acceso</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tasksByUser = (userId: string) => tasks.filter(t => t.assignees.some(a => a.id === userId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gradient-tech text-2xl md:text-3xl font-bold tracking-tight">Equipo</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">
          Qué tiene activo y finalizado cada integrante del equipo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => {
          const userTasks = tasksByUser(u.id);
          const activeCount = userTasks.filter(t => t.status !== 'aprobado').length;
          const doneCount = userTasks.filter(t => t.status === 'aprobado').length;
          return (
            <Card
              key={u.id}
              className="group cursor-pointer bg-card/50 backdrop-blur-xl border border-border/30 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all duration-300"
              onClick={() => setSelectedUser(u)}
            >
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 ring-2 ring-border/30">
                    <AvatarImage src={u.avatar_url} />
                    <AvatarFallback className="font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                      {u.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{u.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold shrink-0 flex items-center gap-1 ${ROLE_COLORS[u.role]}`}>
                    <Shield className="h-2.5 w-2.5" /> {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <KanbanSquare className="h-3 w-3 text-blue-500" /> {activeCount} en curso
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> {doneCount} finalizadas
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {users.length === 0 && (
        <Card className="border-dashed bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Users2 className="h-10 w-10 opacity-30" />
            <p className="text-sm">No hay usuarios internos todavía.</p>
          </CardContent>
        </Card>
      )}

      <UserTasksModal
        user={selectedUser}
        tasks={selectedUser ? tasksByUser(selectedUser.id) : []}
        open={!!selectedUser}
        onOpenChange={(open) => { if (!open) setSelectedUser(null); }}
      />
    </div>
  );
}
