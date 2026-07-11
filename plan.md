# Evenflow Feature Development Plan

## Status

Root CLI `npm run build` ✅
Template `npm run build` ✅
Template `npm run dev` starts on `http://localhost:4321` ✅
Smoke tests `npm test` — 5 passed ✅

## Phase 1: Core CMS + Authentication ✅ COMPLETE

- [x] SQLite WASM + OPFS database layer with Web Worker
- [x] PBKDF2 password hashing via Web Crypto in worker
- [x] Default `admin / admin123` seeded user
- [x] Login component with session token storage in `localStorage`
- [x] Session verification and auto-redirect to `/admin` when valid
- [x] `/admin` route guard: redirects to `/login` if no token
- [x] `/login` route guard: redirects to `/admin` if already logged in
- [x] Logout button in admin with session invalidation
- [x] Login rate limiting in the worker (5 attempts / 15 min)
- [x] Root cause fixes:
  - `db.ts` auth/media helpers now send named payload fields (`username`, `password`, `userId`, `token`, `mediaId`) instead of a raw `params` array
  - Worker `media_get` now uses `mediaId` instead of colliding with request correlation `id`
  - `Login.svelte` typo `loadedOut` → `loggedOut`, `onsubmitCapture` → `onsubmit`
  - `db-worker.ts` `saltHex` now stores the real salt (was accidentally storing the derived hash)
  - `src/commands/dev.ts` no longer calls `process.exit()` on child close

## Phase 2: Media & Content Images ✅ COMPLETE

- [x] `media` table in SQLite schema (`id`, `name`, `mime_type`, `size`, `data` BLOB, `created_at`)
- [x] Worker endpoints: `media_insert`, `media_list`, `media_get`, `media_delete`
- [x] `db.ts` helpers: `insertMedia`, `listMedia`, `getMedia`, `deleteMedia`
- [x] New component: `src/components/ImageUpload.svelte`
  - Upload image files (max 2 MB, images only)
  - Display selectable grid of uploaded images
  - `selectable` + `onSelect` props for attaching images to content
- [x] New component: `src/components/MediaImage.svelte`
  - Renders a stored image by media ID using `getMedia` + object URL
- [x] `Admin.svelte` changes
  - New "Media" tab with full media library
  - Content create/edit forms include image attachment UI
  - Image IDs stored in `content.data` JSON as `{ images: [1, 2, ...] }`
- [x] `Home.svelte` renders the first attached image for each latest post
- [x] `Posts.svelte` renders all attached images for each post

## Phase 3: Refinement & Testing ✅ COMPLETE

- [x] Security / UX hardening
  - [x] Logout button in admin header
  - [x] Login rate-limiting in the worker
  - [ ] Force password change UI on first login (optional, not implemented)
- [x] Content types & fields
  - [x] "Content Types" admin tab lists fields per type
  - [x] Create new content types with name, slug, and configurable fields (text, markdown, image, date, boolean)
  - [x] Delete custom content types (built-in `posts` type is protected)
  - [ ] Dynamic field rendering in content edit form (structure in place; edit form still uses title/body only)
- [x] Testing
  - [x] Added `test/evenflow.test.ts` using Node.js built-in test runner
  - [x] Tests verify root CLI build, template build, dev server startup, CLI help, and `create` scaffolding
  - [x] `npm test` passes 5/5
- [x] Dependency hygiene
  - [x] Added `@sveltejs/vite-plugin-svelte` v4 to devDependencies + overrides
  - [x] Reinstalled template deps; Svelte 5 warning is gone

## Phase 4: Deploy DX ✅ COMPLETE

- [x] Add `src/utils/config.ts` with `loadConfig` / `saveConfig`
- [x] `create` command accepts `--repo` and stores it in `evenflow.config.json`
- [x] `deploy` command reads repo URL from: `--repo` > config file > git remote
- [x] `deploy` persists repo URL to config when `--repo` is passed
- [x] `create` runs `npm install` automatically after scaffolding
- [x] `deploy` uses shared `ensureNodeModules` helper from `src/utils/npm.ts`
- [x] Add `--create-repo` flag to `deploy` for `gh repo create`
- [x] Add `--skip-build` flag to `deploy` for faster re-deploys
- [x] Add `evenflow config list|get|set` command
- [x] Improve CLI help with deploy-first examples
- [x] Improve deploy error messages (missing `gh` CLI, Pages enable fallback)

## Notes

- The whole app is static and runs in the browser. Auth and route guards are client-side only; this is the intended architecture for zero-server GitHub Pages deploys.
- Media is stored as BLOB in SQLite/OPFS and rendered via object URLs. There is no public URL for images because there is no server.
- `npm run dev` in the template uses `astro dev` under the hood and is verified to start.
- `npm test` in the root package runs smoke tests against the CLI and template.

## Remaining optional / future work

1. Force password change on first login.
2. Render dynamic content-type fields in the content edit form instead of hardcoded title/body.
3. Import exported SQLite DB in the admin UI.
4. Export published content to static markdown/JSON so public pages can render without client-side JS.
5. Browser smoke tests with Playwright for the full login → upload → post → render flow.
6. Address remaining `npm audit` vulnerabilities in template dependencies.

## Next recommended task

Wire the content edit form to render inputs dynamically based on the selected content type's `fields` JSON. That would complete the custom content type feature end-to-end.
