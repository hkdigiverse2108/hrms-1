const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IS_WINDOWS = process.platform === 'win32';

function run() {
  console.log('--- HRMS Desktop Installer Build ---');

  if (!IS_WINDOWS) {
    console.error('ERROR: Windows installer can only be built on a Windows machine.');
    process.exit(1);
  }

  // ── Step 1: Verify backend and watchdog binaries ───────────────────────────
  const backendBinary = path.join(__dirname, 'backend', 'dist', 'backend.exe');
  const watchdogBinary = path.join(__dirname, 'backend', 'dist', 'watchdog.exe');

  if (!fs.existsSync(backendBinary)) {
    console.error(`ERROR: Compiled backend binary not found at ${backendBinary}`);
    console.error('Please build the backend first using: python backend/build_backend.py');
    process.exit(1);
  }
  if (!fs.existsSync(watchdogBinary)) {
    console.error(`ERROR: Compiled watchdog binary not found at ${watchdogBinary}`);
    console.error('Please build the backend first using: python backend/build_backend.py');
    process.exit(1);
  }
  console.log('[OK] Found compiled backend and watchdog binaries.');

  // ── Step 2: Verify Next.js standalone build ───────────────────────────────
  const standaloneServer = path.join(__dirname, 'frontend', '.next', 'standalone', 'frontend', 'server.js');
  if (!fs.existsSync(standaloneServer)) {
    console.error(`ERROR: Next.js standalone server not found at ${standaloneServer}`);
    console.error('Please run npm run build in frontend directory first.');
    process.exit(1);
  }
  console.log('[OK] Found Next.js standalone server.');

  // ── Step 3: Handle .env.server securely ────────────────────────────────────
  const srcEnvServer = path.join(__dirname, '.env.server');
  const backupEnvServer = path.join(__dirname, '.env.server.bak');
  let hasBackup = false;

  try {
    if (fs.existsSync(srcEnvServer)) {
      console.log('Backing up original .env.server...');
      fs.copyFileSync(srcEnvServer, backupEnvServer);
      hasBackup = true;

      console.log('Generating stripped .env.server for packaging...');
      const envContent = fs.readFileSync(srcEnvServer, 'utf8');
      const safeLines = envContent.split(/\r?\n/).filter(line => {
        const key = line.split('=')[0].trim().toUpperCase();
        return [
          'BACKEND_PORT', 'PORT', 'APP_HOST', 'AUTO_START_BACKEND',
          'BACKEND_URL', 'ALLOWED_ORIGINS'
        ].includes(key);
      });
      fs.writeFileSync(srcEnvServer, safeLines.join('\n'), 'utf8');
      console.log('[OK] Wrote stripped .env.server for packaging.');
    }

    // ── Step 4: Run electron-builder to generate NSIS Installer ──────────────
    console.log('Running electron-builder to generate installer...');
    execSync('npx electron-builder --win', { stdio: 'inherit' });
    console.log('[OK] Installer generated successfully.');

  } catch (err) {
    console.error('ERROR during build process:', err.message);
  } finally {
    // ── Step 5: Restore original .env.server ─────────────────────────────────
    if (hasBackup && fs.existsSync(backupEnvServer)) {
      console.log('Restoring original .env.server...');
      fs.copyFileSync(backupEnvServer, srcEnvServer);
      fs.unlinkSync(backupEnvServer);
      console.log('[OK] Restored original .env.server.');
    }
  }

  console.log('\n==================================================');
  console.log('[SUCCESS] Installer build complete!');
  console.log('Check the "dist" folder for the setup installer (e.g. HRMS Setup 1.0.0.exe).');
  console.log('==================================================');
}

run();
