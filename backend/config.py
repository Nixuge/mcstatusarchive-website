import os

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "50474"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Database path resolution:
# 1. Environment variable MCSA_DB_PATH
# 2. Path relative to repo root (mcstatusarchive/mcstatusarchive_new.db)
# 3. Path relative to repo root (mcstatusarchive/mcstatusarchive.db)
# 4. Local directory (mcstatusarchive_new.db or mcstatusarchive.db)

DEFAULT_POSSIBLE_PATHS = [
    os.getenv("MCSA_DB_PATH", ""),
    os.path.abspath(os.path.join(os.path.dirname(__file__), "mcstatusarchive.db")),
]

def resolve_db_path() -> str:
    for path in DEFAULT_POSSIBLE_PATHS:
        if path and os.path.exists(path):
            return path
    # Default fallback to first non-empty or standard location
    return DEFAULT_POSSIBLE_PATHS[1]
