# P1 Frontend Split And Lazy Loading

Date: 2026-10-29

## What Changed

- Extracted shared homepage utilities into `frontend/app/home/shared.tsx`.
- Split the edit management workspace into `frontend/app/home/management-workspace.tsx`.
- Split account, bookmark, folder, tag, site, and publish dialogs into `frontend/app/home/dialogs.tsx`.
- `frontend/app/page.tsx` now lazy-loads:
  - `ManagementWorkspace`
  - `DialogHost`
- Modal tests now wait for lazy-loaded dialogs before asserting headings.

## Before vs After

Baseline source: `docs/performance-p0-baseline.md`

| Metric | P0 | P1 frontend split | Change |
| --- | ---: | ---: | ---: |
| Home First Load JS | `167 kB` | `155 kB` | `-12 kB` |
| Root route manifest assets raw | `593.1 KB` | `526.2 KB` | `-66.9 KB` |
| Root route manifest assets gzip | `164.0 KB` | `151.9 KB` | `-12.1 KB` |
| Root route asset count | `9` | `9` | unchanged |

## Notes

- The measured first-load improvement is moderate because the page still imports a broad icon set and several browse-only components statically.
- The important architectural change is that edit-management and modal code now has its own loading boundary, so follow-up splits can keep shrinking the homepage without rewriting UI.
- The edit route still reuses `Home`; a later step can split `/edit` into a dedicated route entry if a larger bundle reduction is needed.

## Verification Commands Run

```bash
pnpm --filter @loomark/frontend build
pnpm --filter @loomark/frontend test
pnpm perf:frontend
```

Results:

- Frontend production build passed.
- Frontend tests passed: `30` tests across `5` files.
- Frontend baseline script passed.

## Remaining Work

1. Move browse-only display components out of `page.tsx`.
2. Trim the broad `lucide-react` import list in `page.tsx`.
3. Split `/edit` into a dedicated entry instead of routing through `Home`.
4. Consider route-level prefetching for dialogs in edit mode if the first modal open feels delayed.
