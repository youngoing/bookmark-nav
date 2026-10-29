# P1 Favicon Payload Reduction

Date: 2026-10-29

## What Changed

- Hot list/dashboard paths no longer read or return large embedded `data:image` favicon values from MongoDB.
- Oversized favicon values are compacted to a short Google favicon URL at the API boundary.
- New favicon resolution no longer downloads remote `/favicon.ico` and stores it as base64.
- Published bookmarks and shared collections compact favicon values before storing public snapshots.
- Added a safe favicon storage migration script: `pnpm migrate:favicons` dry-runs by default.
- Added indexes for click sort and title sort:
  - `bookmarks_owner_clicks`
  - `bookmarks_owner_title`

## Before vs After

Baseline source: `docs/performance-p0-baseline.md`

| Metric | P0 | P1 | Change |
| --- | ---: | ---: | ---: |
| Dashboard payload | `1,155,097 bytes` | `49,000 bytes` | `-95.8%` |
| Recent page payload | `198,689 bytes` | `6,169 bytes` | `-96.9%` |
| `store.getDashboard` p50 | `2752.3 ms` | `111.0 ms` | `-96.0%` |
| `listBookmarksPage recent` p50 | `453.7 ms` | `39.0 ms` | `-91.4%` |
| Click sort keys examined | `44` | `9` | dedicated index |
| A-Z sort keys examined | `44` | `9` | dedicated index |

## Final Verification Snapshot

Command:

```bash
pnpm perf:backend
```

Key output:

- Dashboard response estimate: `49,000 bytes`
- Recent page response estimate: `6,169 bytes`
- `store.getDashboard` p50: `111.0 ms`
- `store.listBookmarksPage recent` p50: `39.0 ms`
- Click sort index: `bookmarks_owner_clicks`
- A-Z sort index: `bookmarks_owner_title`

Raw stored payload is intentionally unchanged by this step:

- Raw bookmarks JSON: `672,905 bytes`
- Raw sites JSON: `477,644 bytes`
- Stored bookmark favicon bytes: `645,284 bytes`
- Stored site favicon bytes: `465,617 bytes`

That means P1 avoids the runtime cost without mutating existing user data. A later migration can clean stored legacy favicon data if needed.

## Verification Commands Run

```bash
pnpm --filter @loomark/backend typecheck
pnpm --filter @loomark/backend build
pnpm --filter @loomark/frontend test
pnpm --filter @loomark/frontend build
pnpm --filter @loomark/backend exec tsx -e "import './src/config'; import { initializeDatabase } from './src/database/initialize'; import { closeDatabase } from './src/db'; initializeDatabase().finally(() => closeDatabase());"
pnpm perf:backend
```

Results:

- Backend typecheck passed.
- Backend build passed.
- Frontend tests passed: `30` tests across `5` files.
- Frontend build passed.
- Database initialization completed and created the new indexes locally.
- Backend P1 baseline passed.

## Remaining Work

1. Run the optional storage migration in the target environment after review: `pnpm --filter @loomark/backend run migrate:favicons -- --apply`.
2. Split dashboard into summary endpoints so the homepage does not depend on full bookmark metadata.
3. Split the large frontend `page.tsx` into route shell, data hooks, list views, filters, management panel, and lazy dialogs.
4. Revisit regex search before bookmark counts become large.
