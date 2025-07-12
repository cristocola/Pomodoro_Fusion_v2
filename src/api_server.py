# pomodoro log API server
from flask import Flask, request, jsonify
import sqlite3
import os
from functools import wraps
from flask_cors import CORS

# --- Configuration ---
# It's recommended to set this via an environment variable in a real deployment
# For this case, we will use a hardcoded value as requested by the user.
# In a real scenario, you would use:
# SECRET_API_KEY = os.environ.get("POMODORO_API_KEY")
SECRET_API_KEY = "testpassword1"

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, useful for development

# --- Database Setup ---
# Determine project root and create a data directory for logs/db
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_dir = os.path.join(project_root, 'data')
os.makedirs(data_dir, exist_ok=True)
DB_FILE = os.path.join(data_dir, "pomodoro_logs.db")

def init_db():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL
                )
            """)
            conn.commit()
        print("[API Server] Database initialized successfully.")
    except sqlite3.Error as e:
        print(f"[API Server] ERROR: Database initialization error: {e}")

init_db()

# --- API Key Authentication Decorator ---
def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.headers.get('X-API-Key') and request.headers.get('X-API-Key') == SECRET_API_KEY:
            return f(*args, **kwargs)
        else:
            print("[API Server] WARNING: Unauthorized access attempt.")
            return jsonify({"error": "Unauthorized"}), 401
    return decorated_function

# --- API Routes ---
@app.route("/log", methods=["POST"])
@require_api_key
def save_log():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    log_entry = data.get("logEntry")
    if not log_entry or not isinstance(log_entry, str):
        return jsonify({"error": "Invalid or missing 'logEntry'"}), 400

    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO logs (timestamp) VALUES (?)", (log_entry,))
            conn.commit()
        print(f"[API Server] Log saved: {log_entry}")
        return jsonify({"message": "Log saved successfully!"}), 200
    except sqlite3.Error as e:
        print(f"[API Server] ERROR saving log: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500

@app.route("/logs", methods=["GET"])
@require_api_key
def get_logs():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT timestamp FROM logs ORDER BY id ASC")
            logs = [row[0] for row in cursor.fetchall()]
        return jsonify({"logs": logs}), 200
    except sqlite3.Error as e:
        print(f"[API Server] ERROR fetching logs: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500

@app.route("/delete-last-log", methods=["POST"])
@require_api_key
def delete_last_log():
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM logs ORDER BY id DESC LIMIT 1")
            result = cursor.fetchone()
            if result:
                last_id = result[0]
                cursor.execute("DELETE FROM logs WHERE id = ?", (last_id,))
                conn.commit()
                print(f"[API Server] Deleted last log with ID: {last_id}")
                return jsonify({"message": "Last log deleted successfully!"}), 200
            else:
                print("[API Server] INFO: No logs found to delete.")
                return jsonify({"message": "No logs found to delete"}), 200
    except sqlite3.Error as e:
        print(f"[API Server] ERROR deleting log: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500

# Health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200

if __name__ == '__main__':
    # This is for local testing. Gunicorn will be used in production.
    # The production command will be something like:
    # gunicorn --bind 0.0.0.0:5001 api_server:app
    app.run(host='0.0.0.0', port=5001, debug=True)
