'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, isWithinInterval, differenceInDays, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import type { Task } from '@/lib/types';
import { departmentInfo } from '@/lib/department-config';
import { TaskDetailModal } from '@/components/task-detail-modal';

interface TasksCalendarProps {
  clientId: string;
  clientName: string;
  initialMonth?: string | null;
}

export function TasksCalendar({ clientId, clientName, initialMonth }: TasksCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (initialMonth) {
      try {
        return startOfMonth(parseISO(initialMonth + '-01'));
      } catch {
        return startOfMonth(new Date());
      }
    }
    return startOfMonth(new Date());
  });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string; avatar_url: string }[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [clientId, currentMonth]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?client_id=${clientId}`);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const tasksInMonth = tasks.filter(task => {
    if (!task.start_date || !task.due_date) return false;
    const start = parseISO(task.start_date);
    const end = parseISO(task.due_date);
    return isWithinInterval(monthStart, { start, end }) || isWithinInterval(monthEnd, { start, end }) ||
      (start <= monthStart && end >= monthEnd);
  });

  function handleTaskUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  }

  function handleTaskDeleted() {
    if (!selectedTask) return;
    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
    setSelectedTask(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-cyan-500" />
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="space-y-2">
        {/* Days header */}
        <div className="grid grid-cols-7 gap-1 text-xs font-semibold text-muted-foreground px-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center">{day}</div>
          ))}
        </div>

        {/* Days grid with task bars */}
        <div className="relative border border-border rounded-xl p-2">
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(day => (
              <div
                key={day.toISOString()}
                className={cn(
                  'aspect-square rounded-lg p-1 text-xs flex flex-col items-center justify-start',
                  !isSameMonth(day, currentMonth) && 'opacity-40',
                )}
              >
                <span className="font-medium">{format(day, 'd')}</span>
              </div>
            ))}
          </div>

          {/* Task bars overlay */}
          <div className="absolute inset-0 p-2 pointer-events-none">
            {tasksInMonth.map(task => {
              const start = parseISO(task.start_date!);
              const end = parseISO(task.due_date!);
              const deptConfig = departmentInfo(task.department);

              // Calculate position
              const dayIndex = differenceInDays(start < monthStart ? monthStart : start, monthStart);
              const duration = differenceInDays(end > monthEnd ? monthEnd : end, start < monthStart ? monthStart : start) + 1;

              const dayWidth = 100 / 7;
              const row = Math.floor(dayIndex / 7);
              const col = dayIndex % 7;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="absolute pointer-events-auto cursor-pointer transition-all hover:z-10 hover:scale-105"
                  style={{
                    top: `${row * 14.28 + 20}%`,
                    left: `${col * dayWidth}%`,
                    width: `${Math.min(duration * dayWidth, (7 - col) * dayWidth)}%`,
                    height: '12%',
                  }}
                >
                  <div
                    className={cn(
                      'h-full rounded-lg px-2 py-1 text-[10px] font-medium flex items-center gap-1 shadow-sm border',
                      deptConfig?.bgColorClass || 'bg-muted',
                      deptConfig?.textColorClass || 'text-foreground',
                      task.is_urgent && 'ring-2 ring-red-500 animate-pulse',
                    )}
                  >
                    {task.is_urgent && <span className="text-red-500">⚡</span>}
                    <span className="truncate">{task.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Task list below */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Tareas del mes ({tasksInMonth.length})</h3>
        <div className="space-y-1">
          {tasksInMonth.map(task => {
            const deptConfig = departmentInfo(task.department);
            const Icon = deptConfig?.icon;
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/40 cursor-pointer transition-colors"
              >
                {Icon && <Icon className="h-4 w-4" style={{ color: deptConfig.color }} />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{task.title}</span>
                    {task.is_urgent && <Badge variant="destructive" className="text-[10px]">URGENTE</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {deptConfig?.label} · {format(parseISO(task.start_date!), 'd MMM', { locale: es })} → {format(parseISO(task.due_date!), 'd MMM', { locale: es })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          users={users}
        />
      )}
    </div>
  );
}
