# Regression checks

Run `npm ci --ignore-scripts`, `CI=true npm test -- --watchAll=false --runInBand`, and `CI=true npm run build`.

Unit tests cover cent-exact settlement, personal expenses, duplicate participants, invalid money, transaction retry snapshots, concurrent additions/deletions/edits, same-field conflicts, coupled coordinates/currency fields, AI result validation, and map request caching/cancellation/fallbacks.

## Offline browser checks

The fixture build aliases Firebase and Google Maps with local fakes. The real application code and compiled CSS are used. Browser requests to all non-local hosts are blocked. These tests do not exercise production credentials, Firestore rules, actual Google Maps rendering/routing, or paid AI calls.

1. `node tests/browser/build.cjs`
2. `python3 -m http.server 18766 --bind 127.0.0.1 --directory build-browser-test`
3. With Playwright available in your development environment, run `node tests/browser/smoke.cjs`. Optionally set `CHROMIUM_PATH` to an installed Chromium executable and `NODE_PATH` to an existing Playwright installation.

The browser script tests 320/390/768px widths, a 500px-tall viewport, deferred maps, unchanged-route reuse, edits during remote updates, preserved conflict drafts, historical exchange rates, deterministic settlement, map-load failure, and manual location editing. Screenshots go to the system temporary directory; set `SCREENSHOT_DIR` to override overview screenshots.

## Release notes

- Existing Firestore document shape is retained; no migration or data cleanup is required.
- All collaborators must reload after release. An already-open old version can still issue stale full-array writes.
- Transactions require network access. Save failures leave the editor/draft open for retry; the application does not claim an offline write was saved.
- Existing expenses identify people by nickname. New profiles reject duplicate nicknames; old ambiguous names need human review.
- Settlement uses stored TWD amounts, integer cents, and a deterministic name-sorted remainder allocation. Transfers balance exactly; the greedy transfer list is not guaranteed to minimize the number of transfers globally.
- Route previews retain the existing driving mode. More than 27 land stops or routing failures show all pins with an explanatory message.
- The repository still uses its existing Firebase access rules, anonymous member-selection model, and external AI/image/export services. Live rules, account quotas, real-device keyboards, and third-party service availability require staging verification before merging.

This branch and workflow only test/build; neither deploys nor merges into the production branch.

## Deployment configuration (required before merge)

The existing Firebase/ImgBB values now come from `REACT_APP_FIREBASE_API_KEY` and `REACT_APP_IMGBB_API_KEY`. Configure the same values in Vercel for Preview and Production without redeploying production. Keep the existing `REACT_APP_GOOGLE_MAPS_API_KEY` and server-only `GEMINI_API_KEY` settings. Local values belong in ignored `.env.local`; `.env.example` contains names only.

These two `REACT_APP_` values retain the existing browser integration and are included in the built client. Moving them out of source avoids committing credentials; it does not turn client configuration into server-only secrets. No Firebase project, data, security rule, or production deployment is changed by this PR.
