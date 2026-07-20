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

### In Progress
- (none)

### Known Issues
- `--` summary rows now filtered from campaign data via `name.trim().startsWith('--')`

## Key Files
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
