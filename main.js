const { app, BrowserWindow, Menu, Tray } = require('electron');
app.setAppUserModelId("com.hrms.app");
const path = require('path');
const { spawn, fork } = require('child_process');
const fs = require('fs');
const net = require('net');

function checkPort(port) {
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
    server.listen(port, '127.0.0.1');
  });
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
const HOST = process.env.APP_HOST || '127.0.0.1';

// Will be determined dynamically on app ready
let frontendUrl = `http://127.0.0.1:${FRONTEND_PORT}`;
const isRemoteHost = false;

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
    const iconPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'frontend', 'public', 'icon-light-32x32.png')
      : path.join(__dirname, 'frontend', 'public', 'icon-light-32x32.png');
      
    const finalIconPath = fs.existsSync(iconPath) ? iconPath : undefined;
    log(`Initializing system tray with icon: ${finalIconPath || 'default fallback'}`);

    tray = new Tray(finalIconPath || path.join(__dirname, 'main.js'));
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
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const { ipcMain, Notification } = require('electron');
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
      let iconPath = undefined;
      if (options && options.icon) {
        iconPath = isPackaged
          ? path.join(process.resourcesPath, 'app', 'frontend', 'public', options.icon.replace(/^\//, ''))
          : path.join(__dirname, 'frontend', 'public', options.icon.replace(/^\//, ''));
      }
      
      const notif = new Notification({
        title: title,
        body: options?.body || '',
        icon: iconPath
      });
      notif.show();
      
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
    log(`[Update] Requested download from: ${downloadUrl}`);
    const http = require('http');
    const https = require('https');
    
    // Resolve absolute URL if downloadUrl is relative
    let absoluteUrl = downloadUrl;
    if (downloadUrl.startsWith('/')) {
      const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
      absoluteUrl = backendUrl + downloadUrl;
    }
    
    const tempPath = path.join(app.getPath('temp'), `HRMS_Setup_Update_${Date.now()}.exe`);
    
    try {
      await new Promise((resolve, reject) => {
        function downloadFile(url, dest) {
          const protocol = url.startsWith('https') ? https : http;
          const file = fs.createWriteStream(dest);
          
          protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
              // Follow redirect
              file.close();
              fs.unlink(dest, () => {});
              downloadFile(response.headers.location, dest);
              return;
            }
            
            if (response.statusCode !== 200) {
              file.close();
              fs.unlink(dest, () => {});
              reject(new Error(`Failed to download: Server returned ${response.statusCode}`));
              return;
            }
            
            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;
            
            response.on('data', (chunk) => {
              downloadedSize += chunk.length;
              file.write(chunk);
              
              if (totalSize > 0) {
                const progress = Math.round((downloadedSize / totalSize) * 100);
                if (mainWindow) {
                  mainWindow.webContents.send('update-progress', progress);
                }
              }
            });
            
            response.on('end', () => {
              file.end();
              resolve();
            });
          }).on('error', (err) => {
            file.close();
            fs.unlink(dest, () => {});
            reject(err);
          });
        }
        
        downloadFile(absoluteUrl, tempPath);
      });
      
      log(`[Update] Download complete. Spawning installer: ${tempPath}`);
      
      // Execute the installer in background
      const child = spawn(tempPath, [], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      
      // Close sub-processes and quit app
      killSubprocesses();
      isQuitting = true;
      app.quit();
      
      return { success: true };
    } catch (err) {
      log(`[Update] Error during update execution: ${err.message}`);
      return { success: false, error: err.message };
    }
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
  log(`HRMS desktop app starting. Logging to: ${logPath}`);
  
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
