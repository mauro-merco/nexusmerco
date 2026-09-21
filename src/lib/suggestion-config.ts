import type { SuggestionStatus, SuggestionType } from '@/lib/types';
import { Lightbulb, Bug, CircleDot, Eye, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react';

export const SUGGESTION_TYPE_CONFIG: Record<SuggestionType, { label: string; icon: LucideIcon; colorClass: string; bgColorClass: string; borderClass: string }> = {
  suggestion: {
    label: 'Sugerencia',
    icon: Lightbulb,
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgColorClass: 'bg-violet-500/15',
    borderClass: 'border-violet-500/40',
  },
  bug: {
    label: 'Reporte de bug',
    icon: Bug,
    colorClass: 'text-red-600 dark:text-red-400',
    bgColorClass: 'bg-red-500/15',
    borderClass: 'border-red-500/40',
  },
};

export const SUGGESTION_STATUS_CONFIG: Record<SuggestionStatus, { label: string; icon: LucideIcon; colorClass: string; bgColorClass: string; dotColor: string }> = {
  abierta: {
    label: 'Abierta',
    icon: CircleDot,
    colorClass: 'text-slate-600 dark:text-slate-400',
    bgColorClass: 'bg-slate-100 dark:bg-slate-800/70',
    dotColor: 'bg-slate-400',
  },
  en_revision: {
    label: 'En revisión',
    icon: Eye,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgColorClass: 'bg-blue-500/15',
    dotColor: 'bg-blue-400',
  },
  implementada: {
    label: 'Implementada',
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgColorClass: 'bg-emerald-500/15',
    dotColor: 'bg-emerald-500',
  },
  descartada: {
    label: 'Descartada',
    icon: XCircle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgColorClass: 'bg-red-500/15',
    dotColor: 'bg-red-500',
  },
};

export const SUGGESTION_STATUSES: SuggestionStatus[] = ['abierta', 'en_revision', 'implementada', 'descartada'];