import type { TaskStatus, TaskPriority, Task } from '@/lib/types';
import { Clock, Eye, CheckCircle, AlertTriangle, Archive, Camera, Images, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; icon: LucideIcon; colorClass: string; bgColorClass: string; dotColor: string }> = {
  en_espera: {
    label: 'En espera',
    icon: Clock,
    colorClass: 'text-slate-600',
    bgColorClass: 'bg-slate-100 dark:bg-slate-800',
    dotColor: 'bg-slate-400',
  },
  en_revision: {
    label: 'En revisión',
    icon: Eye,
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-50 dark:bg-blue-950',
    dotColor: 'bg-blue-500',
  },
  aprobado: {
    label: 'Aprobado',
    icon: CheckCircle,
    colorClass: 'text-emerald-600',
    bgColorClass: 'bg-emerald-50 dark:bg-emerald-950',
    dotColor: 'bg-emerald-500',
  },
  problemas: {
    label: 'Problemas',
    icon: AlertTriangle,
    colorClass: 'text-red-600',
    bgColorClass: 'bg-red-50 dark:bg-red-950',
    dotColor: 'bg-red-500',
  },
  cerrada: {
    label: 'Cerrada',
    icon: Archive,
    colorClass: 'text-indigo-600',
    bgColorClass: 'bg-indigo-50 dark:bg-indigo-950',
    dotColor: 'bg-indigo-500',
  },
};

export const PIECE_TYPES: { field: 'pieces_stories' | 'pieces_feed' | 'pieces_reels'; label: string; icon: LucideIcon; colorClass: string; dotColor: string }[] = [
  { field: 'pieces_stories', label: 'Historias', icon: Camera, colorClass: 'text-cyan-600', dotColor: 'bg-cyan-400' },
  { field: 'pieces_feed', label: 'Feed / estáticas', icon: Images, colorClass: 'text-orange-600', dotColor: 'bg-orange-400' },
  { field: 'pieces_reels', label: 'Reels / Videos', icon: Video, colorClass: 'text-pink-600', dotColor: 'bg-pink-400' },
];

export function taskPieceTotal(task: Pick<Task, 'pieces_stories' | 'pieces_feed' | 'pieces_reels' | 'pieces_count'>): number {
  const typed = (task.pieces_stories || 0) + (task.pieces_feed || 0) + (task.pieces_reels || 0);
  return typed > 0 ? typed : (task.pieces_count || 0);
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; colorClass: string; dotColor: string }> = {
  low: { label: 'Baja', colorClass: 'text-slate-500', dotColor: 'bg-slate-400' },
  medium: { label: 'Media', colorClass: 'text-blue-500', dotColor: 'bg-blue-500' },
  high: { label: 'Alta', colorClass: 'text-orange-500', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgente', colorClass: 'text-red-500', dotColor: 'bg-red-500' },
};

export const TASK_STATUSES: TaskStatus[] = ['en_espera', 'en_revision', 'aprobado', 'problemas', 'cerrada'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
