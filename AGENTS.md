<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Build
- `npx next build` to check

## Progress

### Done
- Migration 00010: Added `week_start` DATE column + partial unique indexes to `ga_campaigns`, `ga_search_keywords`, `ga_asset_groups`, `meta_campaigns`, `meta_ad_sets`, `meta_ads`, `analytics_traffic` for weekly data accumulation
- Migration 00011: Fixed `meta_ad_sets` and `meta_ads` unique constraints to include `campaign_name`
- **Google Ads parser** (`parse-google-ads.ts`): skip first 2 metadata lines before PapaParse (CSV header is line 3); filter `--` summary rows; column name fallbacks; dedup for keywords/asset groups summing metrics by (keyword+match_type+campaign) and (asset_group_name)
- **Meta Ads parser** (`parse-meta-ads.ts`): detection order fixed (ad before ad_set before campaign); dedup for ad sets and ads
- **Old parser** (`csv-parser.ts`): `Coste`→`Costo` fallback, `CPC medio`→`Prom. CPC`, `Valor de conv./costo`; ad report detection fixed (`!/grupo/i`→`!/Informe\s*de\s*grupos?\s*de\s*anuncios/i`)
- **Upload API routes**: `upload-google-ads`, `upload-meta-ads`, `upload-analytics` — accept `week_start`, delete+insert pattern, dedup before insert
- **GET routes**: `google-ads`, `meta-ads`, `analytics` — support `month`, `week_start`, `view` (semanal/mensual) filters
- **Seed script**: recursive CSV search in `src/csv/multipoint`; routes to correct endpoint by source type; unsupported types (ad, adgroup) fallback to `upload-csv`; port 3000
- **All 37 multipoint CSV files seed successfully** — Google Ads (60 campaigns, 500 keywords, 42 asset groups), Meta Ads (9 campaigns, 9 ad sets, 9 ads), Analytics (4 sources) — verified via API with correct spend
- **Character encoding confirmed**: CSV files are UTF-8, API returns valid UTF-8 JSON (`Tecnología`, `Generación` stored correctly). Previous garbled display was PowerShell terminal limitation.

- **Social Calendar feature**: Click client → intermediate menu (Centro de Análisis / Calendario de Redes). Calendar with monthly grid, draggable idea pills (@dnd-kit), drag & drop between dates, "Nueva Idea" dialog, idea detail modal (large, blur backdrop, 3 tabs: Detalle/Adjuntos/Comentarios), comment system, point & click annotation on images
- **Migration 00013**: social_ideas, social_attachments, social_comments, social_annotations tables + RLS
- **Social API routes**: social-ideas, social-comments, social-attachments, social-annotations (CRUD)
- **Social hooks**: useSocialIdeas, useSocialAttachments, useSocialComments, useSocialAnnotations
- **Dependencies added**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **Social Calendar: Unique post type colors + status system**: Reel=pink, Historia=cyan, Carrusel=orange; statuses: Borrador, En Revisión, Necesita Modificaciones, Aprobado, Listo para postear, Publicado; quick status dropdown on pills/cards (no edit needed); published ideas blur green with check icon
- **Kanban Tasks system**: 4 columns (En espera, En revisión, Aprobado, Problemas), drag & drop between columns, task creation with client/title/description/priority/assignee/due date, inline status pills in modal, comments system, link attachments, user assignment
- **Notifications system**: Bell icon in top bar, unread count badge, mark as read, "Te asignaron una tarea" notifications on assignment, auto-refresh every 30s
- **Profile menu**: Avatar with initials fallback, click-to-upload photo, inline name editing, settings link, logout
- **Top bar**: Added to dashboard layout with notification bell + profile menu
- **Migration 00017**: tasks, task_comments, task_attachments, notifications tables + RLS
- **API routes**: tasks CRUD, task-comments, task-attachments, notifications (read/unread), users list

### In Progress
- (none)

### Known Issues
- `--` summary rows now filtered from campaign data via `name.trim().startsWith('--')`

## Key Files
- `src/components/social-calendar.tsx` — Monthly calendar with drag & drop ideas
- `src/components/social-new-idea-dialog.tsx` — Dialog to create new ideas
- `src/components/social-idea-card.tsx` — Idea summary cards below calendar
- `src/components/social-idea-modal.tsx` — Large modal with blur, tabs, annotations
- `src/components/social-comment.tsx` — Comment system component
- `src/components/social-annotation.tsx` — Point & click annotation on images
- `src/lib/hooks/use-social-ideas.ts` — Hooks for social calendar CRUD
- `src/app/api/social-ideas/route.ts` — Social ideas API
- `src/app/api/social-comments/route.ts` — Social comments API
- `src/app/api/social-attachments/route.ts` — Social attachments API
- `src/app/api/social-annotations/route.ts` — Social annotations API
- `src/lib/parse-google-ads.ts` — Google Ads parser with 2-line skip + dedup
- `src/lib/parse-meta-ads.ts` — Meta Ads parser with fixed detection order
- `src/lib/csv-parser.ts` — old parser with column name + detection fixes
- `src/app/api/upload-google-ads/route.ts` — Google Ads upload endpoint
- `src/app/api/upload-meta-ads/route.ts` — Meta Ads upload endpoint
- `src/app/api/upload-analytics/route.ts` — Analytics upload endpoint
- `src/app/api/google-ads/route.ts` — Google Ads GET with filters
- `src/app/api/meta-ads/route.ts` — Meta Ads GET with filters
- `scripts/seed-multipoint-data.ts` — seed script for all 37 files
- `supabase/migrations/00010_add_week_start.sql` — week_start + indexes
- `supabase/migrations/00011_fix_unique_constraints.sql` — meta fixes
- `supabase/migrations/00013_social_calendar.sql` — social calendar tables
