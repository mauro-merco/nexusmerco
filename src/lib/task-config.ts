import type { TaskStatus, TaskPriority } from '@/lib/types';
import { Clock, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
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
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; colorClass: string; dotColor: string }> = {
  low: { label: 'Baja', colorClass: 'text-slate-500', dotColor: 'bg-slate-400' },
  medium: { label: 'Media', colorClass: 'text-blue-500', dotColor: 'bg-blue-500' },
  high: { label: 'Alta', colorClass: 'text-orange-500', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgente', colorClass: 'text-red-500', dotColor: 'bg-red-500' },
};

export const TASK_STATUSES: TaskStatus[] = ['en_espera', 'en_revision', 'aprobado', 'problemas'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
