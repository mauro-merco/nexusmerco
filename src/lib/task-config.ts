import type { TaskStatus, TaskPriority, TaskRole, Task } from '@/lib/types';
import { Clock, Eye, CheckCircle, AlertTriangle, Archive, Camera, Images, Video, Crown, Hammer, SearchCheck, Share2, Megaphone, Globe, ShoppingCart, Target } from 'lucide-react';
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

export const TASK_ROLE_CONFIG: Record<TaskRole, {
  label: string;
  question: string;
  shortLabel: string;
  verb: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  borderClass: string;
  dotColor: string;
}> = {
  lead: {
    label: 'Responsable',
    question: '¿Quién es responsable?',
    shortLabel: 'Responsable',
    verb: 'es responsable de',
    description: 'Lidera la tarea y responde por el resultado.',
    icon: Crown,
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgColorClass: 'bg-violet-500/15',
    borderClass: 'border-violet-500/40',
    dotColor: 'bg-violet-500',
  },
  executor: {
    label: 'Ejecuta',
    question: '¿Quién ejecuta?',
    shortLabel: 'Ejecuta',
    verb: 'ejecuta',
    description: 'Realiza el trabajo principal de la tarea.',
    icon: Hammer,
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgColorClass: 'bg-cyan-500/15',
    borderClass: 'border-cyan-500/40',
    dotColor: 'bg-cyan-500',
  },
  reviewer: {
    label: 'Controla',
    question: '¿Quién controla?',
    shortLabel: 'Controla',
    verb: 'controla',
    description: 'Controla y valida el resultado.',
    icon: SearchCheck,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgColorClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/40',
    dotColor: 'bg-amber-500',
  },
};

export const TASK_ROLES: TaskRole[] = ['lead', 'executor', 'reviewer'];

export function assigneeByRole(task: Pick<Task, 'assignees'>, role: TaskRole) {
  return (task.assignees || []).filter(a => a.task_role === role);
}

export function taskRolesOfUser(task: Pick<Task, 'assignees'>, userId: string): TaskRole[] {
  return (task.assignees || []).filter(a => a.id === userId).map(a => a.task_role);
}

export interface TaskTypeInfo {
  id: string;
  label: string;
  description: string;
}

export interface TaskTypeCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  borderClass: string;
  dotColor: string;
  types: TaskTypeInfo[];
}

export const TASK_TYPE_CATEGORIES: TaskTypeCategory[] = [
  {
    id: 'contenido',
    label: 'Contenido y Redes',
    icon: Share2,
    colorClass: 'text-pink-600 dark:text-pink-400',
    bgColorClass: 'bg-pink-500/15',
    borderClass: 'border-pink-500/40',
    dotColor: 'bg-pink-500',
    types: [
      { id: 'redes_piezas', label: 'Creación de piezas para redes sociales', description: 'Diseño de artes, reels, historias y contenido para las redes del cliente.' },
      { id: 'redes_estrategia', label: 'Estrategia de contenido mensual', description: 'Calendario editorial y planificación de contenidos para el mes.' },
      { id: 'redes_community', label: 'Community management', description: 'Gestión diaria de comentarios, mensajes y comunidad en redes.' },
    ],
  },
  {
    id: 'pauta',
    label: 'Pauta y Campañas',
    icon: Megaphone,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgColorClass: 'bg-blue-500/15',
    borderClass: 'border-blue-500/40',
    dotColor: 'bg-blue-500',
    types: [
      { id: 'ads_piezas', label: 'Creación de piezas para ADS', description: 'Creatividades para campañas publicitarias pagas.' },
      { id: 'ads_gestion', label: 'Gestionar campaña publicitaria', description: 'Configuración, seguimiento y administración de campañas de pauta.' },
      { id: 'ads_lanzamiento', label: 'Lanzamiento de campaña', description: 'Puesta en marcha de una campaña nueva (pauta + creatividad).' },
      { id: 'ads_optimizacion', label: 'Optimización y reportes de campañas', description: 'Ajustes de rendimiento, presupuestos y reportes periódicos.' },
    ],
  },
  {
    id: 'web',
    label: 'Web y Desarrollo',
    icon: Globe,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgColorClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    dotColor: 'bg-emerald-500',
    types: [
      { id: 'web_landing', label: 'Creación de landing page', description: 'Desarrollo de una landing de conversión para una campaña o producto.' },
      { id: 'web_sitio', label: 'Creación de sitio web', description: 'Sitio web completo del cliente: diseño, contenido y desarrollo.' },
      { id: 'web_rediseno', label: 'Rediseño de sitio web', description: 'Actualización de diseño y estructura del sitio existente.' },
      { id: 'web_mantenimiento', label: 'Mantenimiento y actualización web', description: 'Soporte, mejoras y correcciones sobre el sitio.' },
    ],
  },
  {
    id: 'ecommerce',
    label: 'Ecommerce',
    icon: ShoppingCart,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgColorClass: 'bg-orange-500/15',
    borderClass: 'border-orange-500/40',
    dotColor: 'bg-orange-500',
    types: [
      { id: 'ecom_creacion', label: 'Creación de ecommerce', description: 'Tienda online completa: catálogo, pagos, envíos y checkout.' },
      { id: 'ecom_config', label: 'Configuración de tienda online', description: 'Armado de la tienda sobre una plataforma existente.' },
      { id: 'ecom_productos', label: 'Carga de productos / catálogo', description: 'Alta y optimización de fichas de producto y catálogo.' },
      { id: 'ecom_cro', label: 'Optimización de conversión (CRO)', description: 'Mejoras para aumentar ventas: checkout, fichas, ofertas.' },
    ],
  },
  {
    id: 'estrategia',
    label: 'Estrategia y Marketing',
    icon: Target,
    colorClass: 'text-violet-600 dark:text-violet-400',
    bgColorClass: 'bg-violet-500/15',
    borderClass: 'border-violet-500/40',
    dotColor: 'bg-violet-500',
    types: [
      { id: 'mk_plan', label: 'Plan de marketing mensual', description: 'Planificación de acciones y objetivos de marketing del mes.' },
      { id: 'mk_seo', label: 'SEO / Posicionamiento orgánico', description: 'Optimización para buscadores: palabras clave, contenido y técnico.' },
      { id: 'mk_email', label: 'Email marketing', description: 'Envios, newsletters y automatizaciones de email.' },
      { id: 'mk_branding', label: 'Identidad visual / marca', description: 'Logo, paleta, tipografías y manual de marca.' },
    ],
  },
];

export function taskTypeInfo(type: string | null | undefined): (TaskTypeInfo & { category: TaskTypeCategory }) | null {
  if (!type) return null;
  for (const cat of TASK_TYPE_CATEGORIES) {
    const t = cat.types.find(x => x.id === type);
    if (t) return { ...t, category: cat };
  }
  return null;
}

export function taskTypeLabel(type: string | null | undefined): string | null {
  return taskTypeInfo(type)?.label || null;
}

export function taskTypeCategory(type: string | null | undefined): TaskTypeCategory | null {
  return taskTypeInfo(type)?.category || null;
}
