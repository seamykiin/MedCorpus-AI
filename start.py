#!/usr/bin/env python3
"""
MedCorpus AI — Cross-platform Unified Launcher
Runs both the FastAPI backend and Vite frontend concurrently.
"""
import os
import sys
import subprocess
import signal
import time
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

# Virtualenv python binary
VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
if not os.path.exists(VENV_PYTHON):
    VENV_PYTHON = sys.executable

# Package manager detection
PKG_MGR = "pnpm" if shutil.which("pnpm") else "npm"

processes = []

def free_ports(ports=(8000, 8443, 5173)):
    """Automatically frees ports from stale previous runs."""
    for port in ports:
        try:
            out = subprocess.check_output(
                ["lsof", "-ti", f":{port}"],
                stderr=subprocess.DEVNULL
            ).decode().strip()
            if out:
                for pid in out.split():
                    os.kill(int(pid), signal.SIGKILL)
        except Exception:
            pass

def cleanup(signum=None, frame=None):
    print("\n\033[1;33mShutting down MedCorpus backend and frontend...\033[0m")
    for p in processes:
        if p.poll() is None:
            p.terminate()
            try:
                p.wait(timeout=3)
            except subprocess.TimeoutExpired:
                p.kill()
    free_ports()
    print("\033[0;32mAll processes stopped cleanly.\033[0m")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

def main():
    print("\033[1;36m======================================================\033[0m")
    print("\033[1;36m          MedCorpus AI — Unified Launcher             \033[0m")
    print("\033[1;36m======================================================\033[0m\n")

    # Auto-free ports if already held
    free_ports()

    # Ensure frontend node_modules is installed
    vite_bin = os.path.join(FRONTEND_DIR, "node_modules", ".bin", "vite")
    if not os.path.exists(vite_bin) and not os.path.exists(vite_bin + ".cmd"):
        print(f"\033[0;33mInstalling frontend dependencies using {PKG_MGR}...\033[0m")
        subprocess.run([PKG_MGR, "install"], cwd=FRONTEND_DIR)

    # 1. Start Backend
    print("\033[0;34m[1/2] Starting FastAPI Backend on http://localhost:8000...\033[0m")
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT_DIR
    backend_proc = subprocess.Popen(
        [VENV_PYTHON, os.path.join(BACKEND_DIR, "run.py")],
        cwd=ROOT_DIR,
        env=env
    )
    processes.append(backend_proc)

    time.sleep(1.5)

    # 2. Start Frontend
    print(f"\033[0;34m[2/2] Starting Vite Frontend ({PKG_MGR} dev) on http://localhost:8443...\033[0m")
    frontend_env = os.environ.copy()
    frontend_env["PATH"] = os.path.join(FRONTEND_DIR, "node_modules", ".bin") + os.pathsep + frontend_env.get("PATH", "")
    frontend_proc = subprocess.Popen(
        [PKG_MGR, "run", "dev"],
        cwd=FRONTEND_DIR,
        env=frontend_env
    )
    processes.append(frontend_proc)

    print("\n\033[1;32m✔ MedCorpus is running!\033[0m")
    print("  ➜  \033[1mFrontend:\033[0m http://localhost:8443")
    print("  ➜  \033[1mBackend API:\033[0m http://localhost:8000")
    print("  ➜  \033[1mAPI Docs (Swagger):\033[0m http://localhost:8000/docs")
    print("\n\033[0;36mPress Ctrl+C to stop both servers.\033[0m\n")

    try:
        while True:
            time.sleep(1)
            for p in processes:
                if p.poll() is not None:
                    cleanup()
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
