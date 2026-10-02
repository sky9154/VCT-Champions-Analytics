# VCT Champions Web Application

The React and TypeScript web application uses Vite for development and builds static files for production. The browser sends API requests to same-origin `/api` paths. It does not connect directly to MongoDB, DuckDB, or Liquipedia.

## Requirements

- Bun for dependency installation and the project scripts
- Node.js 20.19+ or 22.12+ for the Vite toolchain and `server.mjs`
- A running API service at `127.0.0.1:8591` when using pages that need data

Install Bun by following the [official installation guide](https://bun.sh/docs/installation). Open a Terminal in `frontend/` and install dependencies:

```bash
bun --version
bun install
```

## Development

Start the API service separately, then run the Vite development server:

```bash
bun run dev
```

Vite binds to `127.0.0.1:5577` and proxies `/api/*` to the development target. By default, `VITE_API_PROXY_TARGET` is blank in `.env.example`, so `vite.config.ts` uses `http://127.0.0.1:8591`.

To set a development proxy target locally, create `.env.local` from the example and set `VITE_API_PROXY_TARGET` to the API service address:

```bash
cp .env.example .env.local
```

```dotenv
VITE_API_PROXY_TARGET=http://127.0.0.1:8591
```

## Typecheck and build

The relevant scripts are defined in `package.json`:

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the Vite development server |
| `bun run typecheck` | Run the TypeScript project checks |
| `bun run build` | Typecheck and create the production build |
| `bun run serve` | Run the production web server |

Run typecheck and build from `frontend/`:

```bash
bun run typecheck
bun run build
```

The production build is written to `frontend/dist/`.

## Production web server

Build the web application before starting the production web server:

```bash
bun run build
bun run serve
```

`bun run serve` runs `node server.mjs`; Bun does not replace the Node.js runtime used by this script. The web server reads files from `dist/`, binds to `0.0.0.0:5577`, and exits with an error if the production build is missing. It does not start a development server as a fallback.

For browser navigations to application routes, the web server serves `index.html` when no matching file exists. Missing asset requests remain not found. API calls keep the `/api` path and are proxied to `127.0.0.1:8591` on the same machine. The API port must remain closed to LAN clients.

## Web server lifecycle

The production web server runs in the Terminal where `bun run serve` was started. Stop it there before restarting it. Development and production use the same port, so stop the development server before starting production. After changing web application files, run `bun run build` and restart the web server. The API service is managed separately; see [its guide](../backend/README.md).

## Production limits

The project does not bundle web fonts. The stylesheet uses fonts available on the operating system and does not request Google Fonts at runtime. Team logos are served as local assets through `/api`; player portraits are not included.

For project architecture, data sources, and licensing, see the [repository README](../README.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
