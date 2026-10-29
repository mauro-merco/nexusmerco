# Monthly Calendar Comment POST Investigation

Status: DONE_WITH_CONCERNS. Local code corrected; live reproduction unavailable.

## Evidence

- Read-only service-role REST select on locally configured database: selecting calendar_comments.id succeeds (200); selecting parent_id fails (400, PostgreSQL 42703, column does not exist).
- Migration 00054 creates no parent_id. Migration 00076 adds it. POST unconditionally sent parent_id: null even for root comments, unnecessarily requiring the replies migration.
- Supabase errors are plain objects. The previous instanceof Error catch returned literal Error, masking database failures.
- The reported share token was absent from both calendar_share_links and clients.share_token in the configured database. Production env file does not contain a complete independent URL/service-key pair. This database evidence cannot establish the actual production database configuration.
- The old production domain in repository documentation returned HTTP 404 for both the page and comments GET. No authenticated live POST was attempted.
- Proxy allows calendar-comments through to route authorization. Public access resolves the share token, then validates a Supabase session against the link/client permissions. Guest email headers alone do not authorize a viewer in the current helper. Authorization failures return explicit 401, unlike the masked database failure.

## Changes

- Root POST omits parent_id; replies retain parent validation and report missing replies schema with a migration-specific 503.
- GET/POST preserve plain Supabase messages and codes through the existing error sanitizer; parent lookup errors are no longer ignored.
- Frontend handles non-JSON failures, generic Error payloads, missing data, invalid lists and unconfirmed creation without appending phantom comments.
- Existing uncommitted public-actions/comment changes preserved.
- Regression coverage: tests/calendar-comments.test.cjs, mocked database only. No real comments inserted; no schema changes or deployments performed.

## Remaining Verification

Requires the current live origin and an authorized viewer or server error logs to confirm the exact production POST failure. Applying migration 00076 is still required for replies, not root comments. No credentials or personal records recorded here.
