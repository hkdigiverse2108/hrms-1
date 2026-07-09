const { app, BrowserWindow, Menu, Tray } = require('electron');
app.setAppUserModelId("com.hrms.app");
const path = require('path');
const { spawn, fork, spawnSync } = require('child_process');
const fs = require('fs');
const net = require('net');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on('second-instance', () => {
  log('Second HRMS instance requested. Focusing existing window instead of starting another backend/frontend.');
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }
});

function checkPortOnHost(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

async function checkPort(port) {
  const hostsToCheck = ['127.0.0.1', '0.0.0.0'];
  for (const host of hostsToCheck) {
    const isFree = await checkPortOnHost(port, host);
    if (!isFree) {
      return false;
    }
  }
  return true;
}

async function findFreePort(startPort) {
  let port = startPort;
  for (let i = 0; i < 100; i++) {
    const isFree = await checkPort(port);
    if (isFree) {
      return port;
    }
    port++;
  }
  return startPort;
}

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;
let tray = null;
let isQuitting = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function spawnDetachedWithRetry(exePath, args = [], attempts = 6) {
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const child = await new Promise((resolve, reject) => {
        const spawned = spawn(exePath, args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        });

        spawned.once('spawn', () => resolve(spawned));
        spawned.once('error', reject);
      });

      child.unref();
      return;
    } catch (err) {
      lastError = err;
      const shouldRetry = process.platform === 'win32' && ['EBUSY', 'EPERM', 'EACCES'].includes(err.code);
      if (!shouldRetry || attempt === attempts) {
        throw err;
      }
      log(`[Update] Installer was busy (${err.code}). Retrying launch ${attempt}/${attempts}...`);
      await wait(750);
    }
  }

  throw lastError;
}

let isUpdateInProgress = false;

// Downloads an installer .exe and runs it silently (NSIS /S), then quits the app.
// Shared by the manual "start-update" IPC handler and the automatic background checker.
async function performSilentInstall(downloadUrl) {
  if (isUpdateInProgress) {
    log(`[Update] An update is already in progress. Hooking into existing progress.`);
    return { success: true };
  }
  isUpdateInProgress = true;
  log(`[Update] Starting silent install from: ${downloadUrl}`);
  const http = require('http');
  const https = require('https');

  let absoluteUrl = downloadUrl;
  if (downloadUrl.startsWith('/')) {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    if (backendUrl.endsWith('/api') && downloadUrl.startsWith('/api/')) {
      absoluteUrl = backendUrl.slice(0, -4) + downloadUrl;
    } else {
      absoluteUrl = backendUrl + downloadUrl;
    }
  }

  const tempPath = path.join(app.getPath('temp'), `HRMS_Setup_Update_${Date.now()}.exe`);

  try {
    await new Promise((resolve, reject) => {
      function downloadFile(url, dest) {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        let settled = false;

        const fail = (err) => {
          if (settled) return;
          settled = true;
          file.destroy();
          fs.unlink(dest, () => {});
          reject(err);
        };

        protocol.get(url, (response) => {
          if (response.statusCode === 301 || response.statusCode === 302) {
            settled = true;
            response.resume();
            file.destroy();
            fs.unlink(dest, () => {});
            const redirectUrl = new URL(response.headers.location, url).toString();
            downloadFile(redirectUrl, dest);
            return;
          }

          if (response.statusCode !== 200) {
            response.resume();
            fail(new Error(`Failed to download: Server returned ${response.statusCode}`));
            return;
          }

          const totalSize = parseInt(response.headers['content-length'], 10);
          let downloadedSize = 0;
          let lastSentProgress = -1;

          response.on('data', (chunk) => {
            downloadedSize += chunk.length;
            if (totalSize > 0 && !isNaN(totalSize)) {
              const progress = Math.round((downloadedSize / totalSize) * 100);
              if (progress !== lastSentProgress) {
                lastSentProgress = progress;
                if (mainWindow) {
                  mainWindow.webContents.send('update-progress', progress);
                }
              }
            } else {
              // Indeterminate progress when content-length is missing
              if (lastSentProgress !== -1) {
                lastSentProgress = -1;
                if (mainWindow) {
                  mainWindow.webContents.send('update-progress', -1);
                }
              }
            }
          });
          response.on('error', fail);

          file.on('finish', () => {
            if (settled) return;
            settled = true;
            file.close((err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          });
          file.on('error', fail);
          response.pipe(file);
        }).on('error', fail);
      }

      downloadFile(absoluteUrl, tempPath);
    });

    log(`[Update] Download complete. Spawning installer silently: ${tempPath}`);

    // Give the user a brief, non-blocking heads-up before the app restarts.
    // This does NOT wait for any click — it just avoids the app vanishing with zero warning.
    try {
      if (tray && process.platform === 'win32') {
        tray.displayBalloon({
          title: 'HRMS is updating',
          content: 'A new version was found. Installing now in the background — the app will restart shortly.'
        });
      }
    } catch (e) {
      // Balloon notifications are best-effort only.
    }

    // /S = fully silent NSIS install, no UI, no prompts.
    await spawnDetachedWithRetry(tempPath, ['/S']);

    // Kill subprocesses and exit immediately so the installer can overwrite files without locks.
    killSubprocesses();
    isQuitting = true;
    app.quit();

    return { success: true };
  } catch (err) {
    log(`[Update] Error during silent install: ${err.message}`);
    isUpdateInProgress = false;
    return { success: false, error: err.message };
  }
}

function fetchJson(url) {
  const http = require('http');
  const https = require('https');
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Request failed: ${response.statusCode}`));
        return;
      }
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(err);
        }
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

function isNewerVersion(remote, local) {
  const r = String(remote).split('.').map(Number);
  const l = String(local).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

let isAutoUpdating = false;

// Checks the server for a newer release and, if found, downloads and installs it
// silently in the background — no modal, no click required from the employee.
async function checkForUpdatesInBackground() {
  if (isAutoUpdating) return;
  if (!app.isPackaged) {
    // Don't try to self-update a dev build running from source.
    return;
  }

  try {
    const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
    const data = await fetchJson(`${backendUrl}/desktop/version`);
    const remoteVersion = data && data.version;
    const localVersion = app.getVersion();

    if (remoteVersion && data.downloadUrl && isNewerVersion(remoteVersion, localVersion)) {
      log(`[Auto-Update] New version found: ${remoteVersion} (current: ${localVersion}). Installing silently...`);
      isAutoUpdating = true;
      await performSilentInstall(data.downloadUrl);
      // If performSilentInstall succeeded, the app has already quit by this point.
      isAutoUpdating = false;
    }
  } catch (err) {
    log(`[Auto-Update] Background update check failed: ${err.message}`);
    isAutoUpdating = false;
  }
}

// Log file for diagnosing issues in packaged app
const logPath = path.join(app.getPath('userData'), 'hrms-desktop.log');
function log(message) {
  const time = new Date().toISOString();
  const msg = `[${time}] ${message}\n`;
  console.log(msg);
  try {
    fs.appendFileSync(logPath, msg);
  } catch (e) {}
}

// Simple parser to load environment variables from .env.server or .env
function loadEnv() {
  const envFiles = ['.env.server', '.env'];
  let loaded = false;
  for (const file of envFiles) {
    // Check in app root (development) or resources directory (packaged)
    const pathsToCheck = [
      path.join(__dirname, file),
      path.join(process.resourcesPath, 'app', file)
    ];
    
    for (const envPath of pathsToCheck) {
      if (fs.existsSync(envPath)) {
        log(`Loading environment variables from: ${envPath}`);
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          content.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
              const parts = line.split('=');
              const key = parts[0].trim();
              const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
              if (key && !(key in process.env)) {
                process.env[key] = value;
              }
            }
          });
          loaded = true;
        } catch (err) {
          log(`Error reading env file ${envPath}: ${err.message}`);
        }
        break;
      }
    }
    if (loaded) break;
  }
}

// Load env variables before setting up ports and URLs
loadEnv();

function patchNextjsConfig() {
  const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  log(`Patching Next.js configuration to use backend URL: ${backendUrl}`);
  
  const filesToPatch = [];
  const isPackaged = app.isPackaged;
  
  if (isPackaged) {
    const standaloneDir = path.join(process.resourcesPath, 'app', 'frontend', '.next', 'standalone', 'frontend', '.next');
    filesToPatch.push(
      path.join(standaloneDir, 'routes-manifest.json'),
      path.join(standaloneDir, 'required-server-files.json')
    );
  } else {
    const devDir = path.join(__dirname, 'frontend', '.next');
    filesToPatch.push(
      path.join(devDir, 'routes-manifest.json'),
      path.join(devDir, 'required-server-files.json')
    );
  }
  
  for (const filePath of filesToPatch) {
    if (fs.existsSync(filePath)) {
      try {
        log(`Reading configuration file for patching: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let modified = false;
        
        // Patch routes-manifest.json
        if (data.rewrites && Array.isArray(data.rewrites.beforeFiles)) {
          data.rewrites.beforeFiles.forEach(rewrite => {
            if (rewrite.source === '/api/:path*') {
              log(`Updating routes-manifest destination from "${rewrite.destination}" to "${backendUrl}/:path*"`);
              rewrite.destination = `${backendUrl}/:path*`;
              modified = true;
            } else if (
              rewrite.source.startsWith('/api/activity/session-') ||
              rewrite.source === '/api/system/info' ||
              rewrite.source === '/api/chat/ws-info'
            ) {
              const suffix = rewrite.source.replace('/api/', '');
              const localDest = `http://127.0.0.1:${BACKEND_PORT}/${suffix}`;
              log(`Updating routes-manifest local tracker/info destination from "${rewrite.destination}" to "${localDest}"`);
              rewrite.destination = localDest;
              modified = true;
            }
          });
        }
        
        // Patch required-server-files.json
        if (data.config && data.config._originalRewrites && Array.isArray(data.config._originalRewrites.beforeFiles)) {
          data.config._originalRewrites.beforeFiles.forEach(rewrite => {
            if (rewrite.source === '/api/:path*') {
              log(`Updating required-server-files original rewrite from "${rewrite.destination}" to "${backendUrl}/:path*"`);
              rewrite.destination = `${backendUrl}/:path*`;
              modified = true;
            } else if (
              rewrite.source.startsWith('/api/activity/session-') ||
              rewrite.source === '/api/system/info' ||
              rewrite.source === '/api/chat/ws-info'
            ) {
              const suffix = rewrite.source.replace('/api/', '');
              const localDest = `http://127.0.0.1:${BACKEND_PORT}/${suffix}`;
              log(`Updating required-server-files local tracker/info original rewrite from "${rewrite.destination}" to "${localDest}"`);
              rewrite.destination = localDest;
              modified = true;
            }
          });
        }
        
        if (modified) {
          try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            log(`Successfully patched: ${filePath}`);
          } catch (writeErr) {
            log(`Warning: Failed to write patched config to ${filePath} (${writeErr.message}). Next.js will use existing values.`);
          }
        } else {
          log(`No changes needed or matching rewrites found in: ${filePath}`);
        }
      } catch (err) {
        log(`Error patching configuration file ${filePath}: ${err.message}`);
      }
    } else {
      log(`Configuration file not found, skipping: ${filePath}`);
    }
  }
}

let BACKEND_PORT = '8000';
let FRONTEND_PORT = '3535';
const HOST = '127.0.0.1';

// Will be determined dynamically on app ready
let frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
const isRemoteHost = false;

function escapePowerShellSingleQuoted(value) {
  return String(value).replace(/'/g, "''");
}

function stopStalePackagedProcesses() {
  if (!app.isPackaged || process.platform !== 'win32') {
    return;
  }

  const backendDir = path.join(process.resourcesPath, 'backend');
  const frontendDir = path.join(process.resourcesPath, 'app', 'frontend');
  const backendPattern = `${escapePowerShellSingleQuoted(backendDir)}*`;
  const frontendPattern = `*${escapePowerShellSingleQuoted(frontendDir)}*server.js*`;

  const command = `
    $backendPattern = '${backendPattern}';
    $frontendPattern = '${frontendPattern}';
    Get-CimInstance Win32_Process |
      Where-Object {
        (($_.Name -in @('backend.exe', 'watchdog.exe')) -and ($_.ExecutablePath -like $backendPattern)) -or
        (($_.CommandLine -like $frontendPattern) -and ($_.ProcessId -ne ${process.pid}))
      } |
      ForEach-Object {
        try {
          Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop;
          Write-Output "Stopped stale HRMS process $($_.Name) PID=$($_.ProcessId)";
        } catch {
          Write-Output "Failed to stop stale HRMS process PID=$($_.ProcessId): $($_.Exception.Message)";
        }
      }
  `;

  try {
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10000
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
    if (output) {
      log(`[Startup cleanup] ${output}`);
    }
  } catch (err) {
    log(`[Startup cleanup] Failed to clean stale processes: ${err.message}`);
  }
}

function startBackend() {
  const autoStart = process.env.AUTO_START_BACKEND;
  if (autoStart === 'false') {
    log('Skipping backend startup because AUTO_START_BACKEND is set to false.');
    return;
  }

  log('Starting backend process...');
  const isPackaged = app.isPackaged;
  
  // Use watchdog binary to auto-restart backend if killed by employee
  const watchdogName = process.platform === 'win32' ? 'watchdog.exe' : 'watchdog';
  const backendBinaryName = process.platform === 'win32' ? 'backend.exe' : 'backend';

  if (isPackaged) {
    // Prefer watchdog (auto-restart) over direct backend launch
    const watchdogPath = path.join(process.resourcesPath, 'backend', watchdogName);
    const backendExePath = path.join(process.resourcesPath, 'backend', backendBinaryName);

    const launchPath = fs.existsSync(watchdogPath) ? watchdogPath : backendExePath;
    log(`Spawning backend via: ${launchPath}`);

    if (fs.existsSync(launchPath)) {
      backendProcess = spawn(launchPath, [], {
        cwd: app.getPath('userData'),
        env: { ...process.env, PORT: BACKEND_PORT, BACKEND_PORT: BACKEND_PORT }
      });
    } else {
      log(`ERROR: Neither watchdog nor backend binary found in resources/backend/`);
      // Fallback: check local dist folder
      const localWatchdog = path.join(__dirname, 'backend', 'dist', watchdogName);
      const localBackend = path.join(__dirname, 'backend', 'dist', backendBinaryName);
      const localFallback = fs.existsSync(localWatchdog) ? localWatchdog : localBackend;
      if (fs.existsSync(localFallback)) {
        backendProcess = spawn(localFallback, [], {
          cwd: app.getPath('userData'),
          env: { ...process.env, PORT: BACKEND_PORT, BACKEND_PORT: BACKEND_PORT }
        });
      }
    }
  } else {
    // In development, run python from the venv
    const pythonExe = process.platform === 'win32'
      ? path.join(__dirname, 'venv', 'Scripts', 'python.exe')
      : path.join(__dirname, 'venv', 'bin', 'python3');
      
    log(`Spawning dev backend using python: ${pythonExe}`);
    backendProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--host', HOST, '--port', BACKEND_PORT], {
      cwd: path.join(__dirname, 'backend'),
      env: { ...process.env, PYTHONPATH: path.join(__dirname, 'backend'), PORT: BACKEND_PORT, BACKEND_PORT: BACKEND_PORT }
    });
  }

  if (backendProcess) {
    backendProcess.on('error', (err) => {
      log(`ERROR spawning backend process: ${err.message}`);
    });
    backendProcess.stdout.on('data', (data) => {
      log(`[Backend stdout]: ${data.toString().trim()}`);
    });
    backendProcess.stderr.on('data', (data) => {
      log(`[Backend stderr]: ${data.toString().trim()}`);
    });
    backendProcess.on('close', (code) => {
      log(`Backend process exited with code ${code}`);
    });
  }
}

function startFrontend() {
  log('Starting Next.js frontend process...');
  const isPackaged = app.isPackaged;
  
  if (isPackaged) {
    // In production, Next.js is pre-built as a standalone server.
    // We check both the nested project folder structure and root fallback.
    let standaloneServerPath = path.join(
      process.resourcesPath,
      'app',
      'frontend',
      '.next',
      'standalone',
      'frontend',
      'server.js'
    );
    if (!fs.existsSync(standaloneServerPath)) {
      standaloneServerPath = path.join(
        process.resourcesPath,
        'app',
        'frontend',
        '.next',
        'standalone',
        'server.js'
      );
    }
    
    log(`Spawning packaged frontend standalone server: ${standaloneServerPath}`);
    if (fs.existsSync(standaloneServerPath)) {
      // Use fork to run Javascript files inside Electron's Node.js engine
      frontendProcess = fork(standaloneServerPath, [], {
        env: {
          ...process.env,
          NODE_ENV: 'production',
          HOSTNAME: HOST,
          PORT: FRONTEND_PORT
        },
        silent: true
      });
    } else {
      log(`ERROR: Standalone server.js not found at ${standaloneServerPath}`);
    }
  } else {
    // In development, run npm run dev
    log('Spawning dev frontend using npm...');
    frontendProcess = spawn('npm', ['run', 'dev', '--', '-H', HOST, '-p', FRONTEND_PORT], {
      cwd: path.join(__dirname, 'frontend'),
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
  }

  if (frontendProcess) {
    frontendProcess.on('error', (err) => {
      log(`ERROR spawning frontend process: ${err.message}`);
    });
    if (frontendProcess.stdout) {
      frontendProcess.stdout.on('data', (data) => {
        log(`[Frontend stdout]: ${data.toString().trim()}`);
      });
    }
    if (frontendProcess.stderr) {
      frontendProcess.stderr.on('data', (data) => {
        log(`[Frontend stderr]: ${data.toString().trim()}`);
      });
    }
    frontendProcess.on('close', (code) => {
      log(`Frontend process exited with code ${code}`);
    });
  }
}
function setupAutoLaunch() {
  try {
    if (app.isPackaged) {
      log('Setting up auto-launch on startup...');
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ['--hidden']
      });
    }
  } catch (err) {
    log(`Failed to set auto-launch settings: ${err.message}`);
  }
}

function setupTray() {
  try {
    const iconPath = path.join(__dirname, 'frontend', 'public', 'favicon.ico');
    const fallbackPath = path.join(__dirname, 'frontend', 'public', 'icon-light-32x32.png');
    
    let finalIconPath = fs.existsSync(iconPath) ? iconPath : (fs.existsSync(fallbackPath) ? fallbackPath : undefined);
    log(`Initializing system tray with icon: ${finalIconPath || 'none'}`);

    if (!finalIconPath) {
      log('WARNING: No valid tray icon found.');
      return;
    }

    tray = new Tray(finalIconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open HRMS',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('HRMS Application');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    log(`Failed to create system tray: ${err.message}`);
  }
}

function createWindow() {
  const startMinimized = process.argv.includes('--hidden');
  log(`Creating main window. Start minimized: ${startMinimized}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'HRMS Application',
    show: !startMinimized,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false
    }
  });

  mainWindow.on('focus', () => {
    mainWindow.flashFrame(false);
    mainWindow.webContents.send('window-focus-change', true);
  });

  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-focus-change', false);
  });

  mainWindow.on('minimize', () => {
    mainWindow.webContents.send('window-focus-change', false);
  });

  mainWindow.on('restore', () => {
    mainWindow.webContents.send('window-focus-change', true);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      const isFrontend = url.startsWith(frontendUrl);
      if (!isFrontend) {
        const { shell } = require('electron');
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      const isFrontend = url.startsWith(frontendUrl);
      if (!isFrontend) {
        event.preventDefault();
        const { shell } = require('electron');
        shell.openExternal(url);
      }
    }
  });

  const { ipcMain, Notification } = require('electron');
  ipcMain.on('update-badge', (event, count, dataUrl) => {
    log(`Received update-badge event: ${count}`);
    if (mainWindow) {
      if (count === 0 || !dataUrl) {
        mainWindow.setOverlayIcon(null, '');
        mainWindow.setTitle('HRMS Application');
        if (process.platform === 'darwin') {
          app.setBadgeCount(0);
        }
      } else {
        const { nativeImage } = require('electron');
        const img = nativeImage.createFromDataURL(dataUrl);
        mainWindow.setOverlayIcon(img, `${count} unread messages`);
        mainWindow.setTitle(`(${count}) HRMS Application`);
        if (process.platform === 'darwin') {
          app.setBadgeCount(count);
        }
        if (!mainWindow.isFocused()) {
          mainWindow.flashFrame(true);
        }
      }
    }
  });

  ipcMain.on('focus-window', () => {
    log('Received focus-window IPC event. Bringing window to foreground.');
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
      // Force window to foreground by temporarily turning on always-on-top
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setVisibleOnAllWorkspaces(true);
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.setAlwaysOnTop(false);
        }
      }, 300);
    }
  });

  ipcMain.on('show-notification', (event, title, options) => {
    log(`Received show-notification event: ${title} - ${options?.body}`);
    try {
      const isPackaged = app.isPackaged;
      const { nativeImage } = require('electron');
      let iconImage = undefined;
      if (options && options.icon) {
        if (options.icon.startsWith('data:')) {
          iconImage = nativeImage.createFromDataURL(options.icon);
        } else {
          const iconPath = isPackaged
            ? path.join(process.resourcesPath, 'app', 'frontend', 'public', options.icon.replace(/^\//, ''))
            : path.join(__dirname, 'frontend', 'public', options.icon.replace(/^\//, ''));
          iconImage = nativeImage.createFromPath(iconPath);
        }
      }
      
      const notif = new Notification({
        title: title,
        body: options?.body || '',
        icon: iconImage
      });
      notif.show();
      if (mainWindow && !mainWindow.isFocused()) {
        mainWindow.flashFrame(true);
      }
      
      notif.on('click', () => {
        log('Notification clicked, focusing window.');
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
          
          if (options && options.clickUrl) {
            log(`Navigating to URL: ${options.clickUrl}`);
            mainWindow.webContents.send('navigate-to-url', options.clickUrl);
          }
        }
      });
    } catch (err) {
      log(`Error displaying notification: ${err.message}`);
    }
  });

  ipcMain.on('open-external', (event, url) => {
    if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
      const { shell } = require('electron');
      shell.openExternal(url);
      log(`Opened external URL: ${url}`);
    }
  });

  const openFile = async (destPath) => {
    const isPdf = destPath.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      const { exec } = require('child_process');
      log(`Opening PDF in Chrome: ${destPath}`);
      return new Promise((resolve) => {
        exec(`start chrome "${destPath}"`, (error) => {
          if (error) {
            log(`Failed to open PDF in Chrome: ${error.message}. Falling back to default shell open.`);
            const { shell } = require('electron');
            shell.openPath(destPath).then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        });
      });
    } else {
      const { shell } = require('electron');
      await shell.openPath(destPath);
    }
  };

  ipcMain.handle('download-and-open', async (event, { url, filename }) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const http = require('http');
      const https = require('https');

      const cleanFilename = filename.replace(/^[a-f0-9]+_/, "");
      const destDir = path.join(app.getPath('userData'), 'transfers');
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, cleanFilename);

      if (fs.existsSync(destPath)) {
        log(`File already exists locally at: ${destPath}. Opening directly.`);
        await openFile(destPath);
        return { success: true, path: destPath };
      }

      log(`Downloading file from ${url} to ${destPath}`);
      const file = fs.createWriteStream(destPath);
      const encodedUrl = encodeURI(url);
      const client = encodedUrl.startsWith('https') ? https : http;

      return new Promise((resolve, reject) => {
        client.get(encodedUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
            return;
          }
          response.pipe(file);
          file.on('finish', () => {
            file.close(async () => {
              log(`Download complete: ${destPath}. Opening.`);
              try {
                await openFile(destPath);
                resolve({ success: true, path: destPath });
              } catch (openErr) {
                reject(openErr);
              }
            });
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      });
    } catch (err) {
      log(`Error in download-and-open: ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-and-open', async (event, { filename, arrayBuffer }) => {
    try {
      const fs = require('fs');
      const path = require('path');

      const hash = filename.match(/^[a-f0-9]+/)?.[0] || "default";
      const cleanFilename = filename.replace(/^[a-f0-9]+_/, "");
      const destDir = path.join(app.getPath('userData'), 'transfers', hash);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, cleanFilename);

      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        log(`File already exists locally at: ${destPath}. Opening directly.`);
        await openFile(destPath);
        return { success: true, path: destPath };
      }

      log(`Saving file buffer to ${destPath}`);
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      log(`Save complete: ${destPath}. Opening.`);
      await openFile(destPath);
      return { success: true, path: destPath };
    } catch (err) {
      log(`Error in save-and-open: ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('save-file', async (event, { filename, arrayBuffer }) => {
    try {
      const fs = require('fs');
      const { dialog } = require('electron');
      const path = require('path');
      
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: path.join(app.getPath('downloads'), filename.replace(/^[a-f0-9]+_/, "")),
        title: 'Save File'
      });
      
      if (filePath) {
        fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
        log(`File saved successfully to: ${filePath}`);
        return { success: true, path: filePath };
      }
      return { success: false, cancelled: true };
    } catch (err) {
      log(`Error in save-file: ${err.message}`);
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('save-session', (event, sessionData) => {
    try {
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf8');
      log('Session saved to session.json');
    } catch (err) {
      log(`Failed to save session: ${err.message}`);
    }
  });

  ipcMain.on('clear-session', () => {
    try {
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
        log('Session cleared from session.json');
      }
    } catch (err) {
      log(`Failed to clear session: ${err.message}`);
    }
  });

  ipcMain.handle('get-session', async () => {
    try {
      const sessionPath = path.join(app.getPath('userData'), 'session.json');
      if (fs.existsSync(sessionPath)) {
        const data = fs.readFileSync(sessionPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      log(`Failed to read session: ${err.message}`);
    }
    return null;
  });

  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('start-update', async (event, downloadUrl) => {
    // Manual "Update Now" click from the renderer reuses the same silent-install logic
    // that the automatic background checker uses.
    return performSilentInstall(downloadUrl);
  });

  // Load the resolved frontend URL
  log(`Loading URL: ${frontendUrl}`);

  // Polling helper to wait until the Next.js server starts listening
  let retries = 0;
  const maxRetries = 150; // 150 retries * 150ms = 22.5 seconds max wait time
  
  function loadPage() {
    mainWindow.loadURL(frontendUrl).catch(() => {
      retries++;
      if (retries < maxRetries) {
        log(`Page load failed. Next.js might still be booting, retrying in 150ms (${retries}/${maxRetries})...`);
        setTimeout(loadPage, 150);
      } else {
        log('ERROR: Next.js server failed to respond in time.');
      }
    });
  }

  // Load immediately without any artificial timeout delay!
  loadPage();

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      log('Window hidden to tray.');
      return false;
    }
    log('Window closing permanently.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure clean process termination
function killSubprocesses() {
  log('Cleaning up background processes...');
  if (backendProcess) {
    log('Killing backend process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', backendProcess.pid]);
    } else {
      backendProcess.kill('SIGINT');
    }
    backendProcess = null;
  }
  if (frontendProcess) {
    log('Killing frontend process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', frontendProcess.pid]);
    } else {
      frontendProcess.kill('SIGINT');
    }
    frontendProcess = null;
  }
}

app.on('ready', async () => {
  if (!gotSingleInstanceLock) {
    return;
  }

  log(`HRMS desktop app starting. Logging to: ${logPath}`);
  stopStalePackagedProcesses();
  
  // Resolve free ports dynamically
  try {
    const startBackendPort = parseInt(process.env.BACKEND_PORT || '8000', 10);
    const resolvedBackend = await findFreePort(startBackendPort);
    BACKEND_PORT = resolvedBackend.toString();
    log(`Resolved free backend port: ${BACKEND_PORT}`);
  } catch (err) {
    log(`Error resolving backend port: ${err.message}. Using default 8000.`);
    BACKEND_PORT = '8000';
  }
  
  try {
    const startFrontendPort = parseInt(process.env.PORT || '3535', 10);
    const resolvedFrontend = await findFreePort(startFrontendPort);
    FRONTEND_PORT = resolvedFrontend.toString();
    log(`Resolved free frontend port: ${FRONTEND_PORT}`);
  } catch (err) {
    log(`Error resolving frontend port: ${err.message}. Using default 3535.`);
    FRONTEND_PORT = '3535';
  }
  
  frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
  log(`Resolved ports - Frontend: ${FRONTEND_PORT}, Backend: ${BACKEND_PORT}`);
  log(`Target Desktop Application URL: ${frontendUrl}`);
  
  // Patch routing configurations after ports are resolved
  patchNextjsConfig();
  
  if (!isRemoteHost) {
    startBackend();
    startFrontend();
  } else {
    log('Skipping local backend/frontend startup because a remote host is targeted.');
  }
  setupTray();
  setupAutoLaunch();
  createWindow();

  // Background silent auto-update: first check shortly after startup (let the app
  // finish booting first), then keep checking periodically. No UI prompt involved —
  // a newer release on the server is downloaded and installed silently via NSIS /S.
  setTimeout(() => {
    checkForUpdatesInBackground();
  }, 20000); // 20s after startup

  setInterval(() => {
    checkForUpdatesInBackground();
  }, 30 * 60 * 1000); // then every 30 minutes
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    killSubprocesses();
    app.quit();
  }
});

app.on('quit', () => {
  killSubprocesses();
});