const fs = require('fs');
const path = require('path');

async function uploadRelease() {
  const apiUrl = 'https://hrms.hkdigiverse.com/api';
  const email = 'pramitmangukiya602@gmail.com';
  const password = 'Pramit@2580';

  // Read package.json
  const pkgPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const currentVersion = pkg.version;

  // Find the built exe - prefer the one matching current version
  const distDir = path.join(__dirname, '..', 'dist');
  const files = fs.readdirSync(distDir);
  const setupFiles = files.filter(f => f.toLowerCase().endsWith('.exe') && f.toLowerCase().includes('setup'));
  if (setupFiles.length === 0) {
    console.error('ERROR: No setup .exe found in dist/');
    process.exit(1);
  }
  // Prefer the one matching the current version
  const exeFile = setupFiles.find(f => f.includes(currentVersion)) || setupFiles[setupFiles.length - 1];
  const exePath = path.join(distDir, exeFile);
  console.log(`Found installer: ${exeFile}`);

  // Login
  console.log('Logging in...');
  const loginRes = await fetch(`${apiUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const loginText = await loginRes.text();
  let loginData;
  try { loginData = JSON.parse(loginText); } catch(e) { console.error('Login parse error:', loginText); process.exit(1); }
  if (!loginRes.ok) { console.error('Login failed:', loginData.detail); process.exit(1); }
  const token = loginData.token;
  console.log('Login successful! User:', loginData.user?.name);

  // Use the current package.json version (already set to the new version)
  const newVersion = currentVersion;
  console.log(`Publishing version: ${newVersion}`);

  // Upload
  console.log('Uploading to server...');
  const changelog = [
    'Dynamic port detection - thi backend ek PC par conflict nahi thashe',
    'Active user tracking improve karyun - admin panel ma employee name/status correct dekhase',
    'WebSocket connection leaks fix karya',
    'Recovery popup stale data clear - previous day nu popup nahi avshe',
  ];

  const formData = new FormData();
  formData.append('version', newVersion);
  formData.append('changelog', JSON.stringify(changelog));
  const fileBuffer = fs.readFileSync(exePath);
  const fileBlob = new Blob([fileBuffer], { type: 'application/x-msdownload' });
  formData.append('file', fileBlob, exeFile);

  const uploadRes = await fetch(`${apiUrl}/desktop/release`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  if (uploadRes.ok) {
    const data = await uploadRes.json();
    console.log('\n==============================================');
    console.log('SUCCESS: Desktop release published!');
    console.log(`Version: ${newVersion}`);
    console.log(`Download: https://hrms.hkdigiverse.com${data.release.downloadUrl}`);
    console.log('==============================================');
  } else {
    const errText = await uploadRes.text();
    console.error('Upload failed:', uploadRes.status, errText);
    process.exit(1);
  }
}

uploadRelease().catch(err => { console.error(err); process.exit(1); });
