import subprocess
import sys
import time

def main():
    print("Starting Backend and Frontend servers concurrently...")

    # For the backend, we run the uvicorn server via python module
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--reload"]
    
    # For the frontend, we use npm to start Next.js
    frontend_cmd = "npm run dev"

    try:
        # Start backend
        print("-> Starting Backend (FastAPI on Port 8000)")
        backend_process = subprocess.Popen(
            backend_cmd,
            cwd="backend"
        )
        
        # Start frontend
        print("-> Starting Frontend (Next.js on Port 3000)")
        frontend_process = subprocess.Popen(
            frontend_cmd,
            cwd="frontend",
            shell=True  # Required on Windows to easily execute the global npm script
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
