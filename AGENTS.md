<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Build
- `npx next build` to check

## Git
- Do NOT push to GitHub until user explicitly requests it

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
- **Client Calendar section** (`/calendarios`): dedicated sidebar section "Calendario de clientes"; admins/operadores pick a client (only those with `social_calendar_enabled`), client users auto-see their own calendar; RLS on social_ideas scoped to client_id
- **Document Center** (`/documentos`): Word-like rich text documents (contentEditable + execCommand toolbar), owned by creator, shareable with other users (view/edit); tables `documents` + `document_shares` (migration 00024); API routes `/api/documents`, `/api/documents/[id]`, `/api/documents/[id]/shares`; JWT-based ownership via `decodeJwt(request)` Authorization header
- **Migration 00024**: documents, document_shares tables + RLS; added `documentos` module to visible_modules defaults and handle_new_user
- **Module system**: added `calendarios` and `documentos` to `ALL_MODULES`/`DEFAULT_MODULES`; sidebar falls back to role defaults so new modules show even before DB migration
- **Profile API**: now returns `client_id`; `User` type + auth store persist `client_id`
- **AI assistant in floating chat**: `src/app/api/ai/chat/route.ts` (JWT auth via `decodeJwt`, real dashboard context via `getClientMetrics`, connects to local opencode server via `@opencode-ai/sdk`, custom read-only agent `dashboard` defined in `.opencode/agents/dashboard.md`); `AIWidget` wired to the endpoint (loading/error states, session_id persisted in localStorage); `npm run ai` starts `opencode serve`; env vars `OPENCODE_SERVER_URL`, `OPENCODE_SERVER_USERNAME`, `OPENCODE_SERVER_PASSWORD`. Robot has a friendly personality called "Mini Merco" 🤖: warm welcome message in `aiWidget.welcome` (es/en), gradient bot avatar, and `buildPrompt` instructs the agent to answer warm with moderate emojis (😊👋✨✅📊💡) in plain text.
- **AI blocker fixed**: opencode CLI upgraded via Chocolatey from 1.17.7 → 1.18.11 (`choco upgrade opencode -y --ignore-dependencies`; the plain `choco upgrade` fails on an unrelated `kb2919442` dependency). The 500 `SQLiteError: no such column: replacement_seq` on the opencode state DB (`~/.local/share/opencode/opencode.db`) is resolved — 1.18.11 no longer references that column. DB backup kept at `C:\Users\user\AppData\Local\Temp\opencode\opencode-db-backup`. Note: old 1.17.7 TUI processes may still be running and hold the old binary; restart them if used.
- **AI document writer**: "Asistente IA" button in the Document Center editor → `DocumentAiDialog` (`src/components/document-ai-dialog.tsx`) lets the user pick tema/tono/extensión/destino; calls `POST /api/ai/document` (`src/app/api/ai/document/route.ts`, JWT auth via `decodeJwt`, same opencode server, new read-only agent `writer` defined in `.opencode/agents/writer.md` that outputs clean HTML using only p/h1/h2/h3/ul/ol/li/blockquote/strong/em/u/s/br/a tags); route sanitizes forbidden tags + event handlers + `javascript:` URLs. NOTE: opencode `serve` caches agents at startup — after adding/editing an agent in `.opencode/agents/`, restart the serve process or it will 500 "agent not found".
- **AI usage panel** (Settings → "Uso IA"): `AiUsagePanel` (`src/components/ai-usage-panel.tsx`) + `GET /api/ai/usage` (`src/app/api/ai/usage/route.ts`) reads the opencode SQLite DB (`~/.local/share/opencode/opencode.db`, configurable via `OPENCODE_DATA_DIR`) using Node built-in `node:sqlite` (read-only) to aggregate cost/tokens by model from the `message` table JSON. Shows total cost, sessions, messages, tokens, per-model breakdown with 7/30/all-day filter. NOTE: it's local spend approximation, NOT the real Zen balance (no public API exists — feature request #10448); real balance is at `console.opencode.ai`. Requires `@types/node@^22` for `node:sqlite` types.
- **Dark mode negro puro + gradientes tech**: `.dark` palette in `globals.css` is now pure black (`--background: oklch(0 0 0)`, near-black cards/sidebar), primary = vivid cyan, charts = vibrant cyan/violet/fuchsia/blue/teal. Added utility classes in `globals.css`: `text-gradient-tech` (cyan→blue→violet→fuchsia text clip), `bg-gradient-tech` (135° cian→índigo→violeta→magenta), `bg-gradient-tech-soft` (translucent for active items), `glow-tech` (indigo/fuchsia glow), `border-gradient-tech`, plus `transition-*` keyframes and `.ring-spin-tech` (conic spinner) for route transitions. Applied to: sidebar, topbar gradient hairline, AI floating button, main h1s, login page.
- **Sidebar rail**: `src/components/sidebar.tsx` rewritten as an always-minimized rail (`w-28`, mobile sheet `w-28`), each nav item is a vertical stack (icon square 44px on top, 2-line label below). Active item = gradient icon square + glow + left gradient bar + `text-gradient-tech` label + `bg-gradient-tech-soft` pill; hover = icon scale + tilt + cyan glow + blurred gradient halo behind the icon (`group-hover`). Bottom section: gradient-ring avatar with user initial, LangToggle/ThemeToggle icon-only (special hover: sun/moon icon spins 360° + flips on click; languages icon wobbles continuously), Settings + Logout rail items. Clicking a nav item shows `TransitionOverlay` (center screen: expanding cyan/violet/fuchsia rings + a gradient circle that "draws itself" via SVG stroke-dashoffset `draw` keyframe + soft pulsing gradient core + destination label over blurred backdrop) for ~700ms before `router.push`.
- **@Mentions system**: `src/lib/mentions.ts` (service-role supabase client via `getSupabase()`, `findMentionedUsers`, `createMentionNotifications`, `createNotification`). Typing `@Name` or `@email` in task/social comments creates a "Te mencionaron en un comentario" notification for the target (skips the author). UI: `src/components/mention.tsx` exports `MentionedText` (renders `@Mentions` as gradient chips) + `MentionInput` (autocomplete dropdown, arrow keys + Enter, matches full name / email local part). Wired into `task-detail-modal.tsx` (autocomplete + highlight) and `social-comment.tsx` (highlight only, no users list there).
- **Reminders system**: Migration 00025 (`reminders` table + RLS). `src/components/reminders-bell.tsx` = alarm clock button in topbar with count badge, add form (title + datetime-local), complete/delete, overdue shown in red with "VENCIDO". API: `/api/reminders` (GET/POST/PUT/DELETE by user_id) and `/api/reminders/check` (marks due & notified, inserts a `type: 'reminder'` notification). `useReminders` hook (`src/lib/hooks/use-reminders.ts`) polls `checkDue` every 30s and refreshes the list; bell panel re-checks on open.
- **Supabase typing gotcha**: `ReturnType<typeof createClient>` yields `never` rows for `.from()` queries in this supabase-js version (2.108). `src/lib/mentions.ts` now exports `SupabaseClient = SupabaseClientType<any, any, any, any, any>` (explicit generics) to keep insert/select results `any`-typed.

### In Progress
- (none)

### Known Issues
- `--` summary rows now filtered from campaign data via `name.trim().startsWith('--')`
- Admin check on user creation API now uses `jose.jwtVerify` instead of `supabase.auth.getUser` (fixes "Solo admins" error)
- `/api/ai/chat` needs `opencode serve` running (port 4096). If not running, endpoint returns 503 with "Ejecuta `npm run ai`". The serve process must be restarted after a reboot.

## Key Files
- `src/app/api/users/route.ts` — GET/POST users with JWT-based admin check
- `src/app/api/users/[id]/route.ts` — PUT/DELETE users with JWT-based admin check


