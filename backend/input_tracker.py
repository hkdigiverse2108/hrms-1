import threading
import time
import asyncio
import platform
from datetime import datetime
from pynput import mouse, keyboard
from pynput.keyboard import Controller, Key
import pytz
from bson import ObjectId
import socket
import os
import signal
import subprocess
from pathlib import Path
from typing import Optional, List, Dict
import re

IST = pytz.timezone('Asia/Kolkata')

PLATFORM = platform.system()  # 'Windows', 'Darwin' (macOS), 'Linux'

# Global state
_clicks = 0
_keystrokes = 0
_app_durations = {}
_domain_durations = {}
_state_lock = threading.Lock()

_active_employee_id = None
_active_user_is_admin = False

_db = None
_tracker_thread = None
_sync_thread = None
_restrictions_thread = None
_app_monitor_thread = None
_stop_event = threading.Event()
_main_loop = None

_keyboard_controller = Controller()

# ─────────────────────────────────────────────────────────────────────────────
# Platform-specific imports & setup
# ─────────────────────────────────────────────────────────────────────────────

if PLATFORM == "Windows":
    import ctypes
    from ctypes import wintypes

    GetForegroundWindow = ctypes.windll.user32.GetForegroundWindow
    GetWindowThreadProcessId = ctypes.windll.user32.GetWindowThreadProcessId
    GetWindowTextW = ctypes.windll.user32.GetWindowTextW
    GetWindowTextLengthW = ctypes.windll.user32.GetWindowTextLengthW

    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    PROCESS_TERMINATE = 0x0001
    OpenProcess = ctypes.windll.kernel32.OpenProcess
    CloseHandle = ctypes.windll.kernel32.CloseHandle
    TerminateProcess = ctypes.windll.kernel32.TerminateProcess
    QueryFullProcessImageNameW = ctypes.windll.kernel32.QueryFullProcessImageNameW

elif PLATFORM == "Darwin":
    # macOS — pyobjc (AppKit)
    try:
        from AppKit import NSWorkspace
        from Foundation import NSBundle
        _macos_appkit_available = True
    except ImportError:
        _macos_appkit_available = False
        print("[Tracker] WARNING: pyobjc not installed. macOS app tracking unavailable. "
              "Install with: pip install pyobjc-framework-Cocoa", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# macOS Accessibility / TCC Permission Monitor
# ─────────────────────────────────────────────────────────────────────────────
#
# macOS SPECIFIC BYPASS RISK:
# Employee can go to:
#   System Settings → Privacy & Security → Accessibility
#   and UNCHECK the HRMS app.
#
# This revokes the TCC (Transparency, Consent, Control) permission stored in:
#   ~/Library/Application Support/com.apple.TCC/TCC.db  (user-level)
#   /Library/Application Support/com.apple.TCC/TCC.db  (system-level, needs sudo)
#
# Effect if revoked:
#   ❌  pynput keyboard/mouse global hooks STOP working
#   ❌  Tab closing (Cmd+W) via pynput STOPS working
#   ✅  NSWorkspace active app detection still works (no Accessibility needed)
#   ✅  Chrome/app process kill still works (no Accessibility needed)
#   ✅  URL/domain tracking still works (title via AppleScript may fail, but NSWorkspace continues)
#
# FIX: We monitor the permission every 30s. If revoked:
#   1. Log a SECURITY ALERT to MongoDB → admin sees it in the panel
#   2. Re-open System Settings to Accessibility page (prompt employee to re-grant)
#   3. Record the tamper attempt with hostname + timestamp
# ─────────────────────────────────────────────────────────────────────────────

_permission_monitor_thread = None
_last_permission_state = True   # assume granted at start

def check_macos_accessibility_permission() -> bool:
    """
    Returns True if Accessibility permission is currently granted to this process.
    Uses ApplicationServices.AXIsProcessTrusted().
    Does NOT prompt (promptUser=False).
    """
    if PLATFORM != "Darwin":
        return True
    try:
        # Try using ApplicationServices via ctypes (no extra dependency)
        import ctypes
        import ctypes.util
        appserv = ctypes.cdll.LoadLibrary(
            ctypes.util.find_library("ApplicationServices")
        )
        # AXIsProcessTrustedWithOptions(NSDictionary options)
        # Simplest check: AXIsProcessTrusted()
        appserv.AXIsProcessTrusted.restype = ctypes.c_bool
        return bool(appserv.AXIsProcessTrusted())
    except Exception:
        # If the check itself fails, assume granted to avoid false alerts
        return True

async def _log_security_alert(db, event_type: str, details: str):
    """Write a security tamper event to MongoDB for admin visibility."""
    try:
        hostname = socket.gethostname()
        await db.security_alerts.insert_one({
            "hostname": hostname,
            "eventType": event_type,
            "details": details,
            "platform": PLATFORM,
            "timestamp": get_now(),
            "resolved": False
        })
        print(f"[Tracker Security] Alert logged to DB: {event_type} on {hostname}", flush=True)
    except Exception as e:
        print(f"[Tracker Security] Failed to log alert: {e}", flush=True)

def _open_macos_accessibility_settings():
    """Open System Settings → Accessibility page so employee is forced to re-grant."""
    try:
        subprocess.Popen([
            "open",
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        ])
        print("[Tracker Security] Opened Accessibility settings for re-grant.", flush=True)
    except Exception as e:
        print(f"[Tracker Security] Could not open settings: {e}", flush=True)

def _run_permission_monitor():
    """
    macOS ONLY: Monitor Accessibility permission every 30 seconds.
    If revoked, alert admin in MongoDB and re-open settings page.
    """
    global _last_permission_state, _db, _main_loop

    if PLATFORM != "Darwin":
        return

    print("[Tracker Security] macOS permission monitor started.", flush=True)
    check_count = 0

    while not _stop_event.is_set():
        time.sleep(30)
        check_count += 1

        current_granted = check_macos_accessibility_permission()

        if not current_granted and _last_permission_state:
            # Permission was REVOKED — tamper detected!
            hostname = socket.gethostname()
            msg = (f"Accessibility permission revoked on {hostname}. "
                   f"Tab blocking and keyboard tracking are now DISABLED. "
                   f"Employee may have disabled HRMS monitoring in System Settings.")
            print(f"[Tracker Security] ⚠️  PERMISSION REVOKED: {msg}", flush=True)

            # Log to MongoDB so admin sees it
            if _db and _main_loop:
                try:
                    asyncio.run_coroutine_threadsafe(
                        _log_security_alert(_db, "accessibility_permission_revoked", msg),
                        _main_loop
                    ).result(timeout=5)
                except Exception:
                    pass

            # Open settings page to force employee to re-grant
            _open_macos_accessibility_settings()
            _last_permission_state = False

        elif current_granted and not _last_permission_state:
            # Permission was RE-GRANTED
            hostname = socket.gethostname()
            msg = f"Accessibility permission re-granted on {hostname}."
            print(f"[Tracker Security] ✅ Permission restored: {msg}", flush=True)

            if _db and _main_loop:
                try:
                    asyncio.run_coroutine_threadsafe(
                        _log_security_alert(_db, "accessibility_permission_restored", msg),
                        _main_loop
                    ).result(timeout=5)
                except Exception:
                    pass

            _last_permission_state = True


# ─────────────────────────────────────────────────────────────────────────────
# Input listeners (cross-platform — pynput handles this)
# ─────────────────────────────────────────────────────────────────────────────

def on_click(x, y, button, pressed):
    global _clicks
    if pressed:
        with _state_lock:
            _clicks += 1

def on_press(key):
    global _keystrokes
    with _state_lock:
        _keystrokes += 1

def _run_listener():
    mouse_listener = mouse.Listener(on_click=on_click)
    mouse_listener.start()

    keyboard_listener = keyboard.Listener(on_press=on_press)
    keyboard_listener.start()

    while not _stop_event.is_set():
        time.sleep(1)

    mouse_listener.stop()
    keyboard_listener.stop()

def get_now():
    return datetime.now(IST)

# ─────────────────────────────────────────────────────────────────────────────
# Active window info — Windows implementation
# ─────────────────────────────────────────────────────────────────────────────

def _get_active_window_info_windows():
    """Returns (title, proc_name, pid) for the currently focused window on Windows."""
    hwnd = GetForegroundWindow()
    if not hwnd:
        return None, None, None

    length = GetWindowTextLengthW(hwnd)
    title = ""
    if length > 0:
        buff = ctypes.create_unicode_buffer(length + 1)
        GetWindowTextW(hwnd, buff, length + 1)
        title = buff.value

    pid = wintypes.DWORD()
    GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

    proc_name = None
    if pid.value:
        h_process = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if h_process:
            try:
                size = wintypes.DWORD(1024)
                buff = ctypes.create_unicode_buffer(1024)
                if QueryFullProcessImageNameW(h_process, 0, buff, ctypes.byref(size)):
                    proc_name = Path(buff.value).name.lower()
            except Exception:
                pass
            finally:
                CloseHandle(h_process)

    return title, proc_name, pid.value

# ─────────────────────────────────────────────────────────────────────────────
# Active window info — macOS implementation
# ─────────────────────────────────────────────────────────────────────────────

def _get_active_window_info_macos():
    """Returns (title, bundle_id, pid) for the currently focused app on macOS."""
    if not _macos_appkit_available:
        return None, None, None
    try:
        ws = NSWorkspace.sharedWorkspace()
        app = ws.frontmostApplication()
        if not app:
            return None, None, None

        bundle_id = app.bundleIdentifier() or ""
        pid = app.processIdentifier()
        # Try to get window title using subprocess (AppleScript)
        title = _get_window_title_macos(bundle_id)
        # Use bundle ID as proc_name equivalent (lowercase)
        proc_name = bundle_id.lower() if bundle_id else None
        return title, proc_name, pid
    except Exception as e:
        print(f"[Tracker] macOS window info error: {e}", flush=True)
        return None, None, None

def _get_window_title_macos(bundle_id: str) -> str:
    """Try to get the frontmost window title using AppleScript."""
    try:
        script = (
            'tell application "System Events" to '
            'get name of front window of (first process whose frontmost is true)'
        )
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=2
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return ""

# ─────────────────────────────────────────────────────────────────────────────
# Unified get_active_window_info
# ─────────────────────────────────────────────────────────────────────────────

def get_active_window_info():
    """Cross-platform: returns (title, proc_name_or_bundle_id, pid)."""
    if PLATFORM == "Windows":
        return _get_active_window_info_windows()
    elif PLATFORM == "Darwin":
        return _get_active_window_info_macos()
    else:
        return None, None, None

# ─────────────────────────────────────────────────────────────────────────────
# Process kill — cross-platform
# ─────────────────────────────────────────────────────────────────────────────

def kill_process(pid: int):
    if PLATFORM == "Windows":
        h_process = OpenProcess(PROCESS_TERMINATE, False, pid)
        if h_process:
            try:
                TerminateProcess(h_process, 1)
                print(f"[Tracker Restrictions] Terminated blocked process (PID: {pid})", flush=True)
            except Exception as e:
                print(f"[Tracker Restrictions] Failed to terminate PID {pid}: {e}", flush=True)
            finally:
                CloseHandle(h_process)
    else:
        # macOS / Linux — SIGTERM then SIGKILL
        try:
            os.kill(pid, signal.SIGTERM)
            print(f"[Tracker Restrictions] Sent SIGTERM to PID {pid}", flush=True)
        except ProcessLookupError:
            pass
        except Exception as e:
            print(f"[Tracker Restrictions] Failed to kill PID {pid}: {e}", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# Close active browser tab — cross-platform
# ─────────────────────────────────────────────────────────────────────────────

def close_active_tab():
    try:
        if PLATFORM == "Darwin":
            # macOS: Cmd+W
            with _keyboard_controller.pressed(Key.cmd):
                _keyboard_controller.press('w')
                _keyboard_controller.release('w')
            print("[Tracker Restrictions] Closed active tab (Cmd+W)", flush=True)
        else:
            # Windows/Linux: Ctrl+W
            with _keyboard_controller.pressed(Key.ctrl):
                _keyboard_controller.press('w')
                _keyboard_controller.release('w')
            print("[Tracker Restrictions] Closed active tab (Ctrl+W)", flush=True)
    except Exception as e:
        print(f"[Tracker Restrictions] Failed to send close-tab shortcut: {e}", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# Browser process name detection — per platform
# ─────────────────────────────────────────────────────────────────────────────

# Windows browser exe names
WINDOWS_BROWSER_PROCS = {"chrome.exe", "msedge.exe", "firefox.exe", "brave.exe", "opera.exe", "safari.exe"}

# macOS browser bundle IDs
MACOS_BROWSER_BUNDLES = {
    "com.google.chrome",
    "org.mozilla.firefox",
    "com.microsoft.edgemac",
    "com.brave.browser",
    "com.operasoftware.opera",
    "com.apple.safari",
}

def is_browser_process(proc_name: str) -> bool:
    """Returns True if proc_name is a known browser (Windows exe or macOS bundle ID)."""
    if not proc_name:
        return False
    pn = proc_name.lower()
    if PLATFORM == "Windows":
        return pn in WINDOWS_BROWSER_PROCS
    elif PLATFORM == "Darwin":
        return pn in MACOS_BROWSER_BUNDLES
    return False

def is_chrome_process(proc_name: str) -> bool:
    """Check if it's specifically Chrome."""
    if not proc_name:
        return False
    pn = proc_name.lower()
    if PLATFORM == "Windows":
        return pn == "chrome.exe"
    elif PLATFORM == "Darwin":
        return pn == "com.google.chrome"
    return False

def get_friendly_proc_name(proc_name: str) -> str:
    """Convert bundle ID to readable name for storage (macOS)."""
    if PLATFORM != "Darwin":
        return proc_name
    # Map bundle IDs to friendly names
    bundle_map = {
        "com.google.chrome": "chrome",
        "org.mozilla.firefox": "firefox",
        "com.microsoft.edgemac": "msedge",
        "com.brave.browser": "brave",
        "com.operasoftware.opera": "opera",
        "com.apple.safari": "safari",
        "com.apple.finder": "finder",
        "com.apple.terminal": "terminal",
        "com.microsoft.vscode": "vscode",
        "com.tinyspeck.slackmacgap": "slack",
        "com.figma.desktop": "figma",
        "com.postmanlabs.mac": "postman",
        "com.jetbrains.intellij": "intellij",
        "com.jetbrains.pycharm": "pycharm",
        "com.apple.xcode": "xcode",
        "com.zoom.xos": "zoom",
        "com.microsoft.teams": "teams",
        "com.skype.skype": "skype",
        "com.spotify.client": "spotify",
    }
    return bundle_map.get(proc_name.lower(), proc_name.split(".")[-1] if "." in proc_name else proc_name)

# ─────────────────────────────────────────────────────────────────────────────
# Domain extraction from window title
# ─────────────────────────────────────────────────────────────────────────────

def extract_domain_from_title(title: str) -> str:
    title_lower = title.lower()
    if "github" in title_lower:
        return "github.com"
    elif "stack overflow" in title_lower or "stackoverflow" in title_lower:
        return "stackoverflow.com"
    elif "youtube" in title_lower:
        return "youtube.com"
    elif "gmail" in title_lower or "google mail" in title_lower:
        return "gmail.com"
    elif "google search" in title_lower or "google.com" in title_lower:
        return "google.com"
    elif "chatgpt" in title_lower or "openai" in title_lower:
        return "chatgpt.com"
    elif "linkedin" in title_lower:
        return "linkedin.com"
    elif "facebook" in title_lower:
        return "facebook.com"
    elif "whatsapp" in title_lower:
        return "web.whatsapp.com"

    domain_match = re.search(r'([a-zA-Z0-9-]+\.[a-zA-Z]{2,6})', title)
    if domain_match:
        return domain_match.group(1).lower()

    return "other-browsing"

def is_url_matched_in_title(rule_url: str, title: str) -> bool:
    rule_url = rule_url.lower().strip()
    if not rule_url:
        return False

    clean_url = rule_url
    if clean_url.startswith("https://"):
        clean_url = clean_url[8:]
    elif clean_url.startswith("http://"):
        clean_url = clean_url[7:]

    if clean_url.startswith("www."):
        clean_url = clean_url[4:]

    clean_host = clean_url.split("/")[0]

    title_domain = extract_domain_from_title(title)
    if title_domain and title_domain != "other-browsing":
        if clean_host == title_domain or title_domain in clean_host or clean_host in title_domain:
            return True

    title_lower = title.lower()
    for suffix in [" - google chrome", " - microsoft edge", " - mozilla firefox", " - brave", " - safari"]:
        if title_lower.endswith(suffix):
            title_lower = title_lower[:-len(suffix)]
    title_lower = title_lower.strip()

    if clean_host in title_lower:
        return True

    parts = clean_host.split(".")
    for part in parts:
        if len(part) > 2 and part not in ("com", "org", "net", "edu", "gov", "co", "mil", "info", "io", "www"):
            if part in title_lower:
                return True

    if clean_url in title_lower:
        return True

    return False

# ─────────────────────────────────────────────────────────────────────────────
# Block app name matching — cross-platform
# ─────────────────────────────────────────────────────────────────────────────

def is_app_blocked(proc_name: str, block_apps: list) -> bool:
    """Match proc_name against the block list, handling both Windows exe and macOS bundle ID."""
    if not proc_name or not block_apps:
        return False
    pn = proc_name.lower()
    friendly = get_friendly_proc_name(pn)
    for blocked in block_apps:
        b = blocked.lower().strip()
        if not b:
            continue
        # Match by exact proc_name, friendly name, or partial bundle ID
        if b == pn or b == friendly or b in pn or pn in b:
            return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
# Restrictions monitor thread
# ─────────────────────────────────────────────────────────────────────────────

def _run_restrictions_monitor():
    global _active_employee_id, _active_user_is_admin, _db, _main_loop
    hostname = socket.gethostname()

    last_db_check = 0
    rule = None

    while not _stop_event.is_set():
        time.sleep(1)

        with _state_lock:
            employee_id = _active_employee_id

        now = time.time()
        if now - last_db_check > 5:
            last_db_check = now
            if _db and _main_loop:
                try:
                    future = asyncio.run_coroutine_threadsafe(
                        _db.registered_pcs.find_one({"hostname": hostname}),
                        _main_loop
                    )
                    rule = future.result(timeout=5)
                except Exception:
                    pass

        if not rule:
            continue

        try:
            title, proc_name, pid = get_active_window_info()
        except Exception:
            continue

        if not proc_name:
            continue

        block_chrome = rule.get("blockChrome", False)
        block_apps = [a.lower() for a in rule.get("blockApps", []) if a.strip()]

        # Block Chrome
        if block_chrome and is_chrome_process(proc_name):
            kill_process(pid)
            continue

        # Block custom apps
        if is_app_blocked(proc_name, block_apps):
            kill_process(pid)
            continue

        # Block URLs/YouTube in browsers
        block_youtube = rule.get("blockYoutube", False)
        block_urls = rule.get("blockUrls", [])

        if is_browser_process(proc_name) and title:
            should_block_tab = False

            if block_youtube and is_url_matched_in_title("youtube.com", title):
                should_block_tab = True

            if not should_block_tab:
                for url_kw in block_urls:
                    if is_url_matched_in_title(url_kw, title):
                        should_block_tab = True
                        break

            if should_block_tab:
                close_active_tab()

# ─────────────────────────────────────────────────────────────────────────────
# Active app monitor thread
# ─────────────────────────────────────────────────────────────────────────────

def _run_active_app_monitor():
    global _active_employee_id

    while not _stop_event.is_set():
        time.sleep(1)

        with _state_lock:
            employee_id = _active_employee_id

        if not employee_id:
            continue

        try:
            title, proc_name, _ = get_active_window_info()
        except Exception:
            continue

        if not proc_name:
            continue

        # Use friendly name for storage (important for macOS bundle IDs)
        friendly_name = get_friendly_proc_name(proc_name) if PLATFORM == "Darwin" else proc_name

        with _state_lock:
            _app_durations[friendly_name] = _app_durations.get(friendly_name, 0) + 1

            if is_browser_process(proc_name) and title:
                domain = extract_domain_from_title(title)
                _domain_durations[domain] = _domain_durations.get(domain, 0) + 1

# ─────────────────────────────────────────────────────────────────────────────
# DB sync thread
# ─────────────────────────────────────────────────────────────────────────────

def _run_db_sync():
    global _clicks, _keystrokes, _app_durations, _domain_durations, _active_employee_id, _db, _main_loop

    while not _stop_event.is_set():
        time.sleep(30)

        with _state_lock:
            current_clicks = _clicks
            current_keys = _keystrokes
            employee_id = _active_employee_id
            apps_to_flush = dict(_app_durations)
            domains_to_flush = dict(_domain_durations)

            if employee_id and (current_clicks > 0 or current_keys > 0 or apps_to_flush or domains_to_flush):
                _clicks = 0
                _keystrokes = 0
                _app_durations.clear()
                _domain_durations.clear()
            else:
                continue

        if _db and employee_id and _main_loop:
            try:
                future = asyncio.run_coroutine_threadsafe(
                    _sync_to_db(employee_id, current_clicks, current_keys, apps_to_flush, domains_to_flush),
                    _main_loop
                )
                future.result(timeout=10)
            except Exception as e:
                print(f"Error syncing input & app activity to DB: {e}", flush=True)

async def _sync_to_db(employee_id, clicks, keystrokes, applications=None, domains=None):
    global _db
    try:
        employee = None
        if ObjectId.is_valid(employee_id):
            employee = await _db.employees.find_one({"_id": ObjectId(employee_id)})
        if not employee:
            employee = await _db.employees.find_one({"_id": employee_id})
        if not employee:
            employee = await _db.employees.find_one({"employeeId": employee_id})

        employee_name = "Unknown Employee"
        if employee:
            employee_name = (
                employee.get("name")
                or f"{employee.get('firstName', '')} {employee.get('lastName', '')}".strip()
                or "Unnamed"
            )

        today_str = get_now().strftime("%Y-%m-%d")

        inc_updates = {
            "clicks": clicks,
            "keystrokes": keystrokes
        }

        if applications:
            for app, seconds in applications.items():
                safe_app = app.replace(".", "_")
                inc_updates[f"applications.{safe_app}"] = seconds

        if domains:
            for domain, seconds in domains.items():
                safe_domain = domain.replace(".", "_")
                inc_updates[f"domains.{safe_domain}"] = seconds

        await _db.user_input_stats.update_one(
            {"employeeId": employee_id, "date": today_str},
            {
                "$set": {
                    "employeeName": employee_name,
                    "lastActive": get_now()
                },
                "$inc": inc_updates
            },
            upsert=True
        )
        print(
            f"[Tracker] Sync: {clicks} clicks, {keystrokes} keys, "
            f"apps={len(applications or {})}, domains={len(domains or {})} for {employee_name}",
            flush=True
        )
    except Exception as e:
        print(f"[Tracker] DB sync failed: {e}", flush=True)

# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def start_tracker(db_instance):
    global _db, _tracker_thread, _sync_thread, _restrictions_thread, _app_monitor_thread, _stop_event, _main_loop
    _db = db_instance
    _stop_event.clear()

    try:
        _main_loop = asyncio.get_running_loop()
    except RuntimeError:
        _main_loop = asyncio.get_event_loop()

    _tracker_thread = threading.Thread(target=_run_listener, daemon=True)
    _tracker_thread.start()

    _sync_thread = threading.Thread(target=_run_db_sync, daemon=True)
    _sync_thread.start()

    _restrictions_thread = threading.Thread(target=_run_restrictions_monitor, daemon=True)
    _restrictions_thread.start()

    _app_monitor_thread = threading.Thread(target=_run_active_app_monitor, daemon=True)
    _app_monitor_thread.start()

    # macOS ONLY: Start permission tamper detector
    if PLATFORM == "Darwin":
        _permission_monitor_thread = threading.Thread(target=_run_permission_monitor, daemon=True)
        _permission_monitor_thread.start()
        # Check permission immediately at startup
        if not check_macos_accessibility_permission():
            print("[Tracker Security] ⚠️  Accessibility permission NOT granted at startup!", flush=True)
            _open_macos_accessibility_settings()
        else:
            print("[Tracker Security] ✅ macOS Accessibility permission verified.", flush=True)

    print(f"[Tracker] Global input and restrictions tracker started. Platform: {PLATFORM}", flush=True)

def stop_tracker():
    global _stop_event
    _stop_event.set()

async def set_active_user(employee_id: str):
    global _active_employee_id, _active_user_is_admin, _db
    with _state_lock:
        _active_employee_id = employee_id

    if _db and employee_id:
        try:
            user_doc = await _db.employees.find_one(
                {"_id": ObjectId(employee_id)} if ObjectId.is_valid(employee_id) else {"_id": employee_id}
            )
            print(f"[Tracker] User doc in tracker: {user_doc}", flush=True)
            with _state_lock:
                if user_doc and str(user_doc.get("role", "")).lower() == "admin":
                    _active_user_is_admin = True
                else:
                    _active_user_is_admin = False
        except Exception as e:
            print(f"[Tracker] Error fetching user role: {e}", flush=True)
            with _state_lock:
                _active_user_is_admin = False
    else:
        with _state_lock:
            _active_user_is_admin = False

    print(f"[Tracker] Active employee set to: {employee_id} (isAdmin={_active_user_is_admin})", flush=True)

def clear_active_user():
    global _active_employee_id, _active_user_is_admin
    with _state_lock:
        _active_employee_id = None
        _active_user_is_admin = False
    print("[Tracker] Active employee cleared.", flush=True)
