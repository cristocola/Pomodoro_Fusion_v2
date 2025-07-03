# pomodoro log server
from flask import Flask, request, jsonify, render_template, send_from_directory
import sqlite3
import os
import threading
# import sys # No longer needed here
from flask_cors import CORS

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app) # Enable CORS for all routes

# Determine project root and create a data directory for logs/db
# __file__ is in src/, so we go up one level to get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Define the data directory path
data_dir = os.path.join(project_root, 'data')

# Create the data directory if it doesn't exist (important for the db)
os.makedirs(data_dir, exist_ok=True)

# Define the database file path inside the data directory
DB_FILE = os.path.join(data_dir, "pomodoro_logs.db")

# --- Database Setup ---
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
        # Use plain text print here
        print("[Server] Database initialized successfully.")
    except sqlite3.Error as e:
        # Use plain text print here
        print(f"[Server] ERROR: Database initialization error: {e}")

init_db() # Call initialization

# --- Webpage Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

# --- API Routes ---
@app.route("/log", methods=["POST"])
def save_log():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    log_entry = data.get("logEntry")
    if not log_entry or not isinstance(log_entry, str):
        return jsonify({"error": "Invalid or missing 'logEntry'"}), 400

    try:
        # Use a separate connection for write operations within the route
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO logs (timestamp) VALUES (?)", (log_entry,))
            conn.commit()
        # --- MODIFIED PRINT ---
        print(f"[Server] Log saved: {log_entry}")
        return jsonify({"message": "Log saved successfully!"}), 200
    except sqlite3.Error as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR saving log: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500
    except Exception as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR unexpected error saving log: {e}")
        return jsonify({"error": "An unexpected server error occurred"}), 500


@app.route("/logs", methods=["GET"])
def get_logs():
    # Add print statement here if needed for debugging /logs call
    # print("[Server] GET /logs request received")
    try:
        # Use a separate connection for read operations
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT timestamp FROM logs ORDER BY id ASC")
            logs = [row[0] for row in cursor.fetchall()]
        return jsonify({"logs": logs}), 200
    except sqlite3.Error as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR fetching logs: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500
    except Exception as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR unexpected error fetching logs: {e}")
        return jsonify({"error": "An unexpected server error occurred"}), 500


@app.route("/delete-last-log", methods=["POST"])
def delete_last_log():
    # print("[Server] POST /delete-last-log request received")
    try:
        with sqlite3.connect(DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM logs ORDER BY id DESC LIMIT 1")
            result = cursor.fetchone()
            if result:
                last_id = result[0]
                cursor.execute("DELETE FROM logs WHERE id = ?", (last_id,))
                conn.commit()
                # --- MODIFIED PRINT ---
                print(f"[Server] Deleted last log with ID: {last_id}")
                return jsonify({"message": "Last log deleted successfully!"}), 200
            else:
                # --- MODIFIED PRINT ---
                print("[Server] INFO: No logs found to delete.")
                return jsonify({"message": "No logs found to delete"}), 200
    except sqlite3.Error as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR deleting log: {e}")
        return jsonify({"error": f"Database error: {e}"}), 500
    except Exception as e:
        # --- MODIFIED PRINT ---
        print(f"[Server] ERROR unexpected error deleting log: {e}")
        return jsonify({"error": "An unexpected server error occurred"}), 500

# --- NO code here to start the server directly ---
# The server will be started by a WSGI server like Gunicorn
