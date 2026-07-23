import type { Client, User, WeeklyInput, Optimization, LegacyTask, Integration, CampaignMetric } from './types';

export const mockUsers: User[] = [
  {
    id: 'user-1',
    role: 'admin',
    full_name: 'Sarah Chen',
    avatar_url: '/avatars/sarah.png',
    email: 'sarah@nexusagency.io',
  },
  {
    id: 'user-2',
    role: 'team',
    full_name: 'Marcus Johnson',
    avatar_url: '/avatars/marcus.png',
    email: 'marcus@nexusagency.io',
  },
  {
    id: 'user-3',
    role: 'client',
    full_name: 'Alex Rivera',
    avatar_url: '/avatars/alex.png',
    email: 'alex@brightsoul.com',
  },
  {
    id: 'user-4',
    role: 'client',
    full_name: 'Jordan Kim',
    avatar_url: '/avatars/jordan.png',
    email: 'jordan@peakperformance.com',
  },
];

export const mockClients: Client[] = [
  { id: 'client-1', name: 'BrightSoul Yoga', industry: 'Wellness & Fitness', status: 'active', logo_url: '' },
  { id: 'client-2', name: 'Peak Performance Gear', industry: 'Outdoor E-commerce', status: 'active', logo_url: '' },
  { id: 'client-3', name: 'Urban Brew Co.', industry: 'Food & Beverage', status: 'active', logo_url: '' },
  { id: 'client-4', name: 'GreenLeaf Home', industry: 'Home & Garden', status: 'paused', logo_url: '' },
  { id: 'client-5', name: 'CodeCraft Academy', industry: 'EdTech', status: 'onboarding', logo_url: '' },
  { id: 'client-6', name: 'Fullbai B2C', industry: 'E-commerce', status: 'active', logo_url: '' },
];

export const mockIntegrations: Integration[] = [
  { id: 'int-1', client_id: 'client-1', client_name: 'BrightSoul Yoga', google_connected: true, meta_connected: true, shopify_connected: false, tiktok_connected: true },
  { id: 'int-2', client_id: 'client-2', client_name: 'Peak Performance Gear', google_connected: true, meta_connected: true, shopify_connected: true, tiktok_connected: false },
  { id: 'int-3', client_id: 'client-3', client_name: 'Urban Brew Co.', google_connected: true, meta_connected: false, shopify_connected: false, tiktok_connected: false },
  { id: 'int-4', client_id: 'client-4', client_name: 'GreenLeaf Home', google_connected: true, meta_connected: true, shopify_connected: true, tiktok_connected: false },
  { id: 'int-5', client_id: 'client-5', client_name: 'CodeCraft Academy', google_connected: false, meta_connected: false, shopify_connected: false, tiktok_connected: false },
];

export const mockWeeklyInputs: WeeklyInput[] = [
  {
    id: 'wi-1',
    client_id: 'client-1',
    client_name: 'BrightSoul Yoga',
    week_start_date: '2026-05-25',
    metrics: {
      total_spend: 12500,
      total_conversions: 340,
      total_revenue: 58700,
      roas: 4.7,
      cpa: 36.76,
      impressions: 245000,
      clicks: 8900,
      platforms: {
        google: { spend: 6500, impressions: 120000, clicks: 4200, conversions: 180, revenue: 31200 },
        meta: { spend: 6000, impressions: 125000, clicks: 4700, conversions: 160, revenue: 27500 },
      },
    },
    context_notes: 'Launching summer sale campaign this week. Strong early indicators.',
    status: 'completed',
    ecommerce_milestones: ['special_sale', 'new_product_launch'],
  },
  {
    id: 'wi-2',
    client_id: 'client-2',
    client_name: 'Peak Performance Gear',
    week_start_date: '2026-05-25',
    metrics: {
      total_spend: 22000,
      total_conversions: 520,
      total_revenue: 110400,
      roas: 5.0,
      cpa: 42.31,
      impressions: 380000,
      clicks: 14500,
      platforms: {
        google: { spend: 12000, impressions: 200000, clicks: 7200, conversions: 280, revenue: 58800 },
        meta: { spend: 10000, impressions: 180000, clicks: 7300, conversions: 240, revenue: 51600 },
      },
    },
    context_notes: 'Inventory well-stocked. Retargeting campaign showing strong ROAS.',
    status: 'completed',
    ecommerce_milestones: ['stock_issue_resolved'],
  },
  {
    id: 'wi-3',
    client_id: 'client-1',
    client_name: 'BrightSoul Yoga',
    week_start_date: '2026-05-18',
    metrics: {
      total_spend: 11200,
      total_conversions: 290,
      total_revenue: 48100,
      roas: 4.3,
      cpa: 38.62,
      impressions: 220000,
      clicks: 8100,
      platforms: {
        google: { spend: 5800, impressions: 110000, clicks: 3900, conversions: 155, revenue: 25800 },
        meta: { spend: 5400, impressions: 110000, clicks: 4200, conversions: 135, revenue: 22300 },
      },
    },
    context_notes: 'Standard week, testing new ad creative on Meta.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-4',
    client_id: 'client-2',
    client_name: 'Peak Performance Gear',
    week_start_date: '2026-05-18',
    metrics: {
      total_spend: 20500,
      total_conversions: 480,
      total_revenue: 100400,
      roas: 4.9,
      cpa: 42.71,
      impressions: 360000,
      clicks: 13800,
      platforms: {
        google: { spend: 11000, impressions: 190000, clicks: 6800, conversions: 260, revenue: 54000 },
        meta: { spend: 9500, impressions: 170000, clicks: 7000, conversions: 220, revenue: 46400 },
      },
    },
    context_notes: 'Stock issues resolved, performance stabilizing.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-5',
    client_id: 'client-3',
    client_name: 'Urban Brew Co.',
    week_start_date: '2026-05-25',
    metrics: {
      total_spend: 3800,
      total_conversions: 85,
      total_revenue: 14200,
      roas: 3.7,
      cpa: 44.71,
      impressions: 85000,
      clicks: 3100,
      platforms: {
        google: { spend: 2000, impressions: 45000, clicks: 1600, conversions: 48, revenue: 8200 },
        meta: { spend: 1800, impressions: 40000, clicks: 1500, conversions: 37, revenue: 6000 },
      },
    },
    context_notes: 'Small test budget. Building brand awareness phase.',
    status: 'draft',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-6',
    client_id: 'client-6',
    client_name: 'Fullbai B2C',
    week_start_date: '2026-05-18',
    metrics: {
      total_spend: 300.32,
      total_conversions: 1,
      total_revenue: 923.15,
      roas: 3.07,
      cpa: 300.32,
      impressions: 150410,
      clicks: 3818,
      platforms: {
        google: { spend: 300.32, impressions: 150410, clicks: 3818, conversions: 1, revenue: 923.15 },
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      },
    },
    context_notes: 'Datos importados de Google Ads (18-24 Mayo 2026). 8 campañas activas. Performance Max - Cosmética Coreana generó la única conversión.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-7',
    client_id: 'client-6',
    client_name: 'Fullbai B2C',
    week_start_date: '2026-05-11',
    metrics: {
      total_spend: 280.50,
      total_conversions: 0,
      total_revenue: 0,
      roas: 0,
      cpa: 0,
      impressions: 125000,
      clicks: 3200,
      platforms: {
        google: { spend: 280.50, impressions: 125000, clicks: 3200, conversions: 0, revenue: 0 },
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      },
    },
    context_notes: 'Google Ads - Performance Max campaigns. Sin conversiones registradas esta semana.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-8',
    client_id: 'client-6',
    client_name: 'Fullbai B2C',
    week_start_date: '2026-05-04',
    metrics: {
      total_spend: 245.00,
      total_conversions: 2,
      total_revenue: 1560.00,
      roas: 6.37,
      cpa: 122.50,
      impressions: 98000,
      clicks: 2800,
      platforms: {
        google: { spend: 245.00, impressions: 98000, clicks: 2800, conversions: 2, revenue: 1560 },
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      },
    },
    context_notes: 'Semana con 2 conversiones. Performance Max con mejor rendimiento.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-9',
    client_id: 'client-6',
    client_name: 'Fullbai B2C',
    week_start_date: '2026-04-27',
    metrics: {
      total_spend: 310.00,
      total_conversions: 0,
      total_revenue: 0,
      roas: 0,
      cpa: 0,
      impressions: 142000,
      clicks: 3400,
      platforms: {
        google: { spend: 310.00, impressions: 142000, clicks: 3400, conversions: 0, revenue: 0 },
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      },
    },
    context_notes: 'Incremento de presupuesto pero sin conversiones. Revisar segmentación.',
    status: 'completed',
    ecommerce_milestones: [],
  },
  {
    id: 'wi-10',
    client_id: 'client-6',
    client_name: 'Fullbai B2C',
    week_start_date: '2026-04-20',
    metrics: {
      total_spend: 198.00,
      total_conversions: 1,
      total_revenue: 780.00,
      roas: 3.94,
      cpa: 198.00,
      impressions: 85000,
      clicks: 2100,
      platforms: {
        google: { spend: 198.00, impressions: 85000, clicks: 2100, conversions: 1, revenue: 780 },
        meta: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      },
    },
    context_notes: 'Primera semana con conversiones. Performance Max - Cosmética Coreana.',
    status: 'completed',
    ecommerce_milestones: [],
  },
];

export const mockCampaigns: CampaignMetric[] = [
  { id: 'cmp-1', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Demand Gen - Zonas Fronterizas', type: 'Generación de demanda', impressions: 9905, clicks: 268, cost: 13.96, conversions: 0, revenue: 0, ctr: 2.71, cpc: 0.05, roas: 0 },
  { id: 'cmp-2', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Demand Gen - Bs.As, Córdoba, SF y ER', type: 'Generación de demanda', impressions: 7407, clicks: 177, cost: 20.65, conversions: 0, revenue: 0, ctr: 2.39, cpc: 0.12, roas: 0 },
  { id: 'cmp-3', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Performance Max - Cosmética Coreana', type: 'Rendimiento máximo', impressions: 21165, clicks: 326, cost: 40.58, conversions: 1, revenue: 923.15, ctr: 1.54, cpc: 0.12, roas: 22.75 },
  { id: 'cmp-4', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Performance Max - Perfumes', type: 'Rendimiento máximo', impressions: 38111, clicks: 595, cost: 48.02, conversions: 0, revenue: 0, ctr: 1.56, cpc: 0.08, roas: 0 },
  { id: 'cmp-5', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Performance Max - Zonas Fronterizas', type: 'Rendimiento máximo', impressions: 21373, clicks: 552, cost: 45.72, conversions: 0, revenue: 0, ctr: 2.58, cpc: 0.08, roas: 0 },
  { id: 'cmp-6', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Search - Brand y Genérica', type: 'Buscar', impressions: 8871, clicks: 842, cost: 68.42, conversions: 0, revenue: 0, ctr: 9.49, cpc: 0.08, roas: 0 },
  { id: 'cmp-7', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Performance Max - Bs.As, Córdoba, SF y ER', type: 'Rendimiento máximo', impressions: 38237, clicks: 878, cost: 41.19, conversions: 0, revenue: 0, ctr: 2.30, cpc: 0.05, roas: 0 },
  { id: 'cmp-8', client_id: 'client-6', week_start_date: '2026-05-18', name: 'Search DSA', type: 'Buscar', impressions: 5341, clicks: 180, cost: 21.79, conversions: 0, revenue: 0, ctr: 3.37, cpc: 0.12, roas: 0 },
];

export const mockOptimizations: Optimization[] = [
  { id: 'opt-1', weekly_input_id: 'wi-1', client_name: 'BrightSoul Yoga', platform: 'google', action_taken: 'Paused underperforming broad-match keywords (-12% spend)', expected_impact: 'Reduce wasted spend by ~15%', created_at: '2026-05-26T10:30:00Z' },
  { id: 'opt-2', weekly_input_id: 'wi-1', client_name: 'BrightSoul Yoga', platform: 'meta', action_taken: 'Refreshed ad creative for summer campaign (3 new variants)', expected_impact: 'Improve CTR by 20%+', created_at: '2026-05-26T11:00:00Z' },
  { id: 'opt-3', weekly_input_id: 'wi-2', client_name: 'Peak Performance Gear', platform: 'google', action_taken: 'Increased bid by 15% on top-converting product segments', expected_impact: 'Increase conversion volume by 10%', created_at: '2026-05-26T09:00:00Z' },
  { id: 'opt-4', weekly_input_id: 'wi-2', client_name: 'Peak Performance Gear', platform: 'meta', action_taken: 'Built lookalike audience from Q1 purchaser list', expected_impact: 'Acquire 30+ new customers this week', created_at: '2026-05-26T09:30:00Z' },
  { id: 'opt-5', weekly_input_id: 'wi-3', client_name: 'BrightSoul Yoga', platform: 'meta', action_taken: 'A/B tested 2 headline variations on existing top ads', expected_impact: 'Identify winning copy for scale', created_at: '2026-05-19T14:00:00Z' },
  { id: 'opt-6', weekly_input_id: 'wi-4', client_name: 'Peak Performance Gear', platform: 'google', action_taken: 'Added negative keywords from search term report', expected_impact: 'Improve CTR by 5% and reduce irrelevant spend', created_at: '2026-05-19T15:30:00Z' },
  { id: 'opt-7', weekly_input_id: 'wi-4', client_name: 'Peak Performance Gear', platform: 'shopify', action_taken: 'Updated product feed with new inventory levels', expected_impact: 'Ensure accurate Shopping ad delivery', created_at: '2026-05-19T16:00:00Z' },
  { id: 'opt-8', weekly_input_id: 'wi-6', client_name: 'Fullbai B2C', platform: 'google', action_taken: 'Pausar campañas Demand Gen con 0 conversiones y redirigir presupuesto a Performance Max', expected_impact: 'Mejorar ROAS general en un 15%', created_at: '2026-05-25T10:00:00Z' },
  { id: 'opt-9', weekly_input_id: 'wi-6', client_name: 'Fullbai B2C', platform: 'google', action_taken: 'Optimizar palabras clave negativas en Search Brand y Genérica', expected_impact: 'Reducir CPC en un 10% y mejorar CTR', created_at: '2026-05-25T10:30:00Z' },
  { id: 'opt-10', weekly_input_id: 'wi-6', client_name: 'Fullbai B2C', platform: 'google', action_taken: 'Escalar Performance Max - Cosmética Coreana (única campaña con conversiones)', expected_impact: 'Aumentar conversiones en 3-5x esta semana', created_at: '2026-05-25T11:00:00Z' },
];

export const mockTasks: LegacyTask[] = [
  { id: 'task-1', client_id: 'client-1', client_name: 'BrightSoul Yoga', title: 'Review summer campaign creative', description: 'Sign off on 3 new ad variants for the summer sale push', status: 'in-progress', due_date: '2026-06-02', assignee: 'Marcus Johnson' },
  { id: 'task-2', client_id: 'client-1', client_name: 'BrightSoul Yoga', title: 'Set up TikTok pixel events', description: 'Configure standard and custom events in the TikTok Events Manager', status: 'todo', due_date: '2026-06-05', assignee: 'Marcus Johnson' },
  { id: 'task-3', client_id: 'client-2', client_name: 'Peak Performance Gear', title: 'Prepare monthly performance report', description: 'Compile May metrics for client presentation', status: 'in-progress', due_date: '2026-06-03', assignee: 'Sarah Chen' },
  { id: 'task-4', client_id: 'client-2', client_name: 'Peak Performance Gear', title: 'Audit Google Ads conversion tracking', description: 'Verify all conversion actions are firing correctly with GA4', status: 'todo', due_date: '2026-06-07', assignee: 'Sarah Chen' },
  { id: 'task-5', client_id: 'client-3', client_name: 'Urban Brew Co.', title: 'Build keyword list for launch campaign', description: 'Research and compile 50+ keywords for Google Ads launch', status: 'todo', due_date: '2026-06-10', assignee: 'Marcus Johnson' },
  { id: 'task-6', client_id: 'client-1', client_name: 'BrightSoul Yoga', title: 'Analyze ROAS drop last week', description: 'Investigate why ROAS dropped from 4.7 to 4.3', status: 'done', due_date: '2026-05-28', assignee: 'Sarah Chen' },
  { id: 'task-7', client_id: 'client-4', client_name: 'GreenLeaf Home', title: 'Pause campaign budget reallocation', description: 'Client paused — move budget to active accounts', status: 'done', due_date: '2026-05-25', assignee: 'Sarah Chen' },
];

export function getUserByEmail(email: string): User | undefined {
  return mockUsers.find((u) => u.email === email);
}

export function getClientsForUser(userId: string): Client[] {
  return mockClients;
}

export function getRecentWeeklyInputs(limit = 5): WeeklyInput[] {
  return [...mockWeeklyInputs].sort((a, b) => b.week_start_date.localeCompare(a.week_start_date)).slice(0, limit);
}

export function getWeeklyInputsByClient(clientId: string): WeeklyInput[] {
  return mockWeeklyInputs.filter((w) => w.client_id === clientId)
    .sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
}

export function getCampaignsByClientAndWeek(clientId: string, weekStartDate: string): CampaignMetric[] {
  return mockCampaigns.filter((c) => c.client_id === clientId && c.week_start_date === weekStartDate);
}

export function getRecentOptimizations(limit = 5): Optimization[] {
  return [...mockOptimizations].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}

export function getOptimizationsByClient(clientId: string): Optimization[] {
  const weeklyInputs = mockWeeklyInputs.filter((w) => w.client_id === clientId);
  const wiIds = weeklyInputs.map((w) => w.id);
  return mockOptimizations.filter((o) => wiIds.includes(o.weekly_input_id));
}

export function getTasksByStatus(status: LegacyTask['status']): LegacyTask[] {
  return mockTasks.filter((t) => t.status === status);
}

export function getActiveClients(): Client[] {
  return mockClients.filter((c) => c.status === 'active');
}

export function getWeekOverWeekMetrics(clientId: string): { current: WeeklyInput; previous: WeeklyInput } | null {
  const clientInputs = mockWeeklyInputs.filter((w) => w.client_id === clientId).sort((a, b) => b.week_start_date.localeCompare(a.week_start_date));
  if (clientInputs.length < 2) return null;
  return { current: clientInputs[0], previous: clientInputs[1] };
}

export const weeklyTrends = {
  spend: [
    { label: 'W1', value: 28400 },
    { label: 'W2', value: 30200 },
    { label: 'W3', value: 29800 },
    { label: 'W4', value: 32500 },
    { label: 'W5', value: 33800 },
  ],
  conversions: [
    { label: 'W1', value: 680 },
    { label: 'W2', value: 720 },
    { label: 'W3', value: 710 },
    { label: 'W4', value: 770 },
    { label: 'W5', value: 850 },
  ],
  roas: [
    { label: 'W1', value: 3.8 },
    { label: 'W2', value: 4.0 },
    { label: 'W3', value: 4.2 },
    { label: 'W4', value: 4.3 },
    { label: 'W5', value: 4.7 },
  ],
  cpa: [
    { label: 'W1', value: 44.2 },
    { label: 'W2', value: 42.8 },
    { label: 'W3', value: 41.5 },
    { label: 'W4', value: 40.1 },
    { label: 'W5', value: 38.4 },
  ],
};
