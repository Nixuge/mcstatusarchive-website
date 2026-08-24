import os

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "50474"))
DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")

# Database path resolution:
# Java and Bedrock DBs are resolved separately.
# Java DB defaults:
# 1. Environment variable MCSA_JAVA_DB_PATH
# 2. Main project java db: ../mcstatusarchive/data/mcstatusarchive_java.db
# 3. Local java db (mcstatusarchive_java.db)
# Bedrock DB defaults:
# 1. Environment variable MCSA_BEDROCK_DB_PATH
# 2. Main project bedrock db: ../mcstatusarchive/data/mcstatusarchive_bedrock.db
# 3. Local bedrock db (mcstatusarchive_bedrock.db)

def resolve_db_paths() -> dict[str, str]:
    # Single MCSA_DB_PATH fallback for backwards compatibility/testing
    single_path = os.getenv("MCSA_DB_PATH", "")
    if single_path and os.path.exists(single_path):
        return {"single": single_path}

    # Grandparent root for relative main project lookup
    # java_default = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mcstatusarchive", "data", "mcstatusarchive_java.db"))
    # bedrock_default = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "mcstatusarchive", "data", "mcstatusarchive_bedrock.db"))
    
    java_path = os.getenv("MCSA_JAVA_DB_PATH", "")
    if not java_path or not os.path.exists(java_path):
        # if os.path.exists(java_default):
        #     java_path = java_default
        # else:
        java_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mcstatusarchive_java.db"))

    bedrock_path = os.getenv("MCSA_BEDROCK_DB_PATH", "")
    if not bedrock_path or not os.path.exists(bedrock_path):
        # if os.path.exists(bedrock_default):
        #     bedrock_path = bedrock_default
        # else:
        bedrock_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "mcstatusarchive_bedrock.db"))

    print(f"Pathes: {java_path}, {bedrock_path}")
    paths = {}
    if os.path.exists(java_path):
        paths["java"] = java_path
    if os.path.exists(bedrock_path):
        paths["bedrock"] = bedrock_path

    # If neither exists, populate fallback entries
    if not paths:
        paths["java"] = java_path
        paths["bedrock"] = bedrock_path

    return paths
