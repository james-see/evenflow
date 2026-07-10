# Evenflow

<p align="center">
  <strong>Make Cloud Budgeting Smooth as Jam</strong>
</p>

<p align="center">
  Free and open source cloud budget management that runs entirely in your browser.
  Powered by SQLite WebAssembly + OPFS persistence — no server, no database, no cloud costs.
</p>

<p align="center">
  <a href="https://github.com/james-see/evenflow/blob/main/LICENSE">AGPL-3.0 License</a>
</p>

---

## What is Evenflow?

According to Forbes, businesses waste 30% of their cloud budget on average. Evenflow helps you track cloud spending, set budgets, and get alerts when costs spiral — all from your browser, with zero server infrastructure.

**100% browser-based.** The database runs locally via SQLite compiled to WebAssembly. Data persists in the browser's Origin Private File System (OPFS). No server. No API backend. No cloud database. Just a static site.

## Features

- **Service Tracking** — Monitor cloud services and their monthly costs
- **Budget Management** — Set spending limits with customizable alert thresholds
- **Triggers & Alerts** — Automate notifications when usage crosses thresholds
- **Segmentation** — Group services by environment (dev/prod), customer, or team
- **Data Export/Import** — Your data is portable. Export as a .sqlite file anytime.
- **Privacy First** — All data stays in your browser. Nothing is sent to any server.

## Tech Stack

- **Astro** — Static site framework (zero server cost)
- **Svelte 5** — Interactive dashboard components
- **Tailwind CSS** — Styling
- **TypeScript** — Type safety throughout
- **SQLite WASM** (`@sqlite.org/sqlite-wasm`) — Database in the browser
- **OPFS** — Persistent storage (the database file survives across sessions)

## Quick Start

```bash
# Clone
git clone https://github.com/james-see/evenflow.git
cd evenflow

# Install
npm install

# Dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

Evenflow is a static site — deploy the `dist/` folder anywhere:

- **GitHub Pages** — Free, push to repo
- **Cloudflare Pages** — Free, `npx wrangler pages deploy dist/`
- **Netlify** — Free, `netlify deploy --prod`
- **Self-host** — Serve `dist/` from any web server (nginx, Caddy, etc.)

No environment variables. No database connection strings. No server config.

## Browser Support

OPFS requires a modern browser:
- Chrome 111+
- Firefox 111+
- Safari 16.4+

Falls back to in-memory mode (data lost on refresh) on older browsers.

## License

AGPL-3.0 — Free and open source. See [LICENSE](LICENSE).