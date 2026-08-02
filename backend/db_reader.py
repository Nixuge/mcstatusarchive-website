"""
Database reader module for the new mcstatusarchive columnar format (v2).
Transmits the native event-sourced columnar structure over the API.
"""

import base64
import logging
import sqlite3
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("backend.db_reader")

# ── Schema definitions ────────────────────────────────────────────────────────
SERVER_TYPE_JAVA = 0
SERVER_TYPE_BEDROCK = 1

METRIC_FIELDS = {
    0: "players_on",
    1: "players_max",
    2: "ping",
    3: "version_protocol",
}

TEXT_FIELDS_JAVA = {
    0: "motd",
    1: "version_name",
    2: "players_sample",
    3: "favicon",
}

TEXT_FIELDS_BEDROCK = {
    0: "motd",
    1: "version_name",
    4: "version_brand",
    5: "gamemode",
    6: "map",
}


def format_favicon(content: Any) -> Optional[str]:
    """Format raw favicon content into a displayable string/data-uri."""
    if content is None:
        return None
    if isinstance(content, bytes):
        try:
            content_str = content.decode("utf-8")
            if content_str.startswith("data:") or content_str.startswith("http"):
                return content_str
            return f"data:image/png;base64,{content_str}"
        except UnicodeDecodeError:
            b64 = base64.b64encode(content).decode("ascii")
            return f"data:image/png;base64,{b64}"
    elif isinstance(content, str):
        if content.startswith("data:") or content.startswith("http") or content == "None":
            return content
        return f"data:image/png;base64,{content}"
    return str(content)


class DbReader:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._lock = threading.Lock()

        # Cache for latest server status: { identifier (ip or table_name): dict }
        self._latest_cache: Dict[str, Dict[str, Any]] = {}
        self._server_lookup: Dict[str, Dict[str, Any]] = {}  # ip / table_name -> server row
        self._last_cache_update: float = 0.0

        logger.info(f"Initialized DbReader for path: {db_path}")

    def _get_connection(self) -> sqlite3.Connection:
        """Create a read-only SQLite connection."""
        uri = f"file:{self.db_path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def refresh_server_lookup(self) -> None:
        """Load all servers into lookup cache."""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id, table_name, ip, port, type FROM servers;")
            rows = cursor.fetchall()
            conn.close()

            new_lookup = {}
            for row in rows:
                server_info = {
                    "id": row["id"],
                    "table_name": row["table_name"],
                    "ip": row["ip"],
                    "port": row["port"],
                    "type": row["type"],
                }
                new_lookup[str(row["id"])] = server_info
                new_lookup[row["table_name"]] = server_info
                new_lookup[row["ip"]] = server_info

            with self._lock:
                self._server_lookup = new_lookup
            logger.info(f"Loaded {len(rows)} servers into lookup cache.")
        except Exception as e:
            logger.error(f"Failed to refresh server lookup: {e}")

    def load_latest_servers_data(self) -> Dict[str, Dict[str, Any]]:
        """
        Query latest values for all servers from the database and populate cache.
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # 1. Fetch all servers
            cursor.execute("SELECT id, table_name, ip, port, type FROM servers;")
            servers = cursor.fetchall()
            if not servers:
                conn.close()
                return {}

            servers_by_id = {row["id"]: dict(row) for row in servers}
            latest_by_id: Dict[int, Dict[str, Any]] = {}

            for sid, sinfo in servers_by_id.items():
                latest_by_id[sid] = {
                    "ip": sinfo["ip"],
                    "table_name": sinfo["table_name"],
                    "port": sinfo["port"],
                    "type": sinfo["type"],
                    "save_time": 0,
                    "players_on": None,
                    "players_max": None,
                    "ping": None,
                    "version_protocol": None,
                    "motd": None,
                    "version_name": None,
                    "favicon": None,
                    "players_sample": None,
                    "version_brand": None,
                    "gamemode": None,
                    "map": None,
                }

            # 2. Query latest metrics per server & field
            cursor.execute("""
                SELECT server_id, field_id, value, MAX(timestamp) as ts
                FROM metric_changes
                GROUP BY server_id, field_id;
            """)
            for row in cursor.fetchall():
                sid = row["server_id"]
                fid = row["field_id"]
                val = row["value"]
                ts = row["ts"]

                if sid in latest_by_id:
                    col_name = METRIC_FIELDS.get(fid)
                    if col_name:
                        latest_by_id[sid][col_name] = val
                    if ts > latest_by_id[sid]["save_time"]:
                        latest_by_id[sid]["save_time"] = ts

            # 3. Query latest text changes joined with text_values
            cursor.execute("""
                SELECT tc.server_id, tc.field_id, tv.content, MAX(tc.timestamp) as ts
                FROM text_changes tc
                JOIN text_values tv ON tv.id = tc.value_id
                GROUP BY tc.server_id, tc.field_id;
            """)
            for row in cursor.fetchall():
                sid = row["server_id"]
                fid = row["field_id"]
                content = row["content"]
                ts = row["ts"]

                if sid in latest_by_id:
                    stype = latest_by_id[sid]["type"]
                    text_names = TEXT_FIELDS_JAVA if stype == SERVER_TYPE_JAVA else TEXT_FIELDS_BEDROCK
                    col_name = text_names.get(fid)
                    if col_name:
                        if col_name == "favicon":
                            content = format_favicon(content)
                        elif isinstance(content, bytes):
                            content = content.decode("utf-8", errors="replace")
                        latest_by_id[sid][col_name] = content

                    if ts > latest_by_id[sid]["save_time"]:
                        latest_by_id[sid]["save_time"] = ts

            # 4. Query latest heartbeats for max timestamp fallback
            cursor.execute("""
                SELECT server_id, MAX(timestamp) as ts
                FROM heartbeats
                GROUP BY server_id;
            """)
            for row in cursor.fetchall():
                sid = row["server_id"]
                ts = row["ts"]
                if sid in latest_by_id and ts > latest_by_id[sid]["save_time"]:
                    latest_by_id[sid]["save_time"] = ts

            conn.close()

            result = {}
            for sid, sdict in latest_by_id.items():
                key = sdict["ip"] if sdict["ip"] else sdict["table_name"]
                result[key] = sdict

            with self._lock:
                self._latest_cache = result
                self._last_cache_update = time.time()

            logger.info(f"Loaded latest status for {len(latest_by_id)} servers.")
            return result

        except Exception as e:
            logger.error(f"Error loading latest server data: {e}", exc_info=True)
            return self._latest_cache

    def get_latest_servers_data(self) -> Dict[str, Dict[str, Any]]:
        """Return latest server data, refreshing from DB if cache is empty or stale (>1h)."""
        with self._lock:
            stale = (time.time() - self._last_cache_update) > 3600
            has_data = len(self._latest_cache) > 0

        if not has_data or stale:
            return self.load_latest_servers_data()
        return self._latest_cache

    def update_live_fields(self, updates: List[Dict[str, Any]]) -> None:
        """Process real-time field updates received via POST /update_fields."""
        with self._lock:
            for item in updates:
                table_name = item.get("table_name")
                fields = item.get("fields", {})
                if not table_name or not fields:
                    continue

                server_obj = self._latest_cache.get(table_name)
                if not server_obj:
                    sinfo = self._server_lookup.get(table_name)
                    if sinfo:
                        ip = sinfo["ip"]
                        server_obj = self._latest_cache.get(ip)

                if server_obj:
                    for k, v in fields.items():
                        if k == "favicon":
                            v = format_favicon(v)
                        server_obj[k] = v

    def get_all_server_data(self, identifier: str) -> Dict[str, Any]:
        """
        Transmits native columnar event-sourced format for a server:
        {
          "server": { id, table_name, ip, port, type },
          "heartbeats": [ts1, ts2, ...],
          "metrics": { "players_on": [[ts, val], ...], ... },
          "texts": { "motd": [[ts, val], ...], ... }
        }
        """
        if not self._server_lookup:
            self.refresh_server_lookup()

        server_info = self._server_lookup.get(identifier)
        if not server_info:
            logger.warning(f"Server identifier '{identifier}' not found in lookup.")
            return {
                "server": {},
                "heartbeats": [],
                "metrics": {},
                "texts": {},
            }

        server_id = server_info["id"]
        server_type = server_info["type"]
        text_field_names = TEXT_FIELDS_JAVA if server_type == SERVER_TYPE_JAVA else TEXT_FIELDS_BEDROCK

        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # 1. Fetch heartbeats
            cursor.execute(
                "SELECT timestamp FROM heartbeats WHERE server_id = ? ORDER BY timestamp;",
                (server_id,)
            )
            heartbeats = [row["timestamp"] for row in cursor.fetchall()]

            # 2. Fetch metric changes grouped by field_id
            cursor.execute(
                "SELECT field_id, timestamp, value FROM metric_changes WHERE server_id = ? ORDER BY timestamp;",
                (server_id,)
            )
            metric_rows = cursor.fetchall()
            metrics_dict: Dict[str, List[List[Any]]] = {}

            for r in metric_rows:
                fid = r["field_id"]
                col_name = METRIC_FIELDS.get(fid)
                if col_name:
                    if col_name not in metrics_dict:
                        metrics_dict[col_name] = []
                    metrics_dict[col_name].append([r["timestamp"], r["value"]])

            # 3. Fetch text changes and deduplicated text values
            cursor.execute(
                """
                SELECT tc.field_id, tc.timestamp, tc.value_id, tv.content
                FROM text_changes tc
                JOIN text_values tv ON tv.id = tc.value_id
                WHERE tc.server_id = ?
                ORDER BY tc.timestamp;
                """,
                (server_id,)
            )
            text_rows = cursor.fetchall()
            texts_dict: Dict[str, List[List[Any]]] = {}
            text_values_dict: Dict[str, str] = {}

            for r in text_rows:
                fid = r["field_id"]
                val_id = r["value_id"]
                content = r["content"]
                val_id_str = str(val_id)

                col_name = text_field_names.get(fid)
                if col_name:
                    if val_id_str not in text_values_dict:
                        if col_name == "favicon":
                            content = format_favicon(content)
                        elif isinstance(content, bytes):
                            content = content.decode("utf-8", errors="replace")
                        text_values_dict[val_id_str] = content

                    if col_name not in texts_dict:
                        texts_dict[col_name] = []
                    texts_dict[col_name].append([r["timestamp"], val_id])

            conn.close()

            result = {
                "server": {
                    "id": server_info["id"],
                    "table_name": server_info["table_name"],
                    "ip": server_info["ip"],
                    "port": server_info["port"],
                    "type": server_info["type"],
                },
                "heartbeats": heartbeats,
                "metrics": metrics_dict,
                "text_values": text_values_dict,
                "texts": texts_dict,
            }

            logger.info(
                f"Fetched native columnar data for '{identifier}' (id: {server_id}): "
                f"{len(heartbeats)} heartbeats, {len(metric_rows)} metric changes, {len(text_rows)} text changes, {len(text_values_dict)} unique text values."
            )
            return result

        except Exception as e:
            logger.error(f"Error reading columnar server data for '{identifier}': {e}", exc_info=True)
            return {
                "server": server_info,
                "heartbeats": [],
                "metrics": {},
                "text_values": {},
                "texts": {},
            }
