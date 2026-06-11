import subprocess
import sys
import os
import shutil
import platform
from pathlib import Path

PLATFORM = platform.system()  # 'Windows', 'Darwin', 'Linux'

def compile_binary(script_path: Path, binary_name: str, hidden_imports: list, backend_dir: Path, extra_args: list = None):
    """Compile a Python script to standalone binary using PyInstaller."""
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        f"--name={binary_name}",
        f"--workpath={backend_dir / 'build'}",
        f"--distpath={backend_dir / 'dist'}",
    ]

    if PLATFORM == "Darwin":
        cmd += [f"--osx-bundle-identifier=com.hrms.{binary_name}"]

    for imp in hidden_imports:
        cmd.append(f"--hidden-import={imp}")

    if extra_args:
        cmd.extend(extra_args)

    cmd.append(str(script_path))

    print(f"Compiling {script_path.name} → {binary_name}...")
    print(" ".join(cmd))
    result = subprocess.run(cmd, cwd=str(backend_dir))
    return result.returncode

def build():
    backend_dir = Path(__file__).parent.resolve()
    main_py = backend_dir / "main.py"
    watchdog_py = backend_dir / "watchdog.py"

    # Platform-aware binary name suffix
    ext = ".exe" if PLATFORM == "Windows" else ""

    print(f"Building backend executables...")
    print(f"Platform: {PLATFORM}")

    # ── Shared hidden imports ─────────────────────────────────────────────
    backend_imports = [
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "fastapi",
        "motor",
        "motor.motor_asyncio",
        "pymongo",
        "dns",
        "passlib",
        "passlib.handlers.bcrypt",
        "jose",
        "cryptography",
        "bcrypt",
        "email_validator",
        "holidays",
        "websockets",
        "anyio",
        "watchfiles",
        "httptools",
        "h11",
        "pynput",
        "pynput.keyboard",
        "pynput.mouse",
    ]
    if PLATFORM == "Darwin":
        backend_imports += ["AppKit", "Foundation", "objc"]

    watchdog_imports = []  # watchdog is pure stdlib — no extra imports needed

    # ── Build 1: backend binary ───────────────────────────────────────────
    rc1 = compile_binary(main_py, "backend", backend_imports, backend_dir)
    if rc1 != 0:
        print("Backend PyInstaller build failed!")
        sys.exit(rc1)
    print(f"\n✅ Backend compiled: backend/dist/backend{ext}")

    # ── Build 2: watchdog binary ──────────────────────────────────────────
    rc2 = compile_binary(watchdog_py, "watchdog", watchdog_imports, backend_dir)
    if rc2 != 0:
        print("Watchdog PyInstaller build failed!")
        sys.exit(rc2)
    print(f"✅ Watchdog compiled: backend/dist/watchdog{ext}")

    print("\n=== Build complete ===")
    print(f"Both binaries are in: {backend_dir / 'dist'}")

if __name__ == "__main__":
    build()

