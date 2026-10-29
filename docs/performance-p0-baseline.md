# P0 Performance Baseline

Date: 2026-10-29

## Scope

This baseline captures the current frontend build footprint and backend store-layer latency before refactoring. It is intended as the comparison point for the P1 performance work.

## Re-run Commands

```bash
pnpm build:frontend
pnpm perf:frontend
pnpm perf:backend
```

For a longer backend sample:

```bash
PERF_ITERATIONS=10 pnpm perf:backend
```

Full P0 pass:

```bash
pnpm perf:p0
```

`perf:backend` measures the backend store layer directly, bypassing auth and the Next.js API proxy. If legacy Google favicon URLs are present, `store.getDashboard` is skipped unless `PERF_ALLOW_DASHBOARD_SIDE_EFFECTS=1` is set, because the current dashboard code may fetch favicons and persist the resolved data URL.

## Frontend Baseline

Build command:

```bash
pnpm --filter @loomark/frontend build
```

Observed build output:

- Next.js build completed successfully.
- Root route First Load JS from Next output: `167 kB`.
- Shared First Load JS: `102 kB`.
- Build compile phase reported by Next: `5.8s`.

Artifact footprint from `pnpm perf:frontend`:

- `.next`: `409.3 MB`
- `.next/static`: `1.07 MB`
- `.next/standalone`: `54.5 MB`
- Root route manifest assets: `593.1 KB raw`, `164.0 KB gzip`
- Root route asset count: `9`
- Largest global CSS asset: `68.9 KB raw`, `12.4 KB gzip`

Current interpretation:

- The root route JS is not catastrophic, but it is heavy for a bookmark/navigation app.
- The single global CSS bundle is already large enough to justify CSS splitting during component refactor.
- The bigger user-visible problem is likely hydration/runtime work plus backend payload latency, not only static asset size.

## Backend Baseline

Command:

```bash
pnpm perf:backend
```

Sampled owner profile:

- Bookmarks: `44`
- Folders: `12`
- Tags: `12`
- Sites: `33`
- Legacy Google favicon sites: `0`

Store-layer timings, `PERF_ITERATIONS=5`:

| Operation | p50 | p95 | Notes |
| --- | ---: | ---: | --- |
| `store.getDashboard` | `2752.3 ms` | `2866.6 ms` | Dashboard payload is too large for this data size. |
| `store.listBookmarksPage recent` | `453.7 ms` | `549.7 ms` | Recent query uses the expected index but still returns heavy items. |
| `store.listBookmarksPage search` | `35.8 ms` | `45.7 ms` | Small result set in this sample. |
| `store.listBookmarksPage clicks sort` | `66.3 ms` | `152.9 ms` | No dedicated sort index yet. |
| `store.listBookmarksPage az sort` | `65.3 ms` | `130.8 ms` | No dedicated sort index yet. |

Payload profile:

- Raw bookmarks JSON: `672,905 bytes`
- Raw sites JSON: `477,644 bytes`
- Dashboard response estimate: `1,155,097 bytes`
- Recent page response estimate: `198,689 bytes`
- Bookmark favicon bytes: `645,284 bytes`
- Site favicon bytes: `465,617 bytes`
- Bookmark `data:image` favicon count: `44`
- Site `data:image` favicon count: `33`
- Max single favicon string: `189,937 bytes`

Mongo explain summary:

| Query | Index | Keys examined | Docs examined | Returned |
| --- | --- | ---: | ---: | ---: |
| recent | `bookmarks_owner_created_at` | `9` | `9` | `9` |
| clicks | `bookmarks_owner_created_at` | `44` | `44` | `9` |
| az | `bookmarks_owner_created_at` | `44` | `44` | `9` |
| search | `bookmarks_owner_created_at` | `44` | `44` | `1` |

Current interpretation:

- The immediate P1 backend target is response weight, especially embedded `data:image` favicons.
- `getDashboard` is too expensive for only 44 bookmarks because it returns and processes full bookmark/site payloads.
- Recent pagination uses the intended index; slow observed store latency is more consistent with repeated database round trips and large document transfer than an obvious collection scan.
- Click and A-Z sorts need dedicated indexes before the dataset grows.
- Regex search currently scans the owner subset; acceptable at this sample size, but it will not scale.

## Verification

```bash
pnpm --filter @loomark/frontend build
pnpm --filter @loomark/backend build
pnpm --filter @loomark/frontend test
pnpm --filter @loomark/backend typecheck
pnpm perf:frontend
pnpm perf:backend
```

Results:

- Frontend build passed.
- Backend build passed.
- Frontend tests passed: `30` tests across `5` files.
- Backend typecheck passed.
- Frontend and backend P0 baseline scripts passed.

## P1 Targets Suggested By P0

1. Stop returning full embedded favicon data in dashboard and list payloads.
2. Replace `getDashboard` full bookmark fetch with summary endpoints and Mongo aggregation.
3. Add projections for list endpoints so management-only fields and heavyweight fields are omitted from normal browsing.
4. Add indexes for `{ ownerId, clicks }` and `{ ownerId, title }`, then revisit search strategy.
5. Split `frontend/app/page.tsx` into route shell, data hooks, list views, sidebar filters, management panel, and lazy dialogs.
