import type { TaskDepartment } from './types';
import { Palette, Megaphone, FileText, Code, Headphones, type LucideIcon } from 'lucide-react';

export interface DepartmentConfig {
  label: string;
  shortLabel: string;
  category: 'Diseño' | 'Pauta' | 'Contenido' | 'Desarrollo' | 'Atención';
  slaHours: number;
  urgentSlaHours: number;
  color: string;
  bgColorClass: string;
  textColorClass: string;
  icon: LucideIcon;
}

export const DEPARTMENT_CONFIG: Record<TaskDepartment, DepartmentConfig> = {
  diseno_redes: {
    label: 'Diseño · Redes',
    shortLabel: 'Redes',
    category: 'Diseño',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#ec4899',
    bgColorClass: 'bg-pink-100 dark:bg-pink-950/30',
    textColorClass: 'text-pink-700 dark:text-pink-400',
    icon: Palette,
  },
  diseno_ads: {
    label: 'Diseño · ADS',
    shortLabel: 'ADS',
    category: 'Diseño',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#f97316',
    bgColorClass: 'bg-orange-100 dark:bg-orange-950/30',
    textColorClass: 'text-orange-700 dark:text-orange-400',
    icon: Palette,
  },
  diseno_web: {
    label: 'Diseño · Web',
    shortLabel: 'Web',
    category: 'Diseño',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#8b5cf6',
    bgColorClass: 'bg-violet-100 dark:bg-violet-950/30',
    textColorClass: 'text-violet-700 dark:text-violet-400',
    icon: Palette,
  },
  pauta_google: {
    label: 'Pauta · Google Ads',
    shortLabel: 'Google',
    category: 'Pauta',
    slaHours: 72,
    urgentSlaHours: 24,
    color: '#3b82f6',
    bgColorClass: 'bg-blue-100 dark:bg-blue-950/30',
    textColorClass: 'text-blue-700 dark:text-blue-400',
    icon: Megaphone,
  },
  pauta_meta: {
    label: 'Pauta · Meta Ads',
    shortLabel: 'Meta',
    category: 'Pauta',
    slaHours: 72,
    urgentSlaHours: 24,
    color: '#0891b2',
    bgColorClass: 'bg-cyan-100 dark:bg-cyan-950/30',
    textColorClass: 'text-cyan-700 dark:text-cyan-400',
    icon: Megaphone,
  },
  pauta_tiktok: {
    label: 'Pauta · TikTok',
    shortLabel: 'TikTok',
    category: 'Pauta',
    slaHours: 72,
    urgentSlaHours: 24,
    color: '#06b6d4',
    bgColorClass: 'bg-cyan-100 dark:bg-cyan-950/30',
    textColorClass: 'text-cyan-700 dark:text-cyan-400',
    icon: Megaphone,
  },
  contenido_copy: {
    label: 'Contenido · Copy',
    shortLabel: 'Copy',
    category: 'Contenido',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#10b981',
    bgColorClass: 'bg-emerald-100 dark:bg-emerald-950/30',
    textColorClass: 'text-emerald-700 dark:text-emerald-400',
    icon: FileText,
  },
  contenido_estrategia: {
    label: 'Contenido · Estrategia',
    shortLabel: 'Estrategia',
    category: 'Contenido',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#14b8a6',
    bgColorClass: 'bg-teal-100 dark:bg-teal-950/30',
    textColorClass: 'text-teal-700 dark:text-teal-400',
    icon: FileText,
  },
  desarrollo_web: {
    label: 'Desarrollo · Web',
    shortLabel: 'Web',
    category: 'Desarrollo',
    slaHours: 120,
    urgentSlaHours: 48,
    color: '#6366f1',
    bgColorClass: 'bg-indigo-100 dark:bg-indigo-950/30',
    textColorClass: 'text-indigo-700 dark:text-indigo-400',
    icon: Code,
  },
  desarrollo_ecommerce: {
    label: 'Desarrollo · Ecommerce',
    shortLabel: 'Ecommerce',
    category: 'Desarrollo',
    slaHours: 120,
    urgentSlaHours: 48,
    color: '#7c3aed',
    bgColorClass: 'bg-purple-100 dark:bg-purple-950/30',
    textColorClass: 'text-purple-700 dark:text-purple-400',
    icon: Code,
  },
  atencion_consultas: {
    label: 'Atención · Consultas',
    shortLabel: 'Consultas',
    category: 'Atención',
    slaHours: 24,
    urgentSlaHours: 4,
    color: '#f59e0b',
    bgColorClass: 'bg-amber-100 dark:bg-amber-950/30',
    textColorClass: 'text-amber-700 dark:text-amber-400',
    icon: Headphones,
  },
  atencion_reportes: {
    label: 'Atención · Reportes',
    shortLabel: 'Reportes',
    category: 'Atención',
    slaHours: 48,
    urgentSlaHours: 24,
    color: '#eab308',
    bgColorClass: 'bg-yellow-100 dark:bg-yellow-950/30',
    textColorClass: 'text-yellow-700 dark:text-yellow-400',
    icon: Headphones,
  },
};

export const DEPARTMENTS = Object.keys(DEPARTMENT_CONFIG) as TaskDepartment[];

export const DEPARTMENT_CATEGORIES = {
  'Diseño': ['diseno_redes', 'diseno_ads', 'diseno_web'] as TaskDepartment[],
  'Pauta': ['pauta_google', 'pauta_meta', 'pauta_tiktok'] as TaskDepartment[],
  'Contenido': ['contenido_copy', 'contenido_estrategia'] as TaskDepartment[],
  'Desarrollo': ['desarrollo_web', 'desarrollo_ecommerce'] as TaskDepartment[],
  'Atención': ['atencion_consultas', 'atencion_reportes'] as TaskDepartment[],
};

export function departmentInfo(dept: TaskDepartment | null | undefined): DepartmentConfig | null {
  if (!dept) return null;
  return DEPARTMENT_CONFIG[dept] || null;
}

export function calculateDueDate(startDate: string, slaHours: number): string {
  const start = new Date(startDate);
  const due = new Date(start.getTime() + slaHours * 60 * 60 * 1000);
  return due.toISOString();
}

export function getUrgencyMetrics(tasks: { department: TaskDepartment | null; is_urgent: boolean; created_at: string }[]): {
  percentage: number;
  count: number;
  total: number;
} {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthTasks = tasks.filter(t => new Date(t.created_at) >= monthStart);
  const urgentCount = thisMonthTasks.filter(t => t.is_urgent).length;
  
  return {
    percentage: thisMonthTasks.length > 0 ? Math.round((urgentCount / thisMonthTasks.length) * 100) : 0,
    count: urgentCount,
    total: thisMonthTasks.length,
  };
}
