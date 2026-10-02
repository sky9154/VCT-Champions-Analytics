# VCT Analytics API Service

The `backend/` directory contains the FastAPI API service and the data service that reconciles schedules, validates statistics, and manages imports. The API service binds to `127.0.0.1:8591`. The web server proxies same-origin `/api` requests to this address; do not expose port `8591` to LAN clients.

## Requirements and setup

- Conda with Python 3.13 (`environment.yml` creates the `VCT-Analytics` environment)
- A MongoDB instance reachable through `MONGODB_URI`
- Outbound access to the Liquipedia API and VCT Reference dataset for live updates

From a Terminal at the repository root, prepare the environment:

```bash
cd backend
conda env create -f environment.yml
conda activate VCT-Analytics
python -m pip install -e .
cp .env.example .env
```

If `VCT-Analytics` already exists, activate it and run the install step without recreating it. Settings load `backend/.env` from the `backend/` directory. Set `MONGODB_URI` and `MONGODB_DATABASE` for the MongoDB instance and database to use. Set `TOURNAMENT_SLUG` only when using a different tournament.

Live Liquipedia requests require `LIQUIPEDIA_USER_AGENT` to identify VCT Analytics and include a contact email you control. The sample leaves this value blank. Requests fail safely until it is configured. Follow the [Liquipedia API terms](https://liquipedia.net/api-terms-of-use); do not place a real contact address or credentials in project documentation.

## API service lifecycle

Run the commands from `backend/` with the `VCT-Analytics` environment active:

| Operation | Command |
| --- | --- |
| Start | `python manage.py start` |
| Check status | `python manage.py status` |
| Stop | `python manage.py stop` |
| Restart | `python manage.py restart` |

The managed API service always binds to `127.0.0.1:8591`, uses one Uvicorn worker, and does not enable reload. The manager controls only this API service. To run it in the current Terminal instead, use:

```bash
python manage.py run
```

The manager writes API output to `var/logs/api-stdout.log` and `var/logs/api-stderr.log`. It stops the process through its graceful shutdown path. It does not start or manage the web server or the data updater.

## Data sources and storage

Liquipedia is the canonical source for schedules. The data service uses VCT Reference DuckDB data to verify match links and import detailed statistics. MongoDB stores tournament, team, match, statistics, and import-status records.

The snapshot is fetched from the [VCT Reference dataset](https://vct-reference.com/dataset), checked before it replaces the active file, and stored at `backend/var/data/vct-reference/vct.duckdb`. Its source metadata is stored beside it. Previous valid snapshots are kept under `backend/var/backups/vct-reference/`; retain these paths when backing up a deployment. The dataset and its [Terms of Service](https://vct-reference.com/terms) are separate from the project code license.

The project license and third-party boundaries are summarized in the [repository README](../README.md) and [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Runtime files are relative to `backend/`: Liquipedia cache in `var/cache/liquipedia/`, reports in `var/reports/`, API logs in `var/logs/`, and process locks in `var/run/`. Keep `.env`, downloaded snapshots, caches, reports, logs, locks, temporary files, and backups out of commits. MongoDB data is stored by MongoDB, not in these paths.

## Schedule and statistics updates

Settings can start one manual update after the configured Tournament record exists. Use the one-time updater to initialize an empty MongoDB database. Manual updates run independently of the recurring scheduler, which is disabled by default (`AUTO_UPDATE_ENABLED=false`). Starting the API service does not enable or launch it. To run one update from a Terminal, use `python -m app.cli.auto_update --once`; to inspect a run without applying imported data to MongoDB, use:

```bash
python -m app.cli.auto_update --once --dry-run
```

A normal update processes the sources in order:

1. Reconcile Liquipedia schedule data and create a Schedule Plan. Liquipedia remains canonical when schedule details differ from DuckDB.
2. Run a read-only Preflight against MongoDB. It checks the planned changes and safety limits without changing application records.
3. Apply the approved Plan only after rechecking its sources and validation results.
4. Run a read-only Postflight to verify the applied data. The updater records successful import status only after verification.
5. Refresh and validate the VCT Reference snapshot when needed, then create a statistics Plan for matches with verified identities. Statistics use their own Preflight, Apply, and Postflight.

A dry run creates local reports and may fetch source data, but it does not apply imported records to MongoDB or promote a candidate snapshot. `python -m app.cli.import_schedule --offline` and `python -m app.cli.import_stats --offline` create local Plans from cached sources and the existing snapshot; they do not connect to MongoDB. Preflight commands read MongoDB and write a report locally. Apply commands write the planned data. Postflight is the updater’s read-only database check after Apply.

The low-level import commands accept an explicit Plan path with `--preflight-plan` or `--apply-plan`. Use the full updater for the ordered Schedule and statistics workflow. The updater does not delete imported records. Team logo imports require a separate explicit workflow.

## Scheduler and manual restarts

Set `AUTO_UPDATE_ENABLED=true` to enable the recurring updater. Run `python -m app.cli.auto_update` as a separate process after configuring its schedule. The API manager does not start, stop, or restart this process. Stop and restart it separately after changing scheduler settings; restart the API service separately after changing settings loaded by the API. The Settings page can display status and start a manual data update, but it does not manage service lifecycles or scheduler configuration.

## Read-only GET endpoints

Public `GET /api/...` endpoints read stored MongoDB data, saved status and settings, or verified local logo files. They do not start an import, call Liquipedia, query DuckDB, or write application records. `/api/health` does not require MongoDB. Data-changing work uses explicit update actions or CLI commands.
