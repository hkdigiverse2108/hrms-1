import os
import subprocess
import sys

def load_env():
    env_path = os.path.join(os.getcwd(), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print(f"Loaded environment variables from {env_path}")

def main():
    load_env()
    backend_port = os.getenv("BACKEND_PORT", "8000")
    # Run uvicorn and capture output
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", backend_port]
    
    print(f"Starting Backend in {os.path.join(os.getcwd(), 'backend')}")
    subprocess.run(backend_cmd, cwd="backend")

if __name__ == "__main__":
    main()
