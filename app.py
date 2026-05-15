import subprocess
import sys
import time
import os
import socket

def get_local_ip():
    try:
        # Create a temporary socket to find the primary interface IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                key, value = line.split('=', 1)
                os.environ[key] = value
        print(f"Loaded environment variables from {env_path}")

def main():
    load_env()
    
    frontend_port = os.getenv("PORT", "3000")
    backend_port = os.getenv("BACKEND_PORT", "8000")
    
    print(f"Starting Backend and Frontend servers concurrently...")

    # For the backend, we run the uvicorn server via python module
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", backend_port]

    
    # For the frontend, we use npm to start Next.js
    # We use -H 0.0.0.0 to make it accessible on the local network
    frontend_cmd = f"npm run dev -- -H 0.0.0.0"
    frontend_env = os.environ.copy()
    frontend_env["PORT"] = frontend_port

    local_ip = get_local_ip()
    print(f"\n" + "="*50)
    print(f"ACCESS URLS:")
    print(f"  Local:   http://localhost:{frontend_port}")
    print(f"  Network: http://{local_ip}:{frontend_port}")
    print(f"="*50 + "\n")

    # Check and install frontend dependencies if node_modules is missing
    frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    
    if not os.path.exists(node_modules_path):
        print("-> node_modules not found in frontend. Running 'npm install'...")
        try:
            subprocess.run("npm install", cwd=frontend_dir, shell=True, check=True)
            print("-> frontend dependencies installed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"-> Error installing frontend dependencies: {e}")
            sys.exit(1)

    try:
        # Start backend
        print(f"-> Starting Backend (FastAPI on Port {backend_port})")
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd="backend",
            env=os.environ.copy()
        )
        
        # Start frontend
        print(f"-> Starting Frontend (Next.js on Port {frontend_port})")
        frontend_process = subprocess.Popen(
            frontend_cmd,
            cwd="frontend",
            shell=True,
            env=frontend_env
        )
        
        # Wait until processes complete or are interrupted
        backend_process.wait()
        frontend_process.wait()

    except KeyboardInterrupt:
        print("\nTermination signal received. Stopping both servers...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        print("All servers stopped cleanly.")

if __name__ == "__main__":
    main()
