"""
Database reader module for the new mcstatusarchive columnar format (v4).
Transmits the native event-sourced columnar structure over the API.
"""

import base64
import logging
import sqlite3
import threading
import time
import os
import json
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("backend.db_reader")

# ── Schema definitions ────────────────────────────────────────────────────────
SERVER_TYPE_JAVA = 0
SERVER_TYPE_BEDROCK = 1

JAVA_METRIC_FIELDS = {
    0: "players_on",
    1: "players_max",
    2: "ping",
    3: "version_protocol",
    4: "enforces_secure_chat",
    5: "forge_fml_network_version",
    6: "forge_truncated",
}

JAVA_TEXT_FIELDS = {
    0: "motd",
    1: "version_name",
    2: "players_sample",
    3: "favicon",
    4: "forge_channels",
    5: "forge_mods",
}

BEDROCK_METRIC_FIELDS = {
    0: "players_on",
    1: "players_max",
    2: "ping",
    3: "version_protocol",
}

BEDROCK_TEXT_FIELDS = {
    0: "motd",
    1: "version_name",
    2: "version_brand",
    3: "gamemode",
    4: "map",
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


def resolve_players_sample(content: Any, cursor: sqlite3.Cursor) -> str:
    """Resolve comma-separated player IDs from text changes to a JSON list of name/UUID dicts."""
    if content is None:
        return "[]"
    if isinstance(content, bytes):
        try:
            content_str = content.decode("utf-8")
        except UnicodeDecodeError:
            content_str = ""
    else:
        content_str = str(content)

    if content_str == "-1" or not content_str:
        return "[]"

    # Split the comma-separated IDs
    try:
        player_ids = [int(x.strip()) for x in content_str.split(",") if x.strip()]
    except ValueError:
        # If it's already a JSON list or something else, return as is
        return content_str

    if not player_ids:
        return "[]"

    # Query the players table for these IDs
    placeholders = ",".join("?" for _ in player_ids)
    try:
        cursor.execute(
            f"SELECT name, uuid FROM players WHERE id IN ({placeholders});",
            player_ids
        )
        players = [{"name": r[0], "id": r[1]} for r in cursor.fetchall()]
        return json.dumps(players, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error resolving players sample: {e}")
        return "[]"


def get_db_server_type(db_path: str) -> Optional[str]:
    """Helper to read database server type from db_meta."""
    if not os.path.exists(db_path):
        return None
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM db_meta WHERE key = 'server_type';")
        row = cursor.fetchone()
        conn.close()
        if row:
            return row[0]  # "java" or "bedrock"
    except Exception as e:
        logger.error(f"Error checking server_type of database {db_path}: {e}")
    return None


class DbReader:
    def __init__(self, db_paths: Dict[str, str]):
        self.db_paths = db_paths
        self._lock = threading.Lock()

        # Cache for latest server status: { identifier (ip or table_name): dict }
        self._latest_cache: Dict[str, Dict[str, Any]] = {}
        self._server_lookup: Dict[str, Dict[str, Any]] = {}  # ip / table_name -> server row
        self._last_cache_update: float = 0.0

        # Classify each database
        self.db_conns_paths: Dict[str, str] = {}
        for key, path in db_paths.items():
            if not path or not os.path.exists(path):
                continue
            db_type = get_db_server_type(path)
            if db_type in ("java", "bedrock"):
                self.db_conns_paths[db_type] = path
            else:
                if key in ("java", "bedrock"):
                    self.db_conns_paths[key] = path
                elif key == "single":
                    # Assume java for single path fallback if server_type couldn't be read
                    self.db_conns_paths["java"] = path

        logger.info(f"Initialized DbReader for paths: {db_paths}. Resolved types: {self.db_conns_paths}")

    def _get_connection(self, server_type: str) -> sqlite3.Connection:
        """Create a read-only SQLite connection for a specific server type database."""
        path = self.db_conns_paths.get(server_type)
        if not path:
            raise ValueError(f"No database configured/found for server type: {server_type}")
        uri = f"file:{path}?mode=ro"
        conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def refresh_server_lookup(self) -> None:
        """Load all servers into lookup cache from both databases."""
        new_lookup = {}
        for db_type in ["java", "bedrock"]:
            if db_type not in self.db_conns_paths:
                continue
            try:
                conn = self._get_connection(db_type)
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, ip, port FROM servers;")
                rows = cursor.fetchall()
                conn.close()

                type_code = 0 if db_type == "java" else 1

                for row in rows:
                    server_id = row["id"]
                    ip = row["ip"]
                    port = row["port"]
                    name = row["name"]
                    table_name = f"{db_type}_{server_id}"

                    server_info = {
                        "id": server_id,
                        "table_name": table_name,
                        "ip": ip,
                        "port": port,
                        "type": type_code,  # 0 for Java, 1 for Bedrock
                        "db_type": db_type,
                        "name": name,
                    }
                    # Populate lookup map for quick retrieval
                    new_lookup[str(server_id)] = server_info
                    new_lookup[table_name] = server_info
                    new_lookup[ip] = server_info

                logger.info(f"Loaded {len(rows)} {db_type} servers into lookup cache.")
            except Exception as e:
                logger.error(f"Failed to refresh server lookup for {db_type}: {e}")

        with self._lock:
            self._server_lookup = new_lookup

    def load_latest_servers_data(self) -> Dict[str, Dict[str, Any]]:
        """
        Query latest values for all servers from the database and populate cache.
        """
        try:
            latest_by_id: Dict[str, Dict[str, Any]] = {}
            result = {}

            for db_type in ["java", "bedrock"]:
                if db_type not in self.db_conns_paths:
                    continue
                
                try:
                    conn = self._get_connection(db_type)
                    cursor = conn.cursor()
                    cursor2 = conn.cursor()  # For player deduplication/resolution queries
                    
                    # 1. Fetch all servers
                    cursor.execute("SELECT id, name, ip, port FROM servers;")
                    servers = cursor.fetchall()
                    if not servers:
                        conn.close()
                        continue

                    # Server mappings for this database
                    type_code = 0 if db_type == "java" else 1
                    
                    # Initialize entries
                    for row in servers:
                        sid = row["id"]
                        table_name = f"{db_type}_{sid}"
                        
                        latest_by_id[table_name] = {
                            "name": row["name"],
                            "ip": row["ip"],
                            "table_name": table_name,
                            "port": row["port"],
                            "type": type_code,
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
                            "enforces_secure_chat": None,
                            "forge_fml_network_version": None,
                            "forge_truncated": None,
                            "forge_channels": None,
                            "forge_mods": None,
                        }

                    # 2. Query latest metrics per server & field
                    cursor.execute("""
                        SELECT server_id, field_id, value, MAX(timestamp) as ts
                        FROM metric_changes
                        GROUP BY server_id, field_id;
                    """)
                    metric_field_names = JAVA_METRIC_FIELDS if db_type == "java" else BEDROCK_METRIC_FIELDS
                    for row in cursor.fetchall():
                        sid = row["server_id"]
                        fid = row["field_id"]
                        val = row["value"]
                        ts = row["ts"]

                        table_name = f"{db_type}_{sid}"
                        if table_name in latest_by_id:
                            col_name = metric_field_names.get(fid)
                            if col_name:
                                latest_by_id[table_name][col_name] = val
                            if ts > latest_by_id[table_name]["save_time"]:
                                latest_by_id[table_name]["save_time"] = ts

                    # 3. Query latest text changes joined with text_values
                    cursor.execute("""
                        SELECT tc.server_id, tc.field_id, tv.content, MAX(tc.timestamp) as ts
                        FROM text_changes tc
                        JOIN text_values tv ON tv.id = tc.value_id
                        GROUP BY tc.server_id, tc.field_id;
                    """)
                    text_field_names = JAVA_TEXT_FIELDS if db_type == "java" else BEDROCK_TEXT_FIELDS
                    for row in cursor.fetchall():
                        sid = row["server_id"]
                        fid = row["field_id"]
                        content = row["content"]
                        ts = row["ts"]

                        table_name = f"{db_type}_{sid}"
                        if table_name in latest_by_id:
                            col_name = text_field_names.get(fid)
                            if col_name:
                                if col_name == "favicon":
                                    content = format_favicon(content)
                                elif col_name == "players_sample":
                                    content = resolve_players_sample(content, cursor2)
                                elif isinstance(content, bytes):
                                    content = content.decode("utf-8", errors="replace")
                                latest_by_id[table_name][col_name] = content

                            if ts > latest_by_id[table_name]["save_time"]:
                                latest_by_id[table_name]["save_time"] = ts

                    # 4. Query latest heartbeats for max timestamp fallback
                    cursor.execute("""
                        SELECT server_id, MAX(timestamp) as ts
                        FROM heartbeats
                        GROUP BY server_id;
                    """)
                    for row in cursor.fetchall():
                        sid = row["server_id"]
                        ts = row["ts"]
                        table_name = f"{db_type}_{sid}"
                        if table_name in latest_by_id and ts > latest_by_id[table_name]["save_time"]:
                            latest_by_id[table_name]["save_time"] = ts

                    conn.close()
                except Exception as e:
                    logger.error(f"Error loading data for db {db_type}: {e}", exc_info=True)

            # Build final response keyed by IP or table_name
            for sdict in latest_by_id.values():
                key = sdict["ip"] if sdict["ip"] else sdict["table_name"]
                result[key] = sdict

            with self._lock:
                self._latest_cache = result
                self._last_cache_update = time.time()

            logger.info(f"Loaded latest status for {len(result)} servers.")
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
        db_type = server_info["db_type"]
        metric_field_names = JAVA_METRIC_FIELDS if db_type == "java" else BEDROCK_METRIC_FIELDS
        text_field_names = JAVA_TEXT_FIELDS if db_type == "java" else BEDROCK_TEXT_FIELDS

        try:
            conn = self._get_connection(db_type)
            cursor = conn.cursor()
            cursor2 = conn.cursor()  # For player resolution queries

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
                col_name = metric_field_names.get(fid)
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
                        elif col_name == "players_sample":
                            content = resolve_players_sample(content, cursor2)
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
                    "name": server_info.get("name"),
                },
                "heartbeats": heartbeats,
                "metrics": metrics_dict,
                "text_values": text_values_dict,
                "texts": texts_dict,
            }

            logger.info(
                f"Fetched native columnar data for '{identifier}' (db: {db_type}, id: {server_id}): "
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

    def get_multi_server_playercount_data(self, identifiers: List[str]) -> Dict[str, Any]:
        """
        Fetch players_on metric changes and heartbeats for multiple servers efficiently.
        Returns: {
            identifier: {
                "id": server_id,
                "table_name": table_name,
                "name": server_name,
                "ip": server_ip,
                "port": server_port,
                "type": type_code,
                "heartbeats": [ts1, ts2, ...],
                "players_on": [[ts, val], ...]
            }
        }
        """
        if not self._server_lookup:
            self.refresh_server_lookup()

        by_db: Dict[str, List[Tuple[str, Dict[str, Any]]]] = {"java": [], "bedrock": []}
        for ident in identifiers:
            sinfo = self._server_lookup.get(ident)
            if sinfo:
                db_type = sinfo["db_type"]
                if db_type in by_db:
                    by_db[db_type].append((ident, sinfo))

        result: Dict[str, Any] = {}

        for db_type, server_entries in by_db.items():
            if not server_entries or db_type not in self.db_conns_paths:
                continue

            try:
                conn = self._get_connection(db_type)
                cursor = conn.cursor()

                server_ids = list({sinfo["id"] for _, sinfo in server_entries})
                if not server_ids:
                    conn.close()
                    continue

                placeholders = ",".join("?" for _ in server_ids)

                cursor.execute(
                    f"SELECT server_id, timestamp, value FROM metric_changes "
                    f"WHERE field_id = 0 AND server_id IN ({placeholders}) "
                    f"ORDER BY timestamp ASC;",
                    server_ids
                )
                metric_rows = cursor.fetchall()
                metrics_by_sid: Dict[int, List[List[int]]] = {sid: [] for sid in server_ids}
                for r in metric_rows:
                    metrics_by_sid[r["server_id"]].append([r["timestamp"], r["value"]])

                cursor.execute(
                    f"SELECT server_id, timestamp FROM heartbeats "
                    f"WHERE server_id IN ({placeholders}) "
                    f"ORDER BY timestamp ASC;",
                    server_ids
                )
                hb_rows = cursor.fetchall()
                hb_by_sid: Dict[int, List[int]] = {sid: [] for sid in server_ids}
                for r in hb_rows:
                    hb_by_sid[r["server_id"]].append(r["timestamp"])

                conn.close()

                for ident, sinfo in server_entries:
                    sid = sinfo["id"]
                    result[ident] = {
                        "id": sid,
                        "table_name": sinfo["table_name"],
                        "name": sinfo.get("name"),
                        "ip": sinfo["ip"],
                        "port": sinfo["port"],
                        "type": sinfo["type"],
                        "heartbeats": hb_by_sid.get(sid, []),
                        "players_on": metrics_by_sid.get(sid, []),
                    }

            except Exception as e:
                logger.error(f"Error fetching multi-server playercount data for {db_type}: {e}", exc_info=True)

        return result

