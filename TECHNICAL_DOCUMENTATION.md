# Pomodoro Fusion - Technical Documentation

This document outlines the technical details of the Pomodoro Fusion project, including its architecture, deployment, and operational procedures.

## Recent Changes (July 17, 2025)
- **Implemented Full Task-Based Pomodoro System:** The application has been upgraded from a simple session logger to a complete task management system that aligns with the official Pomodoro Technique. This was a major update involving new databases, API endpoints, and user interfaces.
- **Added Password Protection:** The main timer page is now protected by a password. The default password is `mypomodoro`. This prevents unauthorized access and bot interaction.
- **Created a New Task Dashboard:** A new, responsive dashboard (`/tasks-dashboard`) has been created to visualize task history in a calendar view, allowing users to review their productivity and estimation accuracy over time.
- **Enhanced Main Timer UI:** The main page now includes a "Today's Tasks" section where users can add tasks, estimate the required Pomodoros, and track their progress visually. It is now mandatory to select a task before starting a work timer.
- **Improved Responsiveness:** The new Task Dashboard is fully responsive and provides an optimized viewing experience on desktop, tablet, and mobile devices.

## Core Application

The application is a full-featured Pomodoro timer and productivity tool with a web interface and a backend for logging both raw sessions and detailed task progress. It is hosted on an EC2 instance.

### Architecture

The backend uses a **dual-database architecture** to separate simple session logging from the more detailed task management system. This ensures that legacy systems (like the Android app) that rely on the original, simple log format continue to function without disruption.

1.  **Web Server (`src/server.py`):** A Flask application that serves the web interface and handles user authentication.
    *   **Authentication:** Manages a user login session. The main timer page and the new task dashboard are protected and require a user to be logged in.
    *   **Proxy-Aware Middleware:** The server uses `werkzeug.middleware.proxy_fix` to correctly handle `X-Forwarded-Proto` headers from reverse proxies like Cloudflare. This is essential for ensuring secure session cookies work correctly over HTTPS.
    *   **API Proxy:** Acts as a secure proxy for all requests from the frontend to the API server. It forwards requests to both the original session logging endpoints and the new task management endpoints.

2.  **API Server (`src/api_server.py`):** A dedicated Flask application providing a RESTful API for all database operations. It is secured with a secret API key (`X-API-Key: testpassword1`). The API server now manages two separate databases.

### Logging System: A Dual-Database Approach

To maintain compatibility while adding new features, the application now uses two distinct SQLite databases stored in the `/data/` directory.

**1. Session Logging (`pomodoro_logs.db`) - The Original System**
*   **Purpose:** To record the exact timestamp of every completed Pomodoro session. It answers the question: "*When* did I work?"
*   **Table (`logs`):** Contains just an `id` and a `timestamp`.
*   **Interaction:** An entry is added to this database every time a work timer is successfully completed. This system is used by the original "Stats Dashboard" to generate high-level statistics like streaks and heatmaps.

**2. Task Logging (`task_logs.db`) - The New System**
*   **Purpose:** To track specific tasks, their estimated effort, their actual effort, and their status. It answers the questions: "*What* did I work on, and did I estimate it correctly?"
*   **Table (`tasks`):** Contains columns for `id`, `task_description`, `estimated_pomodoros`, `actual_pomodoros`, `status` ('Pending', 'In Progress', 'Completed'), `created_at`, and `completed_at`.
*   **Interaction:**
    *   Tasks are added and managed via the new "Today's Tasks" UI on the main timer page.
    *   When a work timer is completed for a selected task, the `actual_pomodoros` count for that task is incremented in this database.
    *   This database powers the new "Task Dashboard," which displays the calendar view of work history.

### API Endpoints

The `api_server.py` provides the following key endpoints. All are protected by the `X-API-Key` header.

*   **Session Logs (`pomodoro_logs.db`)**
    *   `POST /log`: Saves a new pomodoro timestamp.
    *   `GET /logs`: Retrieves all pomodoro timestamps.
    *   `POST /delete-last-log`: Deletes the most recent pomodoro log.
*   **Task Logs (`task_logs.db`)**
    *   `POST /api/tasks`: Creates a new task.
    *   `GET /api/tasks`: Retrieves today's tasks and any unfinished tasks.
    *   `POST /api/tasks/<id>/increment`: Increments the `actual_pomodoros` for a task.
    *   `POST /api/tasks/<id>/complete`: Marks a task as 'Completed'.
    *   `DELETE /api/tasks/<id>`: Deletes a task.
    *   `GET /api/tasks/history`: Retrieves all tasks from history.

### EC2 Deployment

The application runs on an Amazon Linux 2023 EC2 instance with the public IP `http://16.171.52.110/`. The two `systemd` services are configured as follows:

**1. Web Server Service (`pomodoro.service`):**
Runs the web interface on port 80.
```ini
# /etc/systemd/system/pomodoro.service
[Unit]
Description=Gunicorn instance to serve Pomodoro Fusion
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/Pomodoro_Fusion_v2
ExecStart=/home/ec2-user/Pomodoro_Fusion_v2/venv/bin/gunicorn --chdir src -w 2 --bind 0.0.0.0:80 server:app
Restart=always

[Install]
WantedBy=multi-user.target
```

**2. API Server Service (`pomodoro_api.service`):**
Runs the data API on port 5001.
```ini
# /etc/systemd/system/pomodoro_api.service
[Unit]
Description=Gunicorn instance to serve Pomodoro Fusion API
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/Pomodoro_Fusion_v2
ExecStart=/home/ec2-user/Pomodoro_Fusion_v2/venv/bin/gunicorn --chdir src -w 2 --bind 0.0.0.0:5001 api_server:app
Restart=always

[Install]
WantedBy=multi-user.target
```

### Automated Database Backups

To ensure data integrity and provide disaster recovery, a fully automated backup system has been implemented.

*   **Strategy:** The entire `data` directory (containing both `pomodoro_logs.db` and `task_logs.db`) is backed up nightly.
*   **Storage:** Backups are compressed and securely stored in a private AWS S3 bucket (`pomo-fusion-logs`) in the `eu-north-1` region. The bucket is configured with versioning enabled and all public access blocked.
*   **Mechanism:** A cron job on the EC2 instance executes a shell script at 2:00 AM server time every night.
    *   **Script Location:** `/home/ec2-user/backup_to_s3.sh`
    *   **Cron Schedule:** `0 2 * * * /home/ec2-user/backup_to_s3.sh >> /home/ec2-user/backup.log 2>&1`
*   **Security:** Access to the S3 bucket is managed via a fine-grained IAM Role (`EC2-Pomo-Fusion-Backup-Role`) attached directly to the EC2 instance. This is a best-practice approach that avoids storing any static AWS access keys on the server.
*   **Logging:** The output of each backup operation is appended to `/home/ec2-user/backup.log`, allowing for easy monitoring and troubleshooting.

---

## Android App Development

An Android client is developed in the `PomoFusion_Android/` directory. **Crucially, this client still works because it only interacts with the original, unchanged session logging system (`pomodoro_logs.db`) via the `/log` and `/logs` endpoints.** The new task system is separate and does not affect it.

## General Workflow

The workflow remains the same:
1.  Modify files locally in Windows.
2.  Tell the user when changes are done so he can commit and push
