export const ROADMAP_STATUSES = {
  propuesta: 'Propuesta', en_evaluacion: 'En evaluación', planificada: 'Planificada',
  en_curso: 'En curso', completada: 'Completada', descartada: 'Descartada',
} as const;
export type RoadmapStatus = keyof typeof ROADMAP_STATUSES;
export interface RoadmapComment {
  id: string; initiative_id: string; author_id: string; content: string;
  created_at: string; updated_at: string; author_name: string;
}
export interface RoadmapInitiative {
  id: string; title: string; description: string; outcome: string; scope: string;
  position: number; status: RoadmapStatus; author_id: string | null;
  yes_count: number; no_count: number; my_vote: 'yes' | 'no' | null;
  comment_count: number;
}
