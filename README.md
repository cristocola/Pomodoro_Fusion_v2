# Pomodoro Fusion

An advanced desktop timer that **fuses** the classic Pomodoro Technique with a comprehensive suite of tools for tracking, analysis, and motivation. Go beyond a simple timer with a detailed statistics dashboard, a gamified achievement system, and unique productivity insights.

---

## Features

* **Customizable Timer** – Set custom durations for work, short breaks, and long breaks to fit your personal workflow.
* **Workday Tracking** – Track and manage idle time as **"time debt,"** which can be *paid off* by shortening future breaks.
* **Persistent Logging** – All completed Pomodoro sessions are saved to a local SQLite database, so your history is always preserved.
* **Advanced Dashboard** – Visualize your productivity with an activity heatmap, performance charts, trend lines, and detailed historical logs sorted by year, month, and day.
* **Gamification System** – Unlock dozens of achievements for reaching milestones and maintaining streaks.
* **System‑Tray Integration** – Runs in the system tray for quick access without cluttering your taskbar.
* **Cross‑Platform** – Works on **Windows, macOS, and Linux**.

---

## Setup & Installation

### Prerequisites

* **Python 3.8+**

### Instructions

```bash
# Clone the repository
git clone https://github.com/cristocola/Pomodoro-Fusion.git
cd Pomodoro-Fusion

# Create a virtual environment
# Windows
python -m venv venv
# macOS/Linux
python3 -m venv venv

# Activate the virtual environment
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## How to Run

### Windows

```powershell
.\run.ps1
```

### macOS / Linux

```bash
python src/main.py
```

The application will start, create a **data** folder for logs and the database if it doesn’t exist, and an icon will appear in your system tray.

---

## How It Works

* **Backend** – A local Flask server (`server.py`) manages API requests and writes data to SQLite.
* **Frontend** – Built with HTML, CSS, and JavaScript (separate timer and dashboard views).
* **Desktop Window** – `pywebview` renders the web‑based UI in a native desktop window.
* **System Tray** – `pystray` manages the tray icon for quick show/hide and exit controls.

---

## License

This project is licensed under the **MIT License**. 
