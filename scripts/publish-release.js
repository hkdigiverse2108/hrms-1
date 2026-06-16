const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("\n=== HRMS Desktop App Release Publisher ===");
  
  // 1. Load Env to get default BACKEND_URL
  let defaultApiUrl = "https://new1-hrms.hkdigiverse.com/api";
  try {
    const envPath = path.join(__dirname, '..', '.env.server');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/BACKEND_URL=(.+)/);
      if (match) {
        defaultApiUrl = match[1].trim();
      }
    }
  } catch (e) {}

  const apiUrlInput = await ask(`Enter backend server API URL (default: ${defaultApiUrl}): `);
  const apiUrl = (apiUrlInput.trim() || defaultApiUrl).replace(/\/$/, '');

  // 2. Read package.json version
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;
  console.log(`Current desktop app version: ${currentVersion}`);

  // 3. Prompt for Admin Credentials
  console.log("\nPlease login with your HRMS Admin credentials:");
  const email = await ask("Email: ");
  const password = await ask("Password: ");

  console.log("\nLogging in...");
  let token = "";
  try {
    const loginRes = await fetch(`${apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!loginRes.ok) {
      const errData = await loginRes.json();
      throw new Error(errData.detail || "Authentication failed");
    }
    const loginData = await loginRes.json();
    if (loginData.user?.role?.toLowerCase() !== 'admin') {
      throw new Error("Only Admin users are authorized to publish desktop releases");
    }
    token = loginData.token;
    console.log("Login successful!");
  } catch (err) {
    console.error(`Login error: ${err.message}`);
    rl.close();
    process.exit(1);
  }

  // 4. Prompt for New Version and Changelog
  const versionParts = currentVersion.split('.').map(Number);
  versionParts[2] = (versionParts[2] || 0) + 1;
  const autoVersion = versionParts.join('.');

  const newVersionInput = await ask(`Enter new version number (default: ${autoVersion}): `);
  const newVersion = newVersionInput.trim() || autoVersion;

  console.log("\nEnter changelog (what is updated in this version?):");
  console.log("Enter points line-by-line. Press Enter on an empty line when finished.");
  const changelogPoints = [];
  while (true) {
    const point = await ask(`Point #${changelogPoints.length + 1}: `);
    if (!point.trim()) break;
    changelogPoints.push(point.trim());
  }

  if (changelogPoints.length === 0) {
    console.log("Warning: No changelog points entered.");
  }

  // 5. Update package.json version
  console.log(`\nUpdating package.json version to ${newVersion}...`);
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

  // 6. Build the installer locally
  console.log("\nBuilding Electron installer locally (npm run dist:win)...");
  try {
    execSync('npm run dist:win', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log("Desktop build successful!");
  } catch (buildErr) {
    console.error("Build process failed. Restoring original version in package.json...");
    pkg.version = currentVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    rl.close();
    process.exit(1);
  }

  // 7. Find compiled .exe installer in dist/
  const distDir = path.join(__dirname, '..', 'dist');
  let exeFile = null;
  try {
    const files = fs.readdirSync(distDir);
    const possibleFiles = files.filter(f => 
      f.toLowerCase().endsWith('.exe') && 
      f.toLowerCase().includes('setup') && 
      f.includes(newVersion)
    );
    if (possibleFiles.length > 0) {
      exeFile = possibleFiles[0];
    } else {
      exeFile = files.find(f => f.toLowerCase().endsWith('.exe') && f.toLowerCase().includes('setup'));
    }
  } catch (err) {
    console.error("Error reading dist directory:", err.message);
  }

  if (!exeFile) {
    console.error(`ERROR: Could not find the compiled installer .exe in ${distDir}.`);
    rl.close();
    process.exit(1);
  }

  const exePath = path.join(distDir, exeFile);
  console.log(`Found installer: ${exePath}`);

  // 8. Upload installer .exe to the server
  console.log(`\nUploading release v${newVersion} to VPS backend (${apiUrl})...`);
  try {
    const formData = new FormData();
    formData.append('version', newVersion);
    formData.append('changelog', JSON.stringify(changelogPoints));
    
    const fileBuffer = fs.readFileSync(exePath);
    const fileBlob = new Blob([fileBuffer], { type: 'application/x-msdownload' });
    formData.append('file', fileBlob, exeFile);

    const uploadRes = await fetch(`${apiUrl}/desktop/release`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      console.log("\n=============================================");
      console.log("🎉 SUCCESS: Desktop app release published successfully!");
      console.log(`Version: ${newVersion}`);
      console.log(`Download URL: ${apiUrl.replace('/api', '')}${uploadData.release.downloadUrl}`);
      console.log("All employee desktop apps will now prompt for auto-update.");
      console.log("=============================================");
    } else {
      const errText = await uploadRes.text();
      console.error(`Upload failed: ${uploadRes.status} - ${errText}`);
      console.log("\nRestoring original version in package.json...");
      pkg.version = currentVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    }
  } catch (uploadErr) {
    console.error("Upload failed with error:", uploadErr);
    console.log("\nRestoring original version in package.json...");
    pkg.version = currentVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  }

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
});
