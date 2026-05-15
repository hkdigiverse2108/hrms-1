import subprocess
import os
import signal
import sys
import time
import shutil
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_env():
    """Load variables from .env into os.environ (no external deps)."""
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Don't overwrite values already set in the real environment
            if key and key not in os.environ:
                os.environ[key] = value


def get_venv_python() -> str:
    """Return the Python executable from the project's .venv, if it exists."""
    venv_dir = Path(__file__).parent / ".venv"
    candidates = (
        venv_dir / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python3"),
        venv_dir / "bin" / "python",
    )
    for p in candidates:
        if p.exists():
            return str(p)
    return sys.executable


def find_frontend_runner() -> str:
    """Prefer bun over npm."""
    return "bun" if shutil.which("bun") else "npm"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_app():
    load_env()

    # ── Ports & host ─────────────────────────────────────────────────────────
    backend_port  = os.environ.get("BACKEND_PORT", "8000")
    frontend_port = os.environ.get("PORT", "3535")          # Next.js uses PORT

    # APP_HOST controls binding:
    #   127.0.0.1 → local-only (default, safe on macOS)
    #   0.0.0.0   → all interfaces (set this on a server)
    app_host = os.environ.get("APP_HOST", "127.0.0.1")

    # Propagate so uvicorn and Next.js both pick up the same host
    os.environ["APP_HOST"]     = app_host
    os.environ["HOST"]         = app_host   # used by some Next.js internals
    os.environ["BACKEND_PORT"] = backend_port
    os.environ["PORT"]         = frontend_port

    # ── Info ─────────────────────────────────────────────────────────────────
    display_host = app_host if app_host != "0.0.0.0" else "<your-server-ip>"
    print("=" * 60)
    print("  HRMS Application Launcher")
    print("=" * 60)
    print(f"  Binding host : {app_host}")
    print(f"  Backend      : http://{display_host}:{backend_port}")
    print(f"  Frontend     : http://{display_host}:{frontend_port}")
    print("=" * 60)

    is_windows      = os.name == "nt"
    creation_flags  = subprocess.CREATE_NEW_PROCESS_GROUP if is_windows else 0
    frontend_runner = find_frontend_runner()
    python_exe      = get_venv_python()

    print(f"  Python       : {python_exe}")
    print(f"  JS runner    : {frontend_runner}")
    print("=" * 60)

    root = Path(__file__).parent
    backend_dir  = root / "backend"
    frontend_dir = root / "frontend"

    # ── Backend ──────────────────────────────────────────────────────────────
    # Run uvicorn from inside backend/ so that bare imports like
    # `import crud, schemas, database` resolve as sibling modules.
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = str(backend_dir)  # ensures siblings are importable

    backend_cmd = [
        python_exe, "-m", "uvicorn",
        "main:app",           # relative to backend/ cwd
        "--host", app_host,
        "--port", backend_port,
    ]
    if os.environ.get("DEBUG", "false").lower() == "true":
        backend_cmd.append("--reload")

    print(f"\n[backend] Starting: {' '.join(backend_cmd)}")
    backend_process = subprocess.Popen(
        backend_cmd,
        cwd=str(backend_dir),   # <── key fix: run from within backend/
        env=backend_env,
        creationflags=creation_flags,
    )

    # ── Frontend (Next.js) ───────────────────────────────────────────────────
    # Decide: dev mode vs production build+start
    next_mode = os.environ.get("NEXT_MODE", "dev").lower()  # "dev" or "prod"

    if next_mode == "prod":
        # Build first
        print(f"\n[frontend] Building with {frontend_runner}…")
        build_result = subprocess.run(
            [frontend_runner, "run", "build"],
            cwd=str(frontend_dir),
            env=os.environ.copy(),
            shell=is_windows,
        )
        if build_result.returncode != 0:
            print("[frontend] Build FAILED — aborting.")
            backend_process.terminate()
            sys.exit(1)

        frontend_cmd = [frontend_runner, "run", "start"]
    else:
        # Development — hot reload
        frontend_cmd = [frontend_runner, "run", "dev"]

    # Pass --hostname so Next.js binds to the correct interface
    # `next dev/start` accept: --hostname <host> --port <port>
    frontend_cmd += ["--", "--port", frontend_port]
    if app_host != "127.0.0.1":
        frontend_cmd += ["--hostname", app_host]

    print(f"[frontend] Starting ({next_mode} mode): {' '.join(frontend_cmd)}")
    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=str(frontend_dir),
        env=os.environ.copy(),
        shell=is_windows,
        creationflags=creation_flags,
    )

    # ── Signal handling ───────────────────────────────────────────────────────
    def shutdown(sig=None, frame=None):
        print("\n[launcher] Shutting down…")
        if is_windows:
            for proc in (backend_process, frontend_process):
                subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)])
        else:
            for proc in (backend_process, frontend_process):
                try:
                    proc.terminate()
                except ProcessLookupError:
                    pass
            backend_process.wait()
            frontend_process.wait()
        print("[launcher] Done.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if not is_windows:
        signal.signal(signal.SIGTERM, shutdown)

    # ── Monitor loop ──────────────────────────────────────────────────────────
    try:
        while True:
            time.sleep(1)

            if backend_process.poll() is not None:
                print("[backend] Process terminated unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("[frontend] Process terminated unexpectedly.")
                break

    except KeyboardInterrupt:
        pass
    finally:
        shutdown()


if __name__ == "__main__":
    run_app()
