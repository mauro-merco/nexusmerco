import { Megaphone, MessageSquare, type LucideIcon } from 'lucide-react';
import type { SalaKind, SalaMemberRole, SalaParticipationAction } from './types';

export const SALA_KIND_CONFIG: Record<SalaKind, {
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  borderClass: string;
  gradient: string;
}> = {
  boletin: {
    label: 'Boletín',
    shortLabel: 'Boletín',
    description: 'Solo el equipo publica, todos leen y participan',
    icon: Megaphone,
    colorClass: 'text-amber-600 dark:text-amber-300',
    bgColorClass: 'bg-amber-500/12',
    borderClass: 'border-amber-500/30',
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
  },
  chat: {
    label: 'Sala de chat',
    shortLabel: 'Chat',
    description: 'Conversación abierta para todo el equipo',
    icon: MessageSquare,
    colorClass: 'text-cyan-600 dark:text-cyan-300',
    bgColorClass: 'bg-cyan-500/12',
    borderClass: 'border-cyan-500/30',
    gradient: 'from-cyan-500 via-blue-500 to-violet-500',
  },
};

/** Accent colors selectable when creating/editing a room. */
export const SALA_COLORS: { id: string; label: string; dotClass: string; ringClass: string }[] = [
  { id: 'cyan', label: 'Cian', dotClass: 'bg-cyan-500', ringClass: 'ring-cyan-500/50' },
  { id: 'violet', label: 'Violeta', dotClass: 'bg-violet-500', ringClass: 'ring-violet-500/50' },
  { id: 'fuchsia', label: 'Fucsia', dotClass: 'bg-fuchsia-500', ringClass: 'ring-fuchsia-500/50' },
  { id: 'emerald', label: 'Esmeralda', dotClass: 'bg-emerald-500', ringClass: 'ring-emerald-500/50' },
  { id: 'amber', label: 'Ámbar', dotClass: 'bg-amber-500', ringClass: 'ring-amber-500/50' },
  { id: 'blue', label: 'Azul', dotClass: 'bg-blue-500', ringClass: 'ring-blue-500/50' },
  { id: 'rose', label: 'Rosa', dotClass: 'bg-rose-500', ringClass: 'ring-rose-500/50' },
  { id: 'slate', label: 'Gris', dotClass: 'bg-slate-500', ringClass: 'ring-slate-500/50' },
];

export function salaColorDot(color?: string | null) {
  return SALA_COLORS.find(c => c.id === color)?.dotClass || 'bg-cyan-500';
}

export function salaEmojiGradient(color?: string | null) {
  switch (color) {
    case 'violet': return 'from-violet-500 via-purple-500 to-fuchsia-500';
    case 'fuchsia': return 'from-fuchsia-500 via-pink-500 to-rose-500';
    case 'emerald': return 'from-emerald-500 via-teal-500 to-cyan-500';
    case 'amber': return 'from-amber-500 via-orange-500 to-rose-500';
    case 'blue': return 'from-blue-500 via-indigo-500 to-violet-500';
    case 'rose': return 'from-rose-500 via-pink-500 to-fuchsia-500';
    case 'slate': return 'from-slate-500 via-slate-600 to-slate-700';
    default: return 'from-cyan-500 via-blue-500 to-violet-500';
  }
}

/** Quick reactions available on every message. */
export const SALA_REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '👀', '✅', '💡'] as const;

export const SALA_MEMBER_ROLE_CONFIG: Record<SalaMemberRole, { label: string; colorClass: string }> = {
  owner: { label: 'Creador', colorClass: 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30' },
  moderator: { label: 'Moderador', colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' },
  member: { label: 'Integrante', colorClass: 'bg-muted text-muted-foreground border-border' },
};

export const SALA_ACTION_CONFIG: Record<SalaParticipationAction, {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
}> = {
  joined: { label: 'Se unió a la sala', icon: MessageSquare, colorClass: 'text-cyan-600 dark:text-cyan-300', bgColorClass: 'bg-cyan-500/10' },
  left: { label: 'Salió de la sala', icon: MessageSquare, colorClass: 'text-slate-500', bgColorClass: 'bg-slate-500/10' },
  message_sent: { label: 'Envió un mensaje', icon: MessageSquare, colorClass: 'text-blue-600 dark:text-blue-300', bgColorClass: 'bg-blue-500/10' },
  reply_sent: { label: 'Respondió un mensaje', icon: MessageSquare, colorClass: 'text-indigo-600 dark:text-indigo-300', bgColorClass: 'bg-indigo-500/10' },
  bulletin_published: { label: 'Publicó un boletín', icon: Megaphone, colorClass: 'text-amber-600 dark:text-amber-300', bgColorClass: 'bg-amber-500/10' },
  reaction_added: { label: 'Reaccionó', icon: MessageSquare, colorClass: 'text-rose-600 dark:text-rose-300', bgColorClass: 'bg-rose-500/10' },
  reaction_removed: { label: 'Quitó una reacción', icon: MessageSquare, colorClass: 'text-slate-500', bgColorClass: 'bg-slate-500/10' },
  message_viewed: { label: 'Marcó un mensaje como visto', icon: MessageSquare, colorClass: 'text-emerald-600 dark:text-emerald-300', bgColorClass: 'bg-emerald-500/10' },
  message_deleted: { label: 'Eliminó un mensaje', icon: MessageSquare, colorClass: 'text-red-600 dark:text-red-300', bgColorClass: 'bg-red-500/10' },
  room_created: { label: 'Creó una sala', icon: MessageSquare, colorClass: 'text-violet-600 dark:text-violet-300', bgColorClass: 'bg-violet-500/10' },
  room_updated: { label: 'Editó una sala', icon: MessageSquare, colorClass: 'text-slate-500', bgColorClass: 'bg-slate-500/10' },
  room_deleted: { label: 'Eliminó una sala', icon: MessageSquare, colorClass: 'text-red-600 dark:text-red-300', bgColorClass: 'bg-red-500/10' },
};

export function salaActionLabel(action: string): string {
  return SALA_ACTION_CONFIG[action as SalaParticipationAction]?.label || action;
}
