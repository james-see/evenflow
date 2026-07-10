# Evenflow

A CLI tool that scaffolds a CMS-powered static site with SQLite WebAssembly + OPFS — deployable to GitHub Pages with zero server cost.

The site self-hosts its own database in the browser. No server. No external CMS. No database hosting. Just a static site with a full CMS backend running via SQLite WASM.

## Quick Start

```bash
# Install globally
npm install -g evenflow

# Create a new site
evenflow create my-site

# Enter the directory and install deps
cd my-site
npm install

# Start dev server
evenflow dev

# Build for production
evenflow build

# Deploy to GitHub Pages
evenflow deploy --repo https://github.com/yourusername/my-site
```

## How It Works

1. `evenflow create` scaffolds an Astro + Svelte site with SQLite WASM built in
2. The CMS admin panel at `/admin` lets you create content types and posts — all stored in SQLite running in your browser via WebAssembly
3. Content persists in the browser's Origin Private File System (OPFS) — survives across sessions
4. `evenflow build` produces a static site in `dist/`
5. `evenflow deploy` pushes to a `gh-pages` branch on GitHub — your site goes live on GitHub Pages

**No server. No API. No database hosting. The browser IS the backend.**

## Commands

| Command | Description |
|---------|-------------|
| `evenflow create <name>` | Scaffold a new site |
| `evenflow dev` | Start local dev server (default port 4321) |
| `evenflow build` | Build static site to `dist/` |
| `evenflow deploy` | Deploy to GitHub Pages via `gh-pages` branch |

### Options

- `--template <name>` — Template to use (default: `default`)
- `--port <number>` — Dev server port (default: `4321`)
- `--repo <url>` — GitHub repo URL for deploy

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

## License

AGPL-3.0 — Free and open source.