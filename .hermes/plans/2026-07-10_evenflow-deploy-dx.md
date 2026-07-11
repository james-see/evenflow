# Evenflow DX / Deploy-First Improvement Plan

## Problem Statement

The current user journey requires too many manual commands and unclear prerequisites:

1. README does not list requirements: Node ≥18, Git, `gh` CLI authenticated, GitHub repo.
2. The `deploy` command requires `--repo` every time instead of reading `evenflow.config.json` or git remote.
3. Users must run `npm install` inside the created site manually.
4. There is no `evenflow init` or `evenflow deploy` flow that creates a GitHub repo automatically.
5. The easiest real workflow — deploy an empty site first, then edit content live in the browser — is not documented.
6. Default credentials and the need to change the admin password immediately are not prominent.

## Goal

Reduce the public user journey to:

```bash
npm install -g evenflow
evenflow create my-site --repo myusername/my-site
cd my-site
evenflow deploy
evenflow dev        # optional local preview
```

Or, for users who already have a repo:

```bash
evenflow deploy --repo https://github.com/myusername/my-site
```

After deploy, the user opens the live site, logs in with `admin` / `admin123`, and changes the password and content immediately. No local editing required.

## Proposed Tasks

### Task 1: Update README with explicit prerequisites and workflows

**Files:** `README.md`

Add sections:
- Requirements (Node ≥18, Git, GitHub account, `gh` CLI installed and authenticated)
- Two workflows:
  1. **Deploy first, edit live** — create site, deploy, edit content and change password in the live admin
  2. **Local-first** — create site, dev locally, then deploy
- Step-by-step deploy instructions with `gh auth login` link
- How to change the default admin password
- How to export/import the SQLite DB between local and live
- Troubleshooting: `gh` CLI, branch protection, GitHub Pages source setting

### Task 2: Persist repo URL in `evenflow.config.json` during deploy

**Files:** `src/commands/deploy.ts`, `src/commands/create.ts`, `src/utils/config.ts`

- Create a small `loadConfig` / `saveConfig` helper.
- When `deploy` runs, if `--repo` is provided, save it to `evenflow.config.json`.
- On subsequent deploys with no `--repo`, read it from the config file, then fall back to git remote.
- Validate repo URL early and print a clear error if missing.

### Task 3: Auto-install dependencies in created / deployed sites

**Files:** `src/commands/dev.ts`, `src/commands/build.ts`, `src/commands/deploy.ts`

- `ensureNodeModules` already exists in `dev.ts` and `build.ts`. Move it to `src/utils/npm.ts` and reuse it in `deploy.ts`.
- In `create.ts`, run `npm install` automatically after scaffolding.

### Task 4: Add `evenflow deploy --create-repo`

**Files:** `src/commands/deploy.ts`, `src/cli.ts`

- Add `--create-repo` flag.
- If the repo does not exist and `gh` CLI is authenticated, run `gh repo create owner/repo --public --push` first.
- Only enable this when explicitly requested to avoid accidental public repos.

### Task 5: Improve CLI help and command descriptions

**Files:** `src/cli.ts`

- Update `HELP` text to show the deploy-first workflow.
- Add examples for `evenflow create my-site --repo user/repo` and `evenflow deploy`.
- Add `--create-repo` option documentation.

### Task 6: Add a setup / onboarding message after `evenflow create`

**Files:** `src/commands/create.ts`

After creating a site, print:
```
Next steps:
  cd my-site
  evenflow deploy --repo https://github.com/user/my-site
Then open the live site, log in with admin / admin123, and change your password.
```

### Task 7: Add `evenflow config` command

**Files:** `src/cli.ts`, `src/commands/config.ts`, `src/utils/config.ts`

- `evenflow config set repo https://github.com/user/my-site`
- `evenflow config get repo`
- `evenflow config list`

Useful for CI and for users who don't want to pass `--repo` every time.

### Task 8: Validate `gh` CLI and provide fallback instructions

**Files:** `src/commands/deploy.ts`

- If `gh` is missing, print the install URL and a fallback: push `dist/` to `gh-pages` manually or enable Pages in repo settings.
- If `gh` is installed but not authenticated, print `gh auth login` instruction.

### Task 9: Add a `--skip-build` deploy option for faster re-deploys

**Files:** `src/commands/deploy.ts`, `src/cli.ts`

- Useful when the user only changed content in the live CMS and wants to redeploy the same static shell.
- Default behavior still builds.

### Task 10: Update plan.md and README after implementation

**Files:** `plan.md`, `README.md`

- Mark completed tasks.
- Keep the README as the single source of truth for users.

## Verification

- `npm test` passes after changes.
- `evenflow create my-site` runs `npm install` automatically.
- `evenflow deploy` reads repo from config when no `--repo` is passed.
- `evenflow deploy --repo https://github.com/user/repo` saves repo to config.
- README accurately describes the deploy-first workflow.

## Risks / Tradeoffs

- `gh repo create --public` makes repos public by default. Must be explicit and documented.
- Client-side auth means the admin password is not truly secret from someone with repo access. Keep the security note in README.
- Auto-running `npm install` during `create` slows down scaffolding but removes a manual step.
