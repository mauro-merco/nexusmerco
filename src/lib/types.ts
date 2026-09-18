export type UserRole = 'admin' | 'operador' | 'client';

export const ALL_MODULES = ['dashboard', 'wizard', 'tareas', 'equipo', 'analysis', 'integrations', 'insights', 'calendarios', 'documentos', 'mensajes'] as const;
export type ModuleId = typeof ALL_MODULES[number];

export const DEFAULT_MODULES: Record<UserRole, ModuleId[]> = {
  admin: ['dashboard', 'wizard', 'tareas', 'equipo', 'analysis', 'integrations', 'insights', 'calendarios', 'documentos', 'mensajes'],
  operador: ['dashboard', 'wizard', 'tareas', 'equipo', 'analysis', 'insights', 'calendarios', 'documentos', 'mensajes'],
  client: ['dashboard', 'analysis', 'insights', 'calendarios', 'documentos', 'mensajes'],
};

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string;
  email: string;
  visible_modules: ModuleId[];
  client_id?: string | null;
  totp_enabled?: boolean;
  bio?: string;
  headline?: string;
  is_public?: boolean;
}

export interface Client {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'paused' | 'onboarding';
  logo_url: string;
}

export interface WeeklyMetrics {
  total_spend: number;
  total_conversions: number;
  total_revenue: number;
  roas: number;
  cpa: number;
  impressions: number;
  clicks: number;
  platforms: {
    google: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };
    meta: { spend: number; impressions: number; clicks: number; conversions: number; revenue: number };
  };
}

export interface WeeklyInput {
  id: string;
  client_id: string;
  client_name: string;
  week_start_date: string;
  metrics: WeeklyMetrics;
  context_notes: string;
  status: 'draft' | 'completed';
  ecommerce_milestones: string[];
}

export interface Optimization {
  id: string;
  weekly_input_id: string;
  client_name: string;
  platform: 'google' | 'meta' | 'tiktok' | 'shopify';
  action_taken: string;
  expected_impact: string;
  created_at: string;
}

export interface LegacyTask {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  due_date: string;
  assignee: string;
}

export interface Integration {
  id: string;
  client_id: string;
  client_name: string;
  google_connected: boolean;
  meta_connected: boolean;
  shopify_connected: boolean;
  tiktok_connected: boolean;
}

export interface AIInsight {
  id: string;
  client_id: string;
  query: string;
  response: string;
  created_at: string;
}

export interface CampaignMetric {
  id: string;
  client_id: string;
  week_start_date: string;
  name: string;
  type: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  moduleId: ModuleId;
  roles: UserRole[];
}

export type PostType = 'historia' | 'reel' | 'carrusel';
export type IdeaStatus = 'borrador' | 'en_revision' | 'necesita_modificaciones' | 'aprobada' | 'listo_para_postear' | 'posteado';
export type Responsable = 'nico' | 'mau';

export interface SocialIdea {
  id: string;
  client_id: string;
  title: string;
  description: string;
  brief: string;
  eje_contenido: string;
  copy_text: string;
  responsable: Responsable;
  post_type: PostType;
  status: IdeaStatus;
  publish_date: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAttachment {
  id: string;
  idea_id: string;
  type: 'image' | 'video' | 'link';
  url: string;
  preview_url: string;
  name: string;
  created_at: string;
}

export interface SocialComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  guest_name: string | null;
  action_type: string;
  created_at: string;
  user?: User;
  replies?: SocialComment[];
  annotations?: SocialAnnotation[];
}

export interface SocialAnnotation {
  id: string;
  comment_id: string;
  attachment_id: string;
  x: number;
  y: number;
  label: string;
  created_at: string;
}

export type TaskStatus = 'en_espera' | 'en_revision' | 'aprobado' | 'problemas' | 'cerrada';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: TaskStatus;
  author_id: string | null;
  priority: TaskPriority;
  due_date: string | null;
  /** @deprecated superseded by pieces_stories/pieces_feed/pieces_reels; kept for tasks created before the breakdown existed */
  pieces_count: number | null;
  pieces_stories: number | null;
  pieces_feed: number | null;
  pieces_reels: number | null;
  completed_at: string | null;
  position: number;
  share_token: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  assignees: User[];
  author?: User | null;
  client?: Client | null;
  comment_count?: number;
  attachment_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user?: User;
  replies?: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  url: string;
  name: string;
  type: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  task_id: string | null;
  link: string | null;
  read: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string;
  reminder_at: string;
  done: boolean;
  notified: boolean;
  created_at: string;
}

export interface NexusDocument {
  id: string;
  owner_id: string;
  client_id?: string | null;
  title: string;
  content: string;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  owner?: User | null;
  shared_users?: User[];
  is_shared_with_me?: boolean;
  can_edit?: boolean;
}

export interface ClientWallMessage {
  id: string;
  client_id: string;
  user_id: string | null;
  content: string;
  created_at: string;
  user?: User | null;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  user_id: string;
  created_at: string;
  user?: User | null;
}

export interface StickyNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  category: string;
  category_color: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: User | null;
  recipient?: User | null;
}

export interface EcommerceDate {
  id: string;
  client_id: string;
  name: string;
  color: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PublicProfile {
  user: User | null;
  tasks: Task[];
  documents: NexusDocument[];
  notes: StickyNote[];
}
