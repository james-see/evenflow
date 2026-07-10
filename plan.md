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
- [x] Logout button in admin that invalidates the session and clears localStorage
- [x] Login rate limiting in the worker (5 attempts per 15-minute window)
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
  - [x] Login rate-limiting in the worker (5 attempts / 15 min window)
  - [ ] Force password change UI on first login (optional, not implemented)
  - [ ] Server-side guards impossible on static GH Pages; client-side guards are in place
- [x] Content types & fields
  - [x] "Content Types" admin tab now lists fields per type
  - [x] Create new content types with name, slug, and configurable fields (text, markdown, image, date, boolean)
  - [x] Delete custom content types (built-in `posts` type is protected)
  - [ ] Dynamic field rendering in content edit form (structure in place; edit form still uses title/body only)
- [x] Static site generation bridge
  - [ ] Not implemented; public pages rely on client-side SQLite. Optional future work.
- [x] Testing
  - [x] Added `test/evenflow.test.ts` using Node.js built-in test runner
  - [x] Tests verify root CLI build, template build, dev server startup, CLI help, and `create` scaffolding
  - [x] `npm test` passes 5/5
- [x] Dependency hygiene
  - [x] Added `@sveltejs/vite-plugin-svelte` v4 to devDependencies + overrides
  - [x] Reinstalled template deps; Svelte 5 warning is gone

## Notes

- The whole app is static and runs in the browser. Auth and route guards are client-side only; this is the intended architecture for zero-server GitHub Pages deploys.
- Media is stored as BLOB in SQLite/OPFS and rendered via object URLs. There is no public URL for images because there is no server.
- `npm run dev` in the template uses `astro dev` under the hood and is verified to start.
- `npm test` in the root package now runs smoke tests against the CLI and template.

## Remaining optional / future work

1. Force password change on first login (low priority).
2. Render dynamic content-type fields in the content edit form instead of hardcoded title/body.
3. Export published content to static markdown/JSON so public pages can render without client-side JS.
4. Browser smoke tests with Playwright for the full login → upload → post → render flow.
5. Address remaining `npm audit` vulnerabilities in template dependencies.

## Next recommended task

If you want to keep going, wire the content edit form to render inputs dynamically based on the selected content type's `fields` JSON. That would complete the custom content type feature end-to-end.
