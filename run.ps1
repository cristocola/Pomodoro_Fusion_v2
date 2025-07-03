# run.ps1

# Get the directory where this script (.ps1) is located
$ScriptDir = $PSScriptRoot

# Construct the paths relative to the script's location
# The venv folder is expected to be in the root, next to this script
$venvPythonPath = Join-Path $ScriptDir "venv\Scripts\pythonw.exe" # Use pythonw.exe to hide console

# --- MODIFIED LINE ---
# The main script is now inside the 'src' folder
$mainScriptPath = Join-Path $ScriptDir "src\main.py"

# Check if the virtual environment's pythonw.exe exists
if (-not (Test-Path $venvPythonPath)) {
    Write-Error "ERROR: Virtual environment Python not found: '$venvPythonPath'"
    Write-Host "Please ensure the 'venv' folder exists in the project root (e.g., 'python -m venv venv')."
    Write-Host "Also ensure required libraries are installed by running: '.\venv\Scripts\pip.exe install -r requirements.txt'"
    # Pause so the user can read the error if the window closes quickly
    Read-Host "Press Enter to exit"
    exit 1 # Exit script with an error code
}

# Check if main.py exists at the new path
if (-not (Test-Path $mainScriptPath)) {
    Write-Error "ERROR: Main script not found: '$mainScriptPath'"
    Read-Host "Press Enter to exit"
    exit 1
}

# Launch main.py using the pythonw.exe from the virtual environment
Write-Host "Starting Pomodoro Fusion using '$venvPythonPath'..." # Only visible if run from an already open terminal
try {
    # Start-Process is good for launching GUI apps without waiting
    # -WindowStyle Hidden attempts to hide any console window pythonw might briefly flash
    Start-Process -FilePath $venvPythonPath -ArgumentList """$mainScriptPath""" -WindowStyle Hidden
    Write-Host "Process started."
} catch {
    Write-Error "ERROR: Failed to start the Pomodoro application."
    Write-Error $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit 1
}

# The PowerShell script ends here, but the pythonw.exe process continues in the background.