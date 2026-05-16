import subprocess
import os
import signal
import sys
import time
import shutil
from pathlib import Path

# Load .env file manually to avoid dependencies
def load_env():
    # Priority: .env.server (if on server) or .env
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
            break # Only load the first one found

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
    load_env()
    
    # Next.js uses PORT, Backend uses BACKEND_PORT
    backend_port = os.environ.get("BACKEND_PORT", "8000")
    frontend_port = os.environ.get("PORT", "3535")
    
    # Default to 127.0.0.1 for local dev. Set APP_HOST=0.0.0.0 in .env.server for production
    app_host = os.environ.get("APP_HOST", "127.0.0.1")
    
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

    print(f"Launching Backend: {' '.join(backend_cmd)}")
    backend_process = subprocess.Popen(
        backend_cmd,
        cwd=str(backend_dir),
        env=backend_env,
        creationflags=creation_flags
    )

    # 2. Build Frontend (Next.js)
    # Check if we should skip build (e.g. for faster local dev)
    skip_build = os.environ.get("SKIP_BUILD", "False").lower() == "true"
    if not skip_build:
        print(f"Building frontend...")
        build_env = os.environ.copy()
        # Optimization flags for faster build
        build_env["NODE_OPTIONS"] = "--max-old-space-size=2048"
        build_env["GENERATE_SOURCEMAP"] = "false"
        build_env["NEXT_TELEMETRY_DISABLED"] = "1"
        
        result = subprocess.run(
            [frontend_runner, "run", "build", "--", "--no-lint"],
            cwd=str(Path(__file__).parent / "frontend"),
            env=build_env,
            shell=is_windows
        )
        
        if result.returncode != 0:
            print("\n" + "!"*60)
            print("  FRONTEND BUILD FAILED!")
            print("  Likely due to low memory (Bus Error).")
            print("  Try adding a swap file or increasing RAM.")
            print("!"*60 + "\n")
            sys.exit(1)

    # 3. Start Frontend
    # Use 'preview' script (maps to 'next start' in HRMS-1)
    frontend_cmd = [frontend_runner, "run", "preview", "--", "--port", frontend_port]
    if app_host != "127.0.0.1":
        # Next.js uses --hostname
        frontend_cmd.extend(["--hostname", app_host])
    
    print(f"Launching Frontend: {' '.join(frontend_cmd)}")
    frontend_process = subprocess.Popen(
        frontend_cmd,
        cwd=str(Path(__file__).parent / "frontend"),
        env=os.environ.copy(),
        shell=is_windows,
        creationflags=creation_flags
    )

    def signal_handler(sig, frame):
        print("\nShutting down applications...")
        
        if is_windows:
            # Force kill the process tree
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(backend_process.pid)])
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(frontend_process.pid)])
        else:
            backend_process.terminate()
            frontend_process.terminate()
            backend_process.wait()
            frontend_process.wait()
            
        print("Shutdown complete.")
        sys.exit(0)

    # Handle Ctrl+C and other termination signals
    signal.signal(signal.SIGINT, signal_handler)
    if not is_windows:
        signal.signal(signal.SIGTERM, signal_handler)

    # Monitor processes and check backend health
    backend_checked = False
    
    try:
        while True:
            time.sleep(1)
            # Check if processes are still alive
            if backend_process.poll() is not None:
                print("Backend process terminated unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print("Frontend process terminated unexpectedly.")
                break
                
            # Perform health check once after 10 seconds
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
