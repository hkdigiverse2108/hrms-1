import subprocess
import os
import signal
import sys
import time
import shutil
import platform
from pathlib import Path

# Load .env file manually to avoid dependencies
def load_env():
    # Priority: .env.server (if on server) or .env
    is_prod_flag = "--prod" in sys.argv
    # On macOS, default to .env for local development unless --prod is specified
    if platform.system() == "Darwin" and not is_prod_flag:
        env_files = [".env", ".env.server"]
    else:
        env_files = [".env.server", ".env"]

    for env_file in env_files:
        env_path = Path(__file__).parent / env_file
        if env_path.exists():
            print(f"Loading environment from {env_file}")
            with open(env_path, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if "=" in line and not line.startswith("#"):
                        parts = line.split("=", 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            value = parts[1].strip().strip('"').strip("'")
                            # Don't overwrite if already set in environment
                            if key not in os.environ:
                                os.environ[key] = value
            return env_file == ".env.server"
    return False

def get_venv_python():
    """Find the Python executable inside the project's venv or .venv."""
    for venv_name in ["venv", ".venv"]:
        venv_dir = Path(__file__).parent / venv_name
        if os.name == 'nt':
            venv_python = venv_dir / "Scripts" / "python.exe"
        else:
            venv_python = venv_dir / "bin" / "python3"
        if venv_python.exists():
            return str(venv_python)
    # Fallback to the current interpreter
    return sys.executable

def kill_port_owner(port):
    """Clean up any process using the port before starting (cross-platform)."""
    try:
        if os.name == 'nt':
            cmd = f"netstat -ano | findstr :{port} | findstr LISTENING"
            output = subprocess.check_output(cmd, shell=True).decode()
            for line in output.strip().split('\n'):
                parts = line.split()
                if len(parts) > 4:
                    pid = parts[-1]
                    print(f"Cleaning up port {port} (PID: {pid})...")
                    subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        else:
            # Linux/macOS
            cmd = f"lsof -t -i:{port}"
            try:
                pid = subprocess.check_output(cmd, shell=True).decode().strip()
                if pid:
                    print(f"Cleaning up port {port} (PID: {pid})...")
                    subprocess.run(f"kill -9 {pid}", shell=True)
            except subprocess.CalledProcessError:
                pass
    except Exception:
        pass

def run_app():
    start_time = time.time()
    is_server = load_env()
    is_prod = "--prod" in sys.argv or is_server
    
    # Next.js uses PORT, Backend uses BACKEND_PORT
    backend_port = os.environ.get("BACKEND_PORT", "8000")
    frontend_port = os.environ.get("PORT", "3535")
    
    # Default to 127.0.0.1 for local dev. Set APP_HOST=0.0.0.0 in .env.server for production
    app_host = os.environ.get("APP_HOST", "127.0.0.1")
    bind_host = app_host
    
    # Ensure standard env vars are set
    os.environ["HOST"] = app_host
    os.environ["UVICORN_HOST"] = app_host

    print("=" * 60)
    print(f"  HRMS Application Launcher (Like Sahjanand)")
    print("=" * 60)
    print(f"  Binding host : {app_host}")
    print(f"  Backend URL  : http://{app_host}:{backend_port}")
    print(f"  Frontend URL : http://{app_host}:{frontend_port}")
    print("=" * 60)

    # Clean up ports first to prevent "Address already in use" errors
    print(f"Cleaning ports {backend_port} and {frontend_port}...")
    kill_port_owner(backend_port)
    kill_port_owner(frontend_port)

    # Determine command for frontend (prefer bun if available)
    frontend_runner = "npm"
    if shutil.which("bun"):
        frontend_runner = "bun"
    
    print(f"Using {frontend_runner} for frontend")

    # Platform specific flags
    is_windows = os.name == 'nt'
    creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if is_windows else 0

    # 1. Start Backend
    python_exe = get_venv_python()
    print(f"Using Python: {python_exe}")
    
    # HRMS-1 backend is in 'backend' folder, entry is main.py
    backend_dir = Path(__file__).parent / "backend"
    backend_cmd = [python_exe, "-m", "uvicorn", "main:app", "--host", app_host, "--port", backend_port]
    
    # Add PYTHONPATH so backend modules can be imported correctly
    backend_env = os.environ.copy()
    backend_env["PYTHONPATH"] = str(backend_dir)

    if os.environ.get("DEBUG", "False").lower() == "true":
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

    def signal_handler(sig=None, frame=None):
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

    # Ignore SIGHUP so SSH disconnect does NOT kill the app
    if not is_windows:
        try:
            signal.signal(signal.SIGHUP, signal.SIG_IGN)
        except Exception:
            pass

    # Handle Ctrl+C and other termination signals
    signal.signal(signal.SIGINT, signal_handler)
    if not is_windows:
        signal.signal(signal.SIGTERM, signal_handler)

    # ── Monitor loop with auto-restart & health check ─────────
    restart_counts = {"backend": 0, "frontend": 0}
    MAX_RESTARTS = 5
    RESTART_DELAY = 3   # seconds before restarting a crashed process
    backend_checked = False

    print("\n✓  Both services started. Monitoring …\n")

    try:
        while not shutting_down[0]:
            time.sleep(1)

            # 1. Process health & auto-restart
            for name in ("backend", "frontend"):
                proc = processes[name]
                if proc.poll() is not None:
                    if restart_counts[name] >= MAX_RESTARTS:
                        print(f"✗  {name} crashed {MAX_RESTARTS} times. Giving up.")
                        signal_handler()
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

            # 2. Perform backend health check once after 10 seconds
            if not backend_checked and time.time() - start_time > 10:
                import urllib.request
                # Use 127.0.0.1 for local health check even if bound to 0.0.0.0
                check_host = "127.0.0.1" if app_host == "0.0.0.0" else app_host
                try:
                    # HRMS-1 backend has a root route "/"
                    with urllib.request.urlopen(f"http://{check_host}:{backend_port}/", timeout=2) as response:
                        if response.getcode() == 200:
                            print("Backend self-test: SUCCESS (Backend is responding)")
                            backend_checked = True
                except Exception as e:
                    print(f"Backend self-test: PENDING... ({e})")
                    # Try again in next iteration
                    pass
    except KeyboardInterrupt:
        pass
    finally:
        signal_handler(None, None)

if __name__ == "__main__":
    run_app()
