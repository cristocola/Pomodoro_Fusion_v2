# pomodoro web server (client to the API)
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, flash
import requests
import os
from flask_cors import CORS

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app) # Enable CORS for all routes

# --- Configuration ---
# Secret key for session management
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'a-very-secret-key-that-should-be-changed')
# Password for login
LOGIN_PASSWORD = os.environ.get('POMODORO_PASSWORD', 'pomodoro')

# --- API Client Configuration ---
# The API server runs on a different port, but on the same machine.
# We communicate with it locally.
API_BASE_URL = "http://127.0.0.1:5001"
# This key must match the one in api_server.py
# In a real scenario, this would be loaded from an environment variable
SECRET_API_KEY = "testpassword1"
HEADERS = {"X-API-Key": SECRET_API_KEY}

# --- Webpage Routes ---
@app.route('/')
def index():
    if not session.get('logged_in'):
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        password = request.form.get('password')
        if password == LOGIN_PASSWORD:
            session['logged_in'] = True
            flash('Login successful!', 'success')
            return redirect(url_for('index'))
        else:
            flash('Invalid password. Please try again.', 'danger')
            return redirect(url_for('login'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    # Optionally, you could also protect the dashboard
    # if not session.get('logged_in'):
    #     return redirect(url_for('login'))
    return render_template('dashboard.html')

# --- API Proxy Routes ---
# These routes act as a proxy to the real API server.
# This keeps the API key secure on the server-side and not exposed to the browser.

@app.route("/log", methods=["POST"])
def save_log():
    if not session.get('logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400
    
    try:
        # Forward the request to the API server
        api_response = requests.post(f"{API_BASE_URL}/log", json=request.get_json(), headers=HEADERS)
        api_response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        return api_response.json(), api_response.status_code
    except requests.exceptions.RequestException as e:
        print(f"[Web Server] ERROR forwarding to API: {e}")
        return jsonify({"error": "Failed to connect to the logging service."}), 502 # Bad Gateway

@app.route("/logs", methods=["GET"])
def get_logs():
    # The dashboard is public, so this endpoint can remain accessible
    # If dashboard were protected, this would need session check too.
    try:
        # Forward the request to the API server
        api_response = requests.get(f"{API_BASE_URL}/logs", headers=HEADERS)
        api_response.raise_for_status()
        return api_response.json(), api_response.status_code
    except requests.exceptions.RequestException as e:
        print(f"[Web Server] ERROR forwarding to API: {e}")
        return jsonify({"error": "Failed to connect to the logging service."}), 502

@app.route("/delete-last-log", methods=["POST"])
def delete_last_log():
    if not session.get('logged_in'):
        return jsonify({"error": "Unauthorized"}), 401
    try:
        # Forward the request to the API server
        api_response = requests.post(f"{API_BASE_URL}/delete-last-log", headers=HEADERS)
        api_response.raise_for_status()
        return api_response.json(), api_response.status_code
    except requests.exceptions.RequestException as e:
        print(f"[Web Server] ERROR forwarding to API: {e}")
        return jsonify({"error": "Failed to connect to the logging service."}), 502

# The server will be started by a WSGI server like Gunicorn
