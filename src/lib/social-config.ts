import type { PostType, IdeaStatus, Responsable } from '@/lib/types';
import { Camera, Video, Images, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const RESPONSABLE_CONFIG: Record<Responsable, { label: string; colorClass: string }> = {
  nico: { label: 'Nico', colorClass: 'text-blue-500 bg-blue-500/15 border-blue-400/30' },
  mau: { label: 'Mau', colorClass: 'text-emerald-500 bg-emerald-500/15 border-emerald-400/30' },
};

export const POST_TYPE_CONFIG: Record<PostType, { label: string; icon: LucideIcon; colorClass: string; bgColorClass: string; borderColorClass: string; dotColor: string }> = {
  historia: {
    label: 'Historia',
    icon: Camera,
    colorClass: 'text-cyan-600',
    bgColorClass: 'bg-cyan-500/15',
    borderColorClass: 'border-cyan-400/40',
    dotColor: 'bg-cyan-400',
  },
  reel: {
    label: 'Reel',
    icon: Video,
    colorClass: 'text-pink-600',
    bgColorClass: 'bg-pink-500/15',
    borderColorClass: 'border-pink-400/40',
    dotColor: 'bg-pink-400',
  },
  carrusel: {
    label: 'Carrusel',
    icon: Images,
    colorClass: 'text-orange-600',
    bgColorClass: 'bg-orange-500/15',
    borderColorClass: 'border-orange-400/40',
    dotColor: 'bg-orange-400',
  },
};

export const STATUS_CONFIG: Record<IdeaStatus, { label: string; colorClass: string; dotColor: string; group: number }> = {
  borrador: { label: 'Borrador', colorClass: 'bg-gray-400/20 text-gray-500 border-gray-400/30', dotColor: 'bg-gray-400', group: 1 },
  en_revision: { label: 'En Revisión', colorClass: 'bg-amber-400/20 text-amber-600 border-amber-400/30', dotColor: 'bg-amber-400', group: 1 },
  necesita_modificaciones: { label: 'Necesita Modificaciones', colorClass: 'bg-orange-400/20 text-orange-600 border-orange-400/30', dotColor: 'bg-orange-400', group: 1 },
  aprobada: { label: 'Aprobado', colorClass: 'bg-emerald-400/20 text-emerald-600 border-emerald-400/30', dotColor: 'bg-emerald-400', group: 1 },
  listo_para_postear: { label: 'Listo para postear', colorClass: 'bg-blue-400/20 text-blue-600 border-blue-400/30', dotColor: 'bg-blue-400', group: 2 },
  posteado: { label: 'Publicado', colorClass: 'bg-green-400/20 text-green-600 border-green-400/30', dotColor: 'bg-green-500', group: 2 },
};
