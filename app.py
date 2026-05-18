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
    load_env()

    frontend_port = os.getenv("PORT", "3535")
    backend_port  = os.getenv("BACKEND_PORT", "8000")

    host      = get_local_ip()
    is_server = host != "127.0.0.1"
    bind_host = "0.0.0.0" if is_server else "127.0.0.1"

    is_prod = "--prod" in sys.argv or is_server
    
    is_windows    = os.name == "nt"
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if is_windows else 0

    # Expose detected host so the Next.js proxy (next.config.mjs) can reach backend
    os.environ["BACKEND_HOST"]     = "127.0.0.1"   # proxy is always same-machine
    os.environ["NEXT_PUBLIC_HOST"] = host
    
    print("=" * 55)
    print("  HRMS Application Launcher")
    print("=" * 55)
    print(f"  Mode          : {'PRODUCTION' if is_prod else 'LOCAL DEV'}")
    print(f"  Detected IP   : {host}")
    print(f"  Binding to    : {bind_host}")
    print(f"  Backend       : http://{host}:{backend_port}")
    print(f"  Frontend      : http://{host}:{frontend_port}")
    print(f"  Also on       : http://localhost:{frontend_port}")
    print("=" * 55)

    # ── Ignore SIGHUP so SSH disconnect does NOT kill the app ─
    if not is_windows:
        signal.signal(signal.SIGHUP, signal.SIG_IGN)

    # ── Backend ───────────────────────────────────────────────
    python_exe  = get_venv_python()
    backend_dir = Path(__file__).parent / "backend"

    # On server/prod: no --reload
    backend_cmd = [
        python_exe, "-m", "uvicorn", "main:app",
        "--host", bind_host,
        "--port", backend_port,
    ]
    if not is_prod:
        backend_cmd.append("--reload")

    print(f"\n→ Starting Backend  (FastAPI on port {backend_port})")
    print(f"  {' '.join(backend_cmd)}")

    # ── Frontend ──────────────────────────────────────────────
    frontend_dir = Path(__file__).parent / "frontend"
    standalone_server = frontend_dir / ".next" / "standalone" / "server.js"

    if not (frontend_dir / "node_modules").exists():
        print("\n→ node_modules missing — running npm install …")
        subprocess.run("npm install", cwd=str(frontend_dir), shell=True, check=True)

    if is_prod and not (frontend_dir / ".next").exists():
        print("\n→ Production build missing — running npm run build …")
        subprocess.run("npm run build", cwd=str(frontend_dir), shell=True, check=True)

    frontend_env = os.environ.copy()
    if is_prod:
        frontend_env["NODE_ENV"] = "production"
        if standalone_server.exists():
            # In standalone mode, Next.js expects 'public' and '.next/static' to be copied manually
            # into the standalone directory for the standalone server to serve them.
            try:
                import shutil
                standalone_dir = frontend_dir / ".next" / "standalone"
                
                # Sync public
                src_public = frontend_dir / "public"
                dest_public = standalone_dir / "public"
                if src_public.exists():
                    if dest_public.exists():
                        shutil.rmtree(dest_public)
                    shutil.copytree(src_public, dest_public)
                    print("✓ Copied frontend/public to standalone/public")
                
                # Sync static
                src_static = frontend_dir / ".next" / "static"
                dest_static = standalone_dir / ".next" / "static"
                if src_static.exists():
                    if dest_static.exists():
                        shutil.rmtree(dest_static)
                    shutil.copytree(src_static, dest_static)
                    print("✓ Copied frontend/.next/static to standalone/.next/static")
            except Exception as e:
                print(f"⚠ Failed to copy static assets to standalone folder: {e}")

            # Standalone mode: node runs server.js directly (much lighter)
            frontend_env["HOSTNAME"] = bind_host
            frontend_env["PORT"] = frontend_port
            frontend_cmd = f"node {standalone_server}"
        else:
            frontend_cmd = f"npm run start -- -H {bind_host} -p {frontend_port}"
    else:
        frontend_cmd = f"npm run dev -- -H {bind_host} -p {frontend_port}"

    print(f"\n→ Starting Frontend (Next.js on port {frontend_port})")
    print(f"  {frontend_cmd}")

    # ── Process management ────────────────────────────────────
    processes = {}   # {"backend": Popen, "frontend": Popen}

    def start_backend():
        return subprocess.Popen(
            backend_cmd,
            cwd=str(backend_dir),
            env=os.environ.copy(),
            creationflags=creation_flags,
        )

    def start_frontend():
        return subprocess.Popen(
            frontend_cmd,
            cwd=str(frontend_dir),
            shell=True,
            env=frontend_env,
            creationflags=creation_flags,
        )

    processes["backend"]  = start_backend()
    processes["frontend"] = start_frontend()

    # ── Signal handling ───────────────────────────────────────
    shutting_down = [False]

    def shutdown(sig=None, frame=None):
        if shutting_down[0]:
            return
        shutting_down[0] = True
        print("\n\nShutting down …")
        for name, proc in processes.items():
            try:
                if is_windows:
                    subprocess.call(["taskkill", "/F", "/T", "/PID", str(proc.pid)])
                else:
                    proc.terminate()
                    proc.wait(timeout=5)
            except Exception:
                pass
        print("All servers stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT,  shutdown)
    if not is_windows:
        signal.signal(signal.SIGTERM, shutdown)

    # ── Monitor loop with auto-restart ────────────────────────
    # On the server, transient crashes (OOM, bad import, etc.) shouldn't
    # bring down the whole app.  We restart the dead process up to 5 times.
    restart_counts = {"backend": 0, "frontend": 0}
    MAX_RESTARTS = 5
    RESTART_DELAY = 3   # seconds before restarting a crashed process

    print("\n✓  Both services started. Monitoring …\n")

    try:
        while not shutting_down[0]:
            time.sleep(2)

            for name in ("backend", "frontend"):
                proc = processes[name]
                if proc.poll() is not None:
                    if restart_counts[name] >= MAX_RESTARTS:
                        print(f"✗  {name} crashed {MAX_RESTARTS} times. Giving up.")
                        shutdown()
                        return

                    restart_counts[name] += 1
                    exit_code = proc.returncode
                    print(f"⚠  {name} exited (code {exit_code}). "
                          f"Restarting in {RESTART_DELAY}s "
                          f"[attempt {restart_counts[name]}/{MAX_RESTARTS}] …")
                    time.sleep(RESTART_DELAY)

                    if name == "backend":
                        processes["backend"]  = start_backend()
                    else:
                        processes["frontend"] = start_frontend()

                    print(f"✓  {name} restarted.")
                else:
                    # Process is alive — reset its restart counter
                    restart_counts[name] = 0

    except KeyboardInterrupt:
        pass
    finally:
        shutdown()


if __name__ == "__main__":
    main()
