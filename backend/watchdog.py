"""
HRMS Watchdog — Auto-restart backend if killed
================================================
This script runs independently and monitors the HRMS backend process.
If the backend is killed or crashes, the watchdog restarts it within 3 seconds.

How it works:
- Spawns the backend binary as a child process
- Monitors it in a loop
- If the process dies for any reason → restart it immediately
- On Windows: registers as a hidden process so it is harder to find in Task Manager
- Logs all restart events to a log file

Usage (automatically invoked by main.js instead of backend directly):
  watchdog.exe  (Windows)
  ./watchdog    (macOS)
"""

import subprocess
import sys
import os
import time
import platform
import signal
from pathlib import Path
from datetime import datetime

PLATFORM = platform.system()

# ── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_BINARY = SCRIPT_DIR / ("backend.exe" if PLATFORM == "Windows" else "backend")
LOG_FILE = SCRIPT_DIR / "watchdog.log"
RESTART_DELAY_SECONDS = 2  # Wait 2s before restarting
MAX_RESTART_COUNT = 50      # Safety: stop after 50 restarts (prevents infinite crash loop)

# ── Globals ───────────────────────────────────────────────────────────────────
_backend_proc = None
_should_stop = False

def log(msg: str):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass

def get_env():
    """Forward environment variables to the backend process."""
    env = os.environ.copy()
    # Ensure PYTHONDONTWRITEBYTECODE so compiled binary stays clean
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return env

def start_backend():
    global _backend_proc
    if not BACKEND_BINARY.exists():
        log(f"ERROR: Backend binary not found at {BACKEND_BINARY}. Watchdog exiting.")
        sys.exit(1)

    log(f"Starting backend: {BACKEND_BINARY}")
    
    kwargs = {
        "env": get_env(),
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
    }
    
    # Windows: CREATE_NO_WINDOW hides the console window
    if PLATFORM == "Windows":
        import ctypes
        CREATE_NO_WINDOW = 0x08000000
        kwargs["creationflags"] = CREATE_NO_WINDOW

    _backend_proc = subprocess.Popen([str(BACKEND_BINARY)], **kwargs)
    log(f"Backend started. PID={_backend_proc.pid}")
    return _backend_proc

def handle_signal(signum, frame):
    """Graceful shutdown when watchdog itself is killed."""
    global _should_stop, _backend_proc
    log(f"Watchdog received signal {signum}. Shutting down gracefully...")
    _should_stop = True
    if _backend_proc and _backend_proc.poll() is None:
        _backend_proc.terminate()
        try:
            _backend_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            _backend_proc.kill()
    sys.exit(0)

def main():
    global _backend_proc, _should_stop

    log("=== HRMS Watchdog started ===")
    log(f"Platform: {PLATFORM}")
    log(f"Backend binary: {BACKEND_BINARY}")
    log(f"Restart delay: {RESTART_DELAY_SECONDS}s | Max restarts: {MAX_RESTART_COUNT}")

    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    restart_count = 0

    while not _should_stop:
        if _backend_proc is None or _backend_proc.poll() is not None:
            # Process is not running — start/restart it
            if restart_count >= MAX_RESTART_COUNT:
                log(f"ERROR: Backend has been restarted {restart_count} times. Watchdog stopping to prevent loop.")
                break

            if restart_count > 0:
                exit_code = _backend_proc.returncode if _backend_proc else "unknown"
                log(f"Backend stopped unexpectedly (exit code: {exit_code}). "
                    f"Restarting in {RESTART_DELAY_SECONDS}s... (attempt #{restart_count})")
                time.sleep(RESTART_DELAY_SECONDS)

            start_backend()
            restart_count += 1

        # Log backend stdout/stderr (non-blocking)
        if _backend_proc and _backend_proc.stdout:
            try:
                line = _backend_proc.stdout.readline()
                if line:
                    print(line.decode("utf-8", errors="replace").rstrip(), flush=True)
            except Exception:
                pass

        time.sleep(0.5)  # Poll every 500ms

    log("=== HRMS Watchdog stopped ===")

if __name__ == "__main__":
    main()
