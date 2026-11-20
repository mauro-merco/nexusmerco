# Client Calendar Portal

## Deployment Prerequisite

Apply `supabase/migrations/00084_client_calendar_portal.sql` after the preceding migrations, before deploying the application changes. This workspace change does not apply SQL or alter a live database.

The migration creates a service-role-only portal configuration table, a service-role-only personal notification table, and insert triggers on monthly, social and ADS comments. Both tables have RLS enabled and no direct authenticated/anonymous policies.

## Sharing

Staff with access to the client open **Compartir > Portal del cliente > Crear portal** from the unified, social or ADS calendar. Saving explicitly enables a new client-wide portal. Its token is stable across subsequent saves and across months and calendar types.

Users assigned to the client (including `allowed_client_ids`) can sign in. Additional client accounts can be selected as guests. Disabling guest access revokes those additional grants without revoking ordinary client membership. Disabling the portal revokes its URL without rotating its token. Neither action modifies monthly links.

Monthly links remain independently configured and month-restricted. Existing `clients.share_token` legacy URLs retain their previous behavior; they are not silently converted into configured portals.

## Client Flow

The universal URL `/c/<token>` requires an authenticated, authorized Supabase session. Its overview lists months containing scheduled social/ADS ideas, counts by source and status, and a selector for opening an empty month. Only enabled calendar sources are included. Opening a month reuses the existing calendar, agenda, folders, comments and idea modal. `month`, `type` and `idea` query parameters support direct links. **Todos los meses** returns to the overview without signing out.

**Para vos** shows the most recent 100 mentions and replies addressed to the current account for this client, with unread indicators, explicit mark-read and links to the corresponding month/idea. It also appears on monthly links, restricted to that link's month and sources. It refreshes every 20 seconds. This is not a feed of the user's unrelated dashboard notifications or the agency's private activity history.

## Mentions And Delivery

Public comment autocomplete offers client accounts authorized through the same link's membership or explicit invitations, never the full user directory. Internal monthly/social comment autocomplete additionally offers the relevant client accounts while preserving staff suggestions.

Insert triggers deliver notifications for `@Full Name` / `@emailLocalPart` mentions and replies to a client's own comment, whether written from the dashboard or a shared URL. Self-notifications are skipped and a reply containing a mention produces one event. Delivery is transactional with comment creation. Notification records start when the migration is applied; there is no historical backfill or notification on editing an existing comment. Stored excerpts are activity snapshots (up to 500 characters), not live mirrors of later edits or deletions. No email or push delivery is implemented.

## Security Boundaries

Portal configuration and internal mention discovery use the existing private API authentication/2FA proxy. Token-nested public endpoints do not bypass the private notifications API: they independently verify a Supabase session and resolve the enabled share link on every request. Email text is never accepted as proof of identity. Notification reads and updates are constrained by the verified recipient, resolved client, enabled sources, and monthly scope where applicable. Scoped staff cannot use a portal outside their permitted clients.

No tests, build, lint, browser checks, deployment, commits or live database changes were run for this implementation, as requested.
