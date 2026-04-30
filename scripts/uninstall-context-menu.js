const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

function uninstall() {
  if (process.platform === 'darwin') {
    return uninstallMac();
  } else if (process.platform === 'win32') {
    return uninstallWindows();
  } else {
    throw new Error('Unsupported platform: ' + process.platform);
  }
}

function uninstallMac() {
  const workflowPath = path.join(
    os.homedir(),
    'Library/Services/Folder Forge - Create from Template.workflow'
  );
  if (fs.existsSync(workflowPath)) {
    fs.rmSync(workflowPath, { recursive: true });
  }

  const scriptDir = path.join(os.homedir(), '.folder-forge');
  if (fs.existsSync(scriptDir)) {
    fs.rmSync(scriptDir, { recursive: true });
  }

  return true;
}

function uninstallWindows() {
  const regContent = `Windows Registry Editor Version 5.00

[-HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\FolderForge]
[-HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\FolderForge]
`;

  const regPath = path.join(os.tmpdir(), 'folder-forge-uninstall.reg');
  fs.writeFileSync(regPath, regContent);

  try {
    execSync(`reg import "${regPath}"`, { stdio: 'ignore' });
  } catch {
    execSync(`regedit /s "${regPath}"`, { stdio: 'ignore' });
  }

  return true;
}

module.exports = { uninstall };

if (require.main === module) {
  try {
    uninstall();
    console.log('Context menu uninstalled successfully!');
  } catch (err) {
    console.error('Uninstall failed:', err.message);
    process.exit(1);
  }
}
