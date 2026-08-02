"""
High-performance Flask API backend for mcstatusarchive-website.
Serves server list data and full historical timelines from the v2 SQLite database.
"""

import logging
import os
import sys
from flask import Flask, jsonify, request, send_from_directory

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from db_reader import DbReader

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("backend.server")

app = Flask(__name__, static_folder="web/static/")

# Try to initialize flask_cors if available
try:
    from flask_cors import CORS
    CORS(app)
except ImportError:
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
        return response

db_path = config.resolve_db_path()
logger.info(f"Using database file: {db_path}")
db_reader = DbReader(db_path)

# Pre-populate server lookup and latest cache on startup
db_reader.refresh_server_lookup()
db_reader.load_latest_servers_data()


@app.route("/get_latest_servers_data", methods=["GET"])
def get_latest_servers_data():
    """Return latest status dict for all servers."""
    data = db_reader.get_latest_servers_data()
    return jsonify(data)


@app.route("/get_all_server_data/<path:identifier>", methods=["GET"])
def get_all_server_data(identifier):
    """Return historical snapshot timeline for a server by IP or table_name."""
    timeline = db_reader.get_all_server_data(identifier)
    return jsonify(timeline)


@app.route("/update_fields", methods=["POST"])
def update_fields():
    """Receive live status updates from scraper FrontendUpdater thread."""
    try:
        payload = request.get_json(force=True, silent=True)
        if isinstance(payload, dict):
            payload = [payload]
        if isinstance(payload, list):
            db_reader.update_live_fields(payload)
            return jsonify({"status": "ok", "updated": len(payload)}), 200
        return jsonify({"status": "error", "message": "Invalid JSON format"}), 400
    except Exception as e:
        logger.error(f"Error processing /update_fields: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/get_servers", methods=["GET"])
def get_servers():
    """Return list of all registered servers."""
    servers_dict = db_reader.get_latest_servers_data()
    unique_servers = []
    seen = set()
    for sdict in servers_dict.values():
        ip = sdict.get("ip")
        if ip and ip not in seen:
            seen.add(ip)
            unique_servers.append(sdict)
    return jsonify(unique_servers)


@app.route("/health", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "db_path": db_reader.db_path,
        "db_exists": os.path.exists(db_reader.db_path),
        "cached_servers": len(db_reader._latest_cache),
    })

if __name__ == "__main__":
    logger.info(f"Starting API backend server on {config.HOST}:{config.PORT}...")
    app.run(host=config.HOST, port=config.PORT, debug=config.DEBUG)
