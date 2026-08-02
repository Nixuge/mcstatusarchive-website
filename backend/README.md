# mcstatusarchive-website Backend

High-performance Python API backend for serving Minecraft server status archive data from the `v2` columnar database format.

## Features
- Compatible with the `mcstatusarchive` `v2` SQLite database schema (`servers`, `metric_changes`, `text_changes`, `text_values`, `heartbeats`).
- In-memory caching for zero-latency responses on `/get_latest_servers_data`.
- Reconstructs server snapshot timelines matching the frontend's binary search indexing system.
- Accepts real-time server status updates from the scraper's `FrontendUpdater` thread on `/update_fields`.
- Full CORS support.

## Running the Backend

```bash
python3 server.py
```

By default, the server runs on `http://127.0.0.1:50474`.

## Configuration Options

Set environment variables to customize:
- `PORT`: Server port (default: `50474`)
- `HOST`: Server bind address (default: `0.0.0.0`)
- `MCSA_DB_PATH`: Path to the SQLite database file (e.g., `MCSA_DB_PATH=/path/to/mcstatusarchive.db python3 server.py`)

## Endpoints
- `GET /get_latest_servers_data`: Returns current state dictionary for all servers.
- `GET /get_all_server_data/<ip_or_name>`: Returns timeline snapshots sublists for a given server.
- `POST /update_fields`: Endpoint for receiving live status updates from the scraper.
- `GET /health`: Health check & DB status.
