const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Normalize API URL - always ends with /api
function normalizeApiUrl(url) {
  url = url.replace(/\/$/, '');
  if (!url.endsWith('/api')) {
    url = url + '/api';
  }
  return url;
}

function uploadRelease(apiUrl, token, version, changelogPoints, exePath, exeFile) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/desktop/release`);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    const delimiter = `--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--\r\n`;
    
    let headerText = '';
    headerText += delimiter + `Content-Disposition: form-data; name="version"\r\n\r\n${version}\r\n`;
    headerText += delimiter + `Content-Disposition: form-data; name="changelog"\r\n\r\n${JSON.stringify(changelogPoints)}\r\n`;
    headerText += delimiter + `Content-Disposition: form-data; name="file"; filename="${exeFile}"\r\n`;
    headerText += `Content-Type: application/x-msdownload\r\n\r\n`;
    
    const headerBuffer = Buffer.from(headerText, 'utf-8');
    const footerBuffer = Buffer.from(closeDelimiter, 'utf-8');
    
    const stats = fs.statSync(exePath);
    const totalSize = headerBuffer.length + stats.size + footerBuffer.length;
    
    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalSize
      },
      timeout: 600000 // 10 minutes timeout
    };
    
    const transport = url.protocol === 'https:' ? https : http;
    
    const req = transport.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => {
        resBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(resBody));
          } catch (e) {
            resolve({ success: true, message: 'Uploaded', rawBody: resBody });
          }
        } else {
          reject(new Error(`Server returned HTTP ${res.statusCode}: ${resBody}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy(new Error('Upload timed out'));
    });
    
    req.write(headerBuffer);
    
    const fileStream = fs.createReadStream(exePath);
    let uploadedBytes = 0;
    let lastProgressTime = Date.now();
    
    fileStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const now = Date.now();
      if (now - lastProgressTime > 1000 || uploadedBytes === stats.size) {
        const percent = ((uploadedBytes / stats.size) * 100).toFixed(1);
        const mb = (uploadedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = (stats.size / (1024 * 1024)).toFixed(1);
        console.log(`Uploading release file: ${mb}MB / ${totalMb}MB (${percent}%)`);
        lastProgressTime = now;
      }
    });
    
    fileStream.on('error', (err) => {
      req.destroy(err);
    });
    
    fileStream.on('end', () => {
      req.write(footerBuffer);
      req.end();
    });
    
    fileStream.pipe(req, { end: false });
  });
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
        defaultApiUrl = normalizeApiUrl(match[1].trim());
      }
    }
  } catch (e) {}

  const apiUrlInput = await ask(`Enter backend server API URL (default: ${defaultApiUrl}): `);
  const apiUrl = normalizeApiUrl(apiUrlInput.trim() || defaultApiUrl);
  console.log(`Using API URL: ${apiUrl}`);

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
    
    const responseText = await loginRes.text();
    let loginData;
    try {
      loginData = JSON.parse(responseText);
    } catch (parseErr) {
      throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}`);
    }
    
    if (!loginRes.ok) {
      throw new Error(loginData.detail || `HTTP ${loginRes.status}: Authentication failed`);
    }
    
    if (loginData.require_otp) {
      console.log("OTP has been sent to your email. Please check your inbox/spam folder.");
      const otp = await ask("Enter OTP: ");
      console.log("\nVerifying OTP...");
      const verifyRes = await fetch(`${apiUrl}/login/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() })
      });
      const verifyText = await verifyRes.text();
      try {
        loginData = JSON.parse(verifyText);
      } catch (parseErr) {
        throw new Error(`Server returned non-JSON response: ${verifyText.substring(0, 200)}`);
      }
      if (!verifyRes.ok) {
        throw new Error(loginData.detail || `HTTP ${verifyRes.status}: OTP verification failed`);
      }
    }
    
    if (loginData.user?.role?.toLowerCase() !== 'admin') {
      throw new Error("Only Admin users are authorized to publish desktop releases");
    }
    token = loginData.token;
    console.log(`Login successful! Welcome, ${loginData.user?.name || email}`);
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
  console.log(`\nUploading release v${newVersion} to server (${apiUrl})...`);
  try {
    const uploadData = await uploadRelease(apiUrl, token, newVersion, changelogPoints, exePath, exeFile);
    const baseUrl = apiUrl.replace('/api', '');
    console.log("\n=============================================");
    console.log("SUCCESS: Desktop app release published successfully!");
    console.log(`Version: ${newVersion}`);
    console.log(`Download URL: ${baseUrl}${uploadData.release ? uploadData.release.downloadUrl : ''}`);
    console.log("All employee desktop apps will now prompt for auto-update.");
    console.log("=============================================");
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
