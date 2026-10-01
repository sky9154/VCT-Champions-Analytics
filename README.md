# VCT Champions 2026 Analytics

An internal-network analytics application for VCT Champions 2026. The web interface covers schedules, teams, players, rankings, and trends. Liquipedia supplies the canonical schedule, the VCT Reference DuckDB snapshot supplies verified match statistics, and MongoDB stores application data. The web server provides one private-network entry point and proxies `/api` requests to the API service on the same host.

## Features

- Event overview, schedule status, and filters
- Team and player rankings, details, search, and trend charts
- Data reconciliation, imports, snapshot validation, and import status
- Manual data updates from Settings
- Responsive web interface for desktop and mobile

## Architecture

```text
Browser on the local network
        |
        v
Web server :5577
React application + same-origin /api proxy
        |
        v
API service 127.0.0.1:8591
        |
        +-- MongoDB
        +-- Liquipedia API
        +-- VCT Reference DuckDB snapshot
        +-- Local team logo assets
```

The web server listens on all network interfaces at port 5577 for private-network access. Port 8591 remains bound to loopback. Other devices connect only to the web server; its same-origin `/api` proxy forwards requests to the local API service.

Development uses Vite. Production uses `frontend/server.mjs` to serve the built React application and proxy API requests. The data service handles reconciliation, imports, snapshot checks, and status reporting. Its scheduler is disabled by default; manual updates are available from Settings.

## Repository layout

```text
.
├── backend/       FastAPI API service and data import flows
├── frontend/      React application, Vite configuration, and production web server
├── docs/          API, schema, data flow, storage, and asset documentation
├── LICENSE
├── NOTICE
├── README.md
└── THIRD_PARTY_NOTICES.md
```

## Requirements

- Python 3.13 and Conda
- Bun
- Node.js 20.19+ or 22.12+
- MongoDB
- Network access to the Liquipedia API and VCT Reference dataset

## First-time setup

### API service

Run these commands in Terminal from the project root:

```bash
cd backend
conda env create -f environment.yml
conda activate VCT-Analytics
python -m pip install -e .
Copy-Item .env.example .env
```

Skip environment creation if `VCT-Analytics` already exists. Edit `backend/.env` for the local MongoDB connection and other settings. Do not commit `.env`.

`LIQUIPEDIA_USER_AGENT` must identify the application and include a contact address you control, as required for Liquipedia requests. Do not invent contact information. See the [Liquipedia API terms](https://liquipedia.net/api-terms-of-use).

### Web application

```bash
cd frontend
bun install
bun run build
```

## Running the application

Start MongoDB first. Run the API service in one Terminal window:

```bash
cd backend
conda activate VCT-Analytics
python manage.py run
```

Run the production web server in a second window:

```bash
cd frontend
bun run serve
```

The production web server listens on `0.0.0.0:5577` and proxies `/api` to `127.0.0.1:8591`. Start, stop, and restart both services manually.

## LAN access

On the server, run `ipconfig` to find its private IPv4 address. On another device on the same local network, open:

```text
http://SERVER_PRIVATE_IPV4:5577
```

## Data initialization and manual updates

After MongoDB and both application services are running, open Settings and use the manual update action. The data service reconciles Liquipedia schedule data, validates the VCT Reference snapshot, imports statistics only for verified match links, and records import status.

The VCT Reference DuckDB file is downloaded at runtime and stored at:

```text
backend/var/data/vct-reference/vct.duckdb
```

The snapshot and other runtime datasets are not covered by the project's Apache-2.0 code license.

## Development workflow

To run the web application with Vite:

```bash
cd frontend
bun run dev
```

Vite listens on `127.0.0.1:5577` in development and proxies `/api` requests to the API service. The production server is `frontend/server.mjs`; use `bun run build` followed by `bun run serve` for production. After changing Python code, restart the API service manually. After changing the React application, rebuild it and restart the web server manually.

## Runtime data and Git exclusions

Runtime and local environment data should stay out of the source repository. This includes:

- `.env` files
- MongoDB data and database dumps
- `vct.duckdb`, DuckDB metadata, and backups
- Cache files, reports, logs, locks, and temporary files

Keep the DuckDB snapshot and metadata under `backend/var/data/vct-reference/`; backups are stored under `backend/var/backups/vct-reference/`. These files are runtime data, not project source or Apache-licensed assets.

## Data sources and third-party material

Liquipedia is the canonical schedule source. Its textual content is available under CC BY-SA 3.0; reuse requires attribution and applicable share-alike compliance. Liquipedia images and media have separate licensing, which must be checked individually.

VCT Reference supplies the DuckDB snapshot used for match statistics. The runtime snapshot is governed by [VCT Reference's dataset page](https://vct-reference.com/dataset) and [terms](https://vct-reference.com/terms), not by this project's code license.

Team logos, Valorant, VCT, team names, and other marks remain subject to their respective rights and terms. The project is not affiliated with or endorsed by Riot Games. Third-party software dependencies also remain under their own licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## License

Original source code and original project documentation are licensed under the Apache License, Version 2.0 (SPDX: Apache-2.0). See [LICENSE](LICENSE).

This license does not cover match data, downloaded datasets, team logos, trademarks, or other third-party material. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
