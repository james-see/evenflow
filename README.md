# Evenflow

A CLI tool that scaffolds a CMS-powered static site with SQLite WebAssembly + OPFS — deployable to GitHub Pages with zero server cost.

The site self-hosts its own database in the browser. No server. No external CMS. No database hosting. Just a static site with a full CMS backend running via SQLite WASM.

## Requirements

- Node.js 18+
- Git
- A GitHub account
- GitHub CLI (`gh`) installed and authenticated (`gh auth login`)
- For source development: a Mac, Linux, or Windows machine with `npm`

## Quick Start — Deploy First, Edit Live

This is the fastest path. You deploy a blank site, then log into the live admin panel and change your password and content there. The database lives in the browser's OPFS storage on your deployed origin.

```bash
# Install globally
npm install -g evenflow

# Create a new site
evenflow create my-site

# Deploy it to a GitHub repo you own
cd my-site
evenflow deploy --repo https://github.com/yourusername/my-site
```

After deploy, open the URL printed by the command (usually `https://yourusername.github.io/my-site/`).

1. Go to `/admin` and sign in with the default credentials:
   - Username: `admin`
   - Password: `admin123`
2. **Change the password immediately** in the admin panel.
3. Create content types, upload media, and publish posts.

All content is saved in the browser's SQLite/OPFS database on that origin. It survives page reloads and browser restarts.

## Local-First Workflow

If you prefer to preview and build locally before deploying:

```bash
npm install -g evenflow
evenflow create my-site
cd my-site
npm install
evenflow dev --port 4321
```

Open http://localhost:4321, log in with `admin` / `admin123`, and create content.

When ready to publish:

```bash
evenflow deploy --repo https://github.com/yourusername/my-site
```

**Note:** Content you create on `localhost` stays in your local browser. To move it to the live site, use **Settings → Export DB** in the local admin, then import the `.sqlite3` file in the live admin (import feature coming soon). Otherwise, just create content directly on the live site after deploy.

## Development from Source

```bash
git clone https://github.com/james-see/evenflow.git
cd evenflow
npm install
npm run build
npm test

# Run the template site in dev mode
cd src/template/default
npm install
npm run dev -- --port 4321
```

Open http://localhost:4321.

## How It Works

1. `evenflow create` scaffolds an Astro + Svelte site with SQLite WASM built in
2. The CMS admin panel at `/admin` lets you create content types, posts, and upload media — all stored in SQLite running in your browser via WebAssembly
3. Content persists in the browser's Origin Private File System (OPFS) — survives across sessions
4. `evenflow build` produces a static site in `dist/`
5. `evenflow deploy` pushes `dist/` to a `gh-pages` branch on GitHub — your site goes live on GitHub Pages

**No server. No API. No database hosting. The browser IS the backend.**

## Commands

| Command | Description |
|---------|-------------|
| `evenflow create <name>` | Scaffold a new site in `./<name>` |
| `evenflow dev` | Start local dev server (default port 4321) |
| `evenflow build` | Build static site to `dist/` |
| `evenflow deploy` | Deploy `dist/` to GitHub Pages |

### Options

- `--template <name>` — Template to use (default: `default`)
- `--port <number>` — Dev server port (default: `4321`)
- `--repo <url>` — GitHub repo URL for deploy. If omitted, Evenflow reads it from `evenflow.config.json` or the current git remote.

## Features

- **Authentication** — PBKDF2 password hashing in a Web Worker; sessions stored as tokens in `localStorage`
- **Route guards** — `/admin` requires login; `/login` redirects authenticated users to `/admin`
- **Logout** — One-click logout invalidates the session and clears local storage
- **Media library** — Upload images directly into SQLite BLOB storage; attach them to content
- **Custom content types** — Create new content types with configurable fields (text, markdown, image, date, boolean)
- **Database export** — Export the SQLite DB from the admin settings panel
- **Login rate limiting** — 5 failed attempts per 15-minute window
- **Zero-server deploy** — Static build deploys to GitHub Pages; the browser runs the CMS

## Testing

```bash
npm test
```

Runs smoke tests for:
- CLI TypeScript build
- Template Astro build
- Dev server startup
- CLI help output
- `evenflow create` scaffolding

## Tech Stack

- **CLI**: Node.js + TypeScript
- **Site Template**: Astro + Svelte 5 + Tailwind CSS
- **CMS Backend**: `@sqlite.org/sqlite-wasm` — SQLite 3.53 compiled to WebAssembly
- **Persistence**: OPFS (Origin Private File System) — browser-native persistent file storage
- **Deploy**: GitHub Pages (via `gh-pages` orphan branch)

## Browser Support

OPFS requires a modern browser:
- Chrome 111+
- Firefox 111+
- Safari 16.4+

Falls back to in-memory mode on older browsers.

## Security Notes

Because Evenflow sites are static and hosted on GitHub Pages, authentication and route guards are client-side only. The admin panel is protected by a login screen and PBKDF2-hashed passwords, but anyone with the static files can inspect them. This is sufficient for a personal CMS or read-only public site. **Change the default password after first deploy.** Do not store highly sensitive data in an Evenflow site.

## Troubleshooting

### `gh` CLI not found

Install it from https://cli.github.com/ and run `gh auth login`.

### Deploy fails because Pages is not enabled

Go to **Settings → Pages** in your GitHub repo and set the source to the `gh-pages` branch. Then redeploy.

### Content disappeared after deploy

Content lives in the browser's OPFS storage on the origin where it was created. Content created on `localhost` is separate from content created on `yourusername.github.io`. Export the DB from one origin and import it on the other (import feature coming soon), or simply create content on the live site.

## License

AGPL-3.0 — Free and open source.
