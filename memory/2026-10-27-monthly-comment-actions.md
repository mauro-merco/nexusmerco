# Monthly Comment Actions

- Root cause: CalendarComments lacked editing and seen controls, used caller/store identity for ownership UI, and swallowed deletion errors.
- Fix: monthly API returns its session-verified viewer ID; the hook and UI use it for ownership and seen state. Monthly edit/delete/seen mutations validate link client/type/month and target ownership on the server. Reader lists are fetched separately so normal posting/editing does not depend on the seen migration.
- Hardened the existing ID route to verify real sessions and public target scope as well, preventing an alternate unscoped mutation path.
- Persistence: migration 00078_calendar_comment_reads.sql extends comment_reads' type constraint with calendar_comment while retaining task/social/ADS types. No parent_id dependency for normal posts or edits. Migration was not applied; no real database mutations performed.
- Verification: focused mocked route tests cover ownership, forged actor input, target client/type/month boundaries, link month/type mismatch, seen on/off, unauthorized access, validation, and missing migration errors. The existing root-post tests still pass.
- Broader test blocker: tests/task-description.mjs cannot resolve ./description-format. Unrelated file left unchanged.
- Browser/live persistence verification remains pending an authorized test environment with migration 00078 applied.
- Proxy/2FA unchanged. Existing unrelated work preserved. No commit, push, or deployment.
