# HRMS macOS Setup Guide

## macOS Employee ને આ file share કરો

---

## Step 1: Python Install (macOS)

macOS પર Python 3.11+ install:
```bash
# Homebrew ન હોય તો:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Python install:
brew install python@3.11
```

---

## Step 2: Virtual Environment + Dependencies

Terminal open કરો, project folder માં:
```bash
cd /path/to/hrms-1

# Virtual environment create
python3.11 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# macOS-only: AppKit wrapper (window tracking માટે)
pip install pyobjc-framework-Cocoa
```

---

## Step 3: Backend Compile (macOS machine પર)

```bash
source venv/bin/activate
python backend/build_backend.py
```

✅ Output: `backend/dist/backend` (no extension — macOS binary)

---

## Step 4: Frontend Build

```bash
cd frontend
npm install
npm run build
cd ..
```

---

## Step 5: Desktop App Package

```bash
npm install
node build_desktop.js
```

✅ Output: `dist/HRMS-desktop-mac/` folder

---

## Step 6: Employee ને Share

```
dist/HRMS-desktop-mac/  ← આ folder ZIP કરી macOS employee ને share કરો
```

Employee ના Mac પર:
1. ZIP extract કરો
2. `HRMS.app` ઉપર double-click
3. "Cannot be opened" error આવે તો:
   - **System Preferences → Privacy & Security → Open Anyway**
   - Or Terminal: `xattr -cr /path/to/HRMS.app`

---

## macOS Accessibility Permission

First launch પર macOS **Accessibility** permission માગશે:
- **System Preferences → Privacy & Security → Accessibility**
- HRMS app ને ✓ tick (allow)

> ⚠️ **Important**: Accessibility permission વગર app tracking અને restriction enforcement work નહીં કરે.

---

## Windows vs macOS — Share Comparison

| | Windows | macOS |
|---|---|---|
| **Share** | `dist/HRMS-desktop/` folder | `dist/HRMS-desktop-mac/` folder |
| **Launch** | `HRMS.exe` double-click | `HRMS.app` double-click |
| **Backend binary** | `backend.exe` | `backend` (no extension) |
| **Build machine** | Windows PC | Mac |
| **Extra install** | (nothing extra) | `pyobjc-framework-Cocoa` |
| **Tab close shortcut** | Ctrl+W | Cmd+W |
| **Chrome process** | `chrome.exe` | `com.google.Chrome` |

---

## Backend .env.server (same for both platforms)

```
MONGODB_URL=mongodb+srv://...
SECRET_KEY=your-secret-key
BACKEND_URL=http://127.0.0.1:8000
BACKEND_PORT=8000
PORT=3535
```

