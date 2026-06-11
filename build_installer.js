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
      const envContent = fs.readFileSync(backupEnvServer, 'utf8');
      
      // Parse BACKEND_URL and BACKEND_PORT to patch Next.js config at build time
      let backendUrl = 'http://127.0.0.1:8000';
      let backendPort = '8000';
      envContent.split(/\r?\n/).forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#') && line.includes('=')) {
          const parts = line.split('=');
          const key = parts[0].trim().toUpperCase();
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key === 'BACKEND_URL') {
            backendUrl = value.replace(/\/$/, '');
          } else if (key === 'BACKEND_PORT') {
            backendPort = value;
          }
        }
      });

      // Run build-time patching on standalone frontend files
      patchStandalone(backendUrl, backendPort);

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

function patchStandalone(backendUrl, backendPort) {
  console.log(`Patching Next.js source configuration for build time...`);
  console.log(`Target Backend URL: ${backendUrl}`);
  console.log(`Target Backend Port: ${backendPort}`);

  const standaloneDir = path.join(__dirname, 'frontend', '.next', 'standalone', 'frontend', '.next');
  const filesToPatch = [
    path.join(standaloneDir, 'routes-manifest.json'),
    path.join(standaloneDir, 'required-server-files.json')
  ];

  for (const filePath of filesToPatch) {
    if (fs.existsSync(filePath)) {
      try {
        console.log(`Reading configuration file for build-time patching: ${filePath}`);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        let modified = false;

        // Patch routes-manifest.json
        if (data.rewrites && Array.isArray(data.rewrites.beforeFiles)) {
          data.rewrites.beforeFiles.forEach(rewrite => {
            if (rewrite.source === '/api/:path*') {
              console.log(`Updating build-time routes-manifest destination from "${rewrite.destination}" to "${backendUrl}/:path*"`);
              rewrite.destination = `${backendUrl}/:path*`;
              modified = true;
            } else if (rewrite.source.startsWith('/api/activity/session-') || rewrite.source === '/api/system/info') {
              const suffix = rewrite.source.replace('/api/', '');
              const localDest = `http://127.0.0.1:${backendPort}/${suffix}`;
              console.log(`Updating build-time routes-manifest local tracker/info destination from "${rewrite.destination}" to "${localDest}"`);
              rewrite.destination = localDest;
              modified = true;
            }
          });
        }

        // Patch required-server-files.json
        if (data.config && data.config._originalRewrites && Array.isArray(data.config._originalRewrites.beforeFiles)) {
          data.config._originalRewrites.beforeFiles.forEach(rewrite => {
            if (rewrite.source === '/api/:path*') {
              console.log(`Updating build-time required-server-files original rewrite from "${rewrite.destination}" to "${backendUrl}/:path*"`);
              rewrite.destination = `${backendUrl}/:path*`;
              modified = true;
            } else if (rewrite.source.startsWith('/api/activity/session-') || rewrite.source === '/api/system/info') {
              const suffix = rewrite.source.replace('/api/', '');
              const localDest = `http://127.0.0.1:${backendPort}/${suffix}`;
              console.log(`Updating build-time required-server-files local tracker/info original rewrite from "${rewrite.destination}" to "${localDest}"`);
              rewrite.destination = localDest;
              modified = true;
            }
          });
        }

        if (modified) {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
          console.log(`Successfully patched build-time standalone config: ${filePath}`);
        } else {
          console.log(`No build-time changes needed in: ${filePath}`);
        }
      } catch (err) {
        console.error(`Error during build-time patch of ${filePath}:`, err.message);
      }
    } else {
      console.warn(`Warning: configuration file not found at ${filePath}`);
    }
  }
}
