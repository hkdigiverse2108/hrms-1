import subprocess
import sys
import time
import os
import signal
import socket
from pathlib import Path


# ──────────────────────────────────────────────
# Environment helpers
# ──────────────────────────────────────────────

def load_env():
    """Load .env from the project root without external dependencies."""
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                os.environ[key] = value
        print(f"Loaded environment variables from {env_path}")


def get_local_ip() -> str:
    """
    Detect the machine's primary LAN / server IP.
    Falls back to 127.0.0.1 if no network is available.
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_venv_python() -> str:
    """Return the Python executable inside .venv (or fall back to current)."""
    venv_dir = Path(__file__).parent / ".venv"
    if os.name == "nt":
        candidate = venv_dir / "Scripts" / "python.exe"
    else:
        candidate = venv_dir / "bin" / "python3"
    return str(candidate) if candidate.exists() else sys.executable


# ──────────────────────────────────────────────
# Main launcher
# ──────────────────────────────────────────────

def main():
    start_time = time.time()
    load_env()

    frontend_port = os.getenv("PORT", "3535")
    backend_port  = os.getenv("BACKEND_PORT", "8000")

    # Auto-detect host — works on both localhost and a remote server with no
    # changes to .env.  On a server this resolves to the server's LAN IP;
    # on a developer machine it resolves to the local Wi-Fi / loopback IP.
    host = get_local_ip()

    # Expose the detected host to child processes (Next.js proxy reads this)
    os.environ["BACKEND_HOST"] = host
    os.environ["NEXT_PUBLIC_HOST"] = host

    is_windows = os.name == "nt"
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if is_windows else 0

    print("=" * 55)
    print("  HRMS Application Launcher")
    print("=" * 55)
    print(f"  Detected host : {host}")
    print(f"  Backend       : http://{host}:{backend_port}")
    print(f"  Frontend      : http://{host}:{frontend_port}")
    print(f"  Also on       : http://localhost:{frontend_port}")
    print("=" * 55)

    # ── Backend ──────────────────────────────────────────────
    python_exe  = get_venv_python()
    backend_dir = Path(__file__).parent / "backend"
    backend_cmd = [
        python_exe, "-m", "uvicorn", "main:app",
        "--host", "0.0.0.0",   # bind all interfaces → reachable on localhost & server IP
        "--port", backend_port,
        "--reload",
    ]
    print(f"\n→ Starting Backend  (FastAPI on port {backend_port})")
    print(f"  {' '.join(backend_cmd)}")
    backend_process = subprocess.Popen(
        backend_cmd,
        cwd=str(backend_dir),
        env=os.environ.copy(),
        creationflags=creation_flags,
    )

    # ── Frontend ─────────────────────────────────────────────
    frontend_dir = Path(__file__).parent / "frontend"

    # Install deps if missing
    if not (frontend_dir / "node_modules").exists():
        print("\n→ node_modules missing — running npm install …")
        subprocess.run("npm install", cwd=str(frontend_dir), shell=True, check=True)

    frontend_env = os.environ.copy()
    frontend_env["PORT"] = frontend_port

    # --hostname 0.0.0.0 → Next.js listens on all interfaces (localhost + IP)
    frontend_cmd = f"npm run dev -- --hostname 0.0.0.0 --port {frontend_port}"
    print(f"\n→ Starting Frontend (Next.js on port {frontend_port})")
    print(f"  {frontend_cmd}")
    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=str(frontend_dir),
        shell=True,
        env=frontend_env,
        creationflags=creation_flags,
    )

    # ── Signal handling ───────────────────────────────────────
    def shutdown(sig=None, frame=None):
        print("\n\nShutting down …")
        if is_windows:
            subprocess.call(["taskkill", "/F", "/T", "/PID", str(backend_process.pid)])
            subprocess.call(["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)])
        else:
            backend_process.terminate()
            frontend_process.terminate()
            backend_process.wait()
            frontend_process.wait()
        print("All servers stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if not is_windows:
        signal.signal(signal.SIGTERM, shutdown)

    # ── Health check + monitor loop ───────────────────────────
    backend_ok = False
    try:
        while True:
            time.sleep(1)

            if backend_process.poll() is not None:
                print("⚠  Backend terminated unexpectedly — restarting not supported. Exiting.")
                break
            if frontend_process.poll() is not None:
                print("⚠  Frontend terminated unexpectedly — restarting not supported. Exiting.")
                break

            # One-time health check after 5 seconds
            if not backend_ok and (time.time() - start_time) > 5:
                import urllib.request
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{backend_port}/health", timeout=2) as r:
                        if r.getcode() == 200:
                            print("✓  Backend health check: OK")
                            backend_ok = True
                except Exception:
                    pass  # still starting up

    except KeyboardInterrupt:
        pass
    finally:
        shutdown()


if __name__ == "__main__":
    main()
