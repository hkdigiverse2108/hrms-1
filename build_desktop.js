const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';

// Platform-specific names
const PLATFORM_LABEL = IS_WINDOWS ? 'Windows' : IS_MAC ? 'macOS' : 'Linux';
const BACKEND_BINARY_NAME = IS_WINDOWS ? 'backend.exe' : 'backend';

// electron-builder output directories differ by platform
const ELECTRON_UNPACKED_DIR = IS_WINDOWS
  ? path.join(__dirname, 'dist', 'win-unpacked')
  : IS_MAC
    ? path.join(__dirname, 'dist', 'mac')
    : path.join(__dirname, 'dist', 'linux-unpacked');

// Final output directory names
const FINAL_DEST = IS_WINDOWS
  ? path.join(__dirname, 'dist', 'HRMS-desktop')
  : path.join(__dirname, 'dist', 'HRMS-desktop-mac');

function run() {
  console.log(`--- HRMS Desktop App Build (${PLATFORM_LABEL}) ---`);

  // ── Step 0: Generate unpacked shell via electron-builder if missing ───────
  if (!fs.existsSync(ELECTRON_UNPACKED_DIR)) {
    console.log(`${ELECTRON_UNPACKED_DIR} not found. Generating unpacked shell via electron-builder...`);
    try {
      if (IS_WINDOWS) {
        execSync('npx electron-builder --dir --win', { stdio: 'inherit' });
      } else if (IS_MAC) {
        execSync('npx electron-builder --dir --mac', { stdio: 'inherit' });
      } else {
        execSync('npx electron-builder --dir --linux', { stdio: 'inherit' });
      }
    } catch (err) {
      console.warn('Warning: electron-builder completed with errors, checking if shell was generated...');
    }
  }

  if (!fs.existsSync(ELECTRON_UNPACKED_DIR)) {
    console.error(`ERROR: Unpacked shell directory not found at ${ELECTRON_UNPACKED_DIR}`);
    process.exit(1);
  }
  console.log(`[OK] Found unpacked shell: ${ELECTRON_UNPACKED_DIR}`);

  // ── Step 1: Check compiled backend binary ────────────────────────────────
  const backendBinary = path.join(__dirname, 'backend', 'dist', BACKEND_BINARY_NAME);
  if (!fs.existsSync(backendBinary)) {
    console.error(`ERROR: Compiled backend binary not found at ${backendBinary}`);
    console.error('Please build the backend first using: python backend/build_backend.py');
    process.exit(1);
  }
  console.log('[OK] Found compiled backend binary.');

  // ── Step 2: Check Next.js standalone build ───────────────────────────────
  const standaloneServer = path.join(__dirname, 'frontend', '.next', 'standalone', 'frontend', 'server.js');
  if (!fs.existsSync(standaloneServer)) {
    console.error(`ERROR: Next.js standalone server not found at ${standaloneServer}`);
    console.error('Please run npm run build in frontend directory first.');
    process.exit(1);
  }
  console.log('[OK] Found Next.js standalone server.');

  // ── Step 3: Determine resources path (differs: Windows vs macOS) ─────────
  // Windows: <unpacked>/resources/
  // macOS:   <unpacked>/HRMS.app/Contents/Resources/
  let resourcesPath;
  if (IS_MAC) {
    // Find the .app bundle inside the mac output dir
    const appBundles = fs.readdirSync(ELECTRON_UNPACKED_DIR).filter(f => f.endsWith('.app'));
    if (appBundles.length === 0) {
      console.error('ERROR: No .app bundle found in mac output directory.');
      process.exit(1);
    }
    resourcesPath = path.join(ELECTRON_UNPACKED_DIR, appBundles[0], 'Contents', 'Resources');
    console.log(`[OK] macOS app bundle: ${appBundles[0]}`);
  } else {
    resourcesPath = path.join(ELECTRON_UNPACKED_DIR, 'resources');
  }
  console.log(`[OK] Resources path: ${resourcesPath}`);

  // Remove app.asar if it exists
  const asarFile = path.join(resourcesPath, 'app.asar');
  if (fs.existsSync(asarFile)) {
    console.log('Removing app.asar...');
    fs.unlinkSync(asarFile);
  }

  // Create app directory inside resources
  const appDir = path.join(resourcesPath, 'app');
  if (fs.existsSync(appDir)) {
    fs.rmSync(appDir, { recursive: true, force: true });
  }
  fs.mkdirSync(appDir, { recursive: true });

  // ── Step 4: Copy main.js and package.json ────────────────────────────────
  fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(appDir, 'main.js'));

  // ⚠️ SECURITY: Do NOT copy .env.server as plain-text into the dist folder.
  // .env.server contains MongoDB credentials and must NOT be readable by employees.
  // The backend binary (compiled by PyInstaller) has all config baked in via environment
  // variables set at build time, so the plain-text env file is NOT needed in the package.
  // Only copy a STRIPPED env with non-sensitive frontend-only variables.
  const srcEnvServer = path.join(__dirname, '.env.server');
  if (fs.existsSync(srcEnvServer)) {
    const envContent = fs.readFileSync(srcEnvServer, 'utf8');
    // Extract only safe, non-sensitive frontend config (ports, host)
    const safeLines = envContent.split(/\r?\n/).filter(line => {
      const key = line.split('=')[0].trim().toUpperCase();
      // Only allow non-sensitive port/host settings — NEVER credentials
      return [
        'BACKEND_PORT', 'PORT', 'APP_HOST', 'AUTO_START_BACKEND',
        'BACKEND_URL', 'ALLOWED_ORIGINS'
      ].includes(key);
    });
    // Write stripped env (no MongoDB URL, no secret keys, no passwords)
    const strippedEnvPath = path.join(appDir, '.env.server');
    fs.writeFileSync(strippedEnvPath, safeLines.join('\n'), 'utf8');
    console.log('[OK] Wrote stripped .env.server (credentials removed for security).');
    console.log('     MongoDB credentials stay inside compiled backend binary only.');
  }

  // Clean package.json (remove devDependencies and build config)
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  delete pkg.devDependencies;
  delete pkg.build;
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(pkg, null, 2));
  console.log('[OK] Copied main.js, package.json.');

  // ── Step 5: Copy backend + watchdog binaries ─────────────────────────────
  const destBackendDir = path.join(resourcesPath, 'backend');
  if (fs.existsSync(destBackendDir)) {
    fs.rmSync(destBackendDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destBackendDir, { recursive: true });

  // Copy backend binary
  fs.copyFileSync(backendBinary, path.join(destBackendDir, BACKEND_BINARY_NAME));

  // Copy watchdog binary (if exists — auto-restart protection)
  const WATCHDOG_NAME = IS_WINDOWS ? 'watchdog.exe' : 'watchdog';
  const watchdogBinary = path.join(__dirname, 'backend', 'dist', WATCHDOG_NAME);
  if (fs.existsSync(watchdogBinary)) {
    fs.copyFileSync(watchdogBinary, path.join(destBackendDir, WATCHDOG_NAME));
    console.log('[OK] Copied watchdog binary (auto-restart protection).');
  } else {
    console.warn('[WARN] Watchdog binary not found — backend will NOT auto-restart if killed.');
    console.warn(`       Build it with: python backend/build_backend.py`);
  }

  // macOS: ensure executable permissions on both binaries
  if (!IS_WINDOWS) {
    fs.chmodSync(path.join(destBackendDir, BACKEND_BINARY_NAME), 0o755);
    if (fs.existsSync(path.join(destBackendDir, WATCHDOG_NAME))) {
      fs.chmodSync(path.join(destBackendDir, WATCHDOG_NAME), 0o755);
    }
    console.log('[OK] Set executable permissions on backend binaries.');
  }
  console.log(`[OK] Copied backend binary as ${BACKEND_BINARY_NAME}.`);


  // ── Step 6: Copy Next.js standalone + static + public ───────────────────
  const destAppFrontend = path.join(appDir, 'frontend');
  fs.mkdirSync(destAppFrontend, { recursive: true });

  const srcStandalone = path.join(__dirname, 'frontend', '.next', 'standalone');
  const srcStatic = path.join(__dirname, 'frontend', '.next', 'static');
  const srcPublic = path.join(__dirname, 'frontend', 'public');

  const destStandalone = path.join(destAppFrontend, '.next', 'standalone');
  fs.mkdirSync(destStandalone, { recursive: true });
  console.log('Copying Next.js standalone server...');
  fs.cpSync(srcStandalone, destStandalone, { recursive: true });

  // Copy static/public assets to both locations for safety
  const targets = [
    {
      static: path.join(destStandalone, '.next', 'static'),
      public: path.join(destStandalone, 'public')
    },
    {
      static: path.join(destStandalone, 'frontend', '.next', 'static'),
      public: path.join(destStandalone, 'frontend', 'public')
    }
  ];

  targets.forEach((t, index) => {
    console.log(`Copying static/public assets to target group ${index + 1}...`);
    fs.mkdirSync(t.static, { recursive: true });
    fs.mkdirSync(t.public, { recursive: true });
    fs.cpSync(srcStatic, t.static, { recursive: true });
    fs.cpSync(srcPublic, t.public, { recursive: true });
  });

  // Ensure uploads folder placeholder exists
  const destUploads = path.join(resourcesPath, 'uploads');
  if (!fs.existsSync(destUploads)) {
    fs.mkdirSync(destUploads, { recursive: true });
  }

  // ── Step 7: Rename/move unpacked dir to final destination ────────────────
  if (fs.existsSync(FINAL_DEST)) {
    fs.rmSync(FINAL_DEST, { recursive: true, force: true });
  }

  console.log('Renaming output directory...');
  fs.renameSync(ELECTRON_UNPACKED_DIR, FINAL_DEST);

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log('\n==================================================');
  console.log('[SUCCESS] Packaging complete!');
  if (IS_WINDOWS) {
    console.log(`Your executable application is at: ${FINAL_DEST}\\HRMS.exe`);
    console.log('Share the entire "HRMS-desktop" folder with Windows employees.');
  } else if (IS_MAC) {
    console.log(`Your application bundle is at: ${FINAL_DEST}/`);
    console.log('Share the entire "HRMS-desktop-mac" folder with macOS employees.');
    console.log('Employees: double-click HRMS.app inside the folder to launch.');
  }
  console.log('==================================================');
}

run();
