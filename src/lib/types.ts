export type UserRole = 'admin' | 'team' | 'client';

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string;
  email: string;
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

export interface Task {
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
  created_at: string;
  user?: User;
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
