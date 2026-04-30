const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

function install() {
  if (process.platform === 'darwin') {
    return installMac();
  } else if (process.platform === 'win32') {
    return installWindows();
  } else {
    throw new Error('Unsupported platform: ' + process.platform);
  }
}

function getTemplatesPath() {
  // Electron stores userData here
  const appName = 'folder-forge';
  return path.join(os.homedir(), 'Library', 'Application Support', appName, 'templates.json');
}

function installMac() {
  const scriptDir = path.join(os.homedir(), '.folder-forge');
  fs.mkdirSync(scriptDir, { recursive: true });

  const templatesPath = getTemplatesPath();

  // Create a standalone shell script that reads templates and creates folders
  // This works independently — no need for the Electron app to be running
  const createScript = `#!/bin/zsh

TEMPLATES_FILE="${templatesPath}"
TARGET_DIR="$1"

if [ -z "$TARGET_DIR" ]; then
  TARGET_DIR="$(pwd)"
fi

if [ ! -f "$TEMPLATES_FILE" ]; then
  osascript -e 'display dialog "No templates found. Please open Folder Forge app first to create templates." buttons {"OK"} default button "OK" with title "Folder Forge"'
  exit 1
fi

# Read template names using python3 (available on all Macs)
TEMPLATE_NAMES=$(python3 -c "
import json, sys
with open('$TEMPLATES_FILE') as f:
    templates = json.load(f)
names = [t['name'] for t in templates]
print('\\n'.join(names))
")

if [ -z "$TEMPLATE_NAMES" ]; then
  osascript -e 'display dialog "No templates found." buttons {"OK"} default button "OK" with title "Folder Forge"'
  exit 1
fi

# Show picker dialog using AppleScript
ITEMS_LIST=$(echo "$TEMPLATE_NAMES" | python3 -c "
import sys
lines = [l.strip() for l in sys.stdin if l.strip()]
quoted = ', '.join(['\\\"' + l + '\\\"' for l in lines])
print(quoted)
")

CHOSEN=$(osascript -e "choose from list {$ITEMS_LIST} with title \\"Folder Forge\\" with prompt \\"Create folder structure in:\\n$TARGET_DIR\\" OK button name \\"Create\\" cancel button name \\"Cancel\\"")

if [ "$CHOSEN" = "false" ] || [ -z "$CHOSEN" ]; then
  exit 0
fi

# Create the folders using python3
python3 -c "
import json, os, sys

target_dir = '$TARGET_DIR'
chosen_name = '$CHOSEN'
templates_file = '$TEMPLATES_FILE'

with open(templates_file) as f:
    templates = json.load(f)

template = None
for t in templates:
    if t['name'] == chosen_name:
        template = t
        break

if not template:
    print('Template not found', file=sys.stderr)
    sys.exit(1)

def create_folders(structure, parent):
    for item in structure:
        folder_path = os.path.join(parent, item['name'])
        os.makedirs(folder_path, exist_ok=True)
        if 'children' in item and item['children']:
            create_folders(item['children'], folder_path)

create_folders(template['structure'], target_dir)
print(f'Created {chosen_name} structure in {target_dir}')
"

if [ $? -eq 0 ]; then
  osascript -e "display notification \\"Folder structure created successfully!\\" with title \\"Folder Forge\\""
else
  osascript -e 'display dialog "Failed to create folder structure." buttons {"OK"} default button "OK" with title "Folder Forge" with icon stop'
fi
`;

  const scriptPath = path.join(scriptDir, 'create-folders.sh');
  fs.writeFileSync(scriptPath, createScript);
  fs.chmodSync(scriptPath, '755');

  // Remove old workflow if exists
  const oldWorkflow = path.join(os.homedir(), 'Library/Services/Folder Forge - Create from Template.workflow');
  if (fs.existsSync(oldWorkflow)) {
    fs.rmSync(oldWorkflow, { recursive: true });
  }

  // Create the Automator Quick Action workflow
  const workflowBase = path.join(os.homedir(), 'Library/Services/Folder Forge.workflow');
  const workflowContents = path.join(workflowBase, 'Contents');
  fs.mkdirSync(workflowContents, { recursive: true });

  const shellCommand = `for f in "$@"\\ndo\\n\\t"${scriptDir}/create-folders.sh" "$f"\\ndone`;

  // document.wflow — the actual workflow definition
  const wflow = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>AMApplicationBuild</key>
\t<string>523</string>
\t<key>AMApplicationVersion</key>
\t<string>2.10</string>
\t<key>AMDocumentVersion</key>
\t<string>2</string>
\t<key>actions</key>
\t<array>
\t\t<dict>
\t\t\t<key>action</key>
\t\t\t<dict>
\t\t\t\t<key>AMAccepts</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>Container</key>
\t\t\t\t\t<string>List</string>
\t\t\t\t\t<key>Optional</key>
\t\t\t\t\t<true/>
\t\t\t\t\t<key>Types</key>
\t\t\t\t\t<array>
\t\t\t\t\t\t<string>com.apple.cocoa.string</string>
\t\t\t\t\t</array>
\t\t\t\t</dict>
\t\t\t\t<key>AMActionVersion</key>
\t\t\t\t<string>2.0.3</string>
\t\t\t\t<key>AMApplication</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Automator</string>
\t\t\t\t</array>
\t\t\t\t<key>AMParameterProperties</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>COMMAND_STRING</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>CheckedForUserDefaultShell</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>inputMethod</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>shell</key>
\t\t\t\t\t<dict/>
\t\t\t\t\t<key>source</key>
\t\t\t\t\t<dict/>
\t\t\t\t</dict>
\t\t\t\t<key>AMProvides</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>Container</key>
\t\t\t\t\t<string>List</string>
\t\t\t\t\t<key>Types</key>
\t\t\t\t\t<array>
\t\t\t\t\t\t<string>com.apple.cocoa.string</string>
\t\t\t\t\t</array>
\t\t\t\t</dict>
\t\t\t\t<key>ActionBundlePath</key>
\t\t\t\t<string>/System/Library/Automator/Run Shell Script.action</string>
\t\t\t\t<key>ActionName</key>
\t\t\t\t<string>Run Shell Script</string>
\t\t\t\t<key>ActionParameters</key>
\t\t\t\t<dict>
\t\t\t\t\t<key>COMMAND_STRING</key>
\t\t\t\t\t<string>for f in "$@"
do
\t"${scriptDir}/create-folders.sh" "$f"
done</string>
\t\t\t\t\t<key>CheckedForUserDefaultShell</key>
\t\t\t\t\t<true/>
\t\t\t\t\t<key>inputMethod</key>
\t\t\t\t\t<integer>1</integer>
\t\t\t\t\t<key>shell</key>
\t\t\t\t\t<string>/bin/zsh</string>
\t\t\t\t\t<key>source</key>
\t\t\t\t\t<string></string>
\t\t\t\t</dict>
\t\t\t\t<key>BundleIdentifier</key>
\t\t\t\t<string>com.apple.RunShellScript</string>
\t\t\t\t<key>CFBundleVersion</key>
\t\t\t\t<string>2.0.3</string>
\t\t\t\t<key>CanShowSelectedItemsWhenRun</key>
\t\t\t\t<false/>
\t\t\t\t<key>CanShowWhenRun</key>
\t\t\t\t<true/>
\t\t\t\t<key>Category</key>
\t\t\t\t<array>
\t\t\t\t\t<string>AMCategoryUtilities</string>
\t\t\t\t</array>
\t\t\t\t<key>Class Name</key>
\t\t\t\t<string>RunShellScriptAction</string>
\t\t\t\t<key>InputUUID</key>
\t\t\t\t<string>1A2B3C4D-5E6F-7A8B-9C0D-E1F2A3B4C5D6</string>
\t\t\t\t<key>Keywords</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Shell</string>
\t\t\t\t\t<string>Script</string>
\t\t\t\t</array>
\t\t\t\t<key>OutputUUID</key>
\t\t\t\t<string>6D5C4B3A-2F1E-0D9C-8B7A-6F5E4D3C2B1A</string>
\t\t\t\t<key>UUID</key>
\t\t\t\t<string>A1B2C3D4-E5F6-A7B8-C9D0-E1F2A3B4C5D6</string>
\t\t\t\t<key>UnlocalizedApplications</key>
\t\t\t\t<array>
\t\t\t\t\t<string>Automator</string>
\t\t\t\t</array>
\t\t\t\t<key>arguments</key>
\t\t\t\t<dict/>
\t\t\t\t<key>isViewVisible</key>
\t\t\t\t<true/>
\t\t\t\t<key>location</key>
\t\t\t\t<string>529.000000:620.000000</string>
\t\t\t\t<key>nibPath</key>
\t\t\t\t<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
\t\t\t</dict>
\t\t</dict>
\t</array>
\t<key>connectors</key>
\t<dict/>
\t<key>workflowMetaData</key>
\t<dict>
\t\t<key>serviceInputTypeIdentifier</key>
\t\t<string>com.apple.Automator.fileSystemObject</string>
\t\t<key>serviceOutputTypeIdentifier</key>
\t\t<string>com.apple.Automator.nothing</string>
\t\t<key>serviceProcessesInput</key>
\t\t<integer>0</integer>
\t\t<key>workflowTypeIdentifier</key>
\t\t<string>com.apple.Automator.servicesMenu</string>
\t</dict>
</dict>
</plist>`;

  fs.writeFileSync(path.join(workflowContents, 'document.wflow'), wflow);

  // Info.plist — tells macOS this is a Quick Action for folders/files
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSServices</key>
\t<array>
\t\t<dict>
\t\t\t<key>NSMenuItem</key>
\t\t\t<dict>
\t\t\t\t<key>default</key>
\t\t\t\t<string>Folder Forge</string>
\t\t\t</dict>
\t\t\t<key>NSMessage</key>
\t\t\t<string>runWorkflowAsService</string>
\t\t\t<key>NSSendFileTypes</key>
\t\t\t<array>
\t\t\t\t<string>public.folder</string>
\t\t\t</array>
\t\t</dict>
\t</array>
</dict>
</plist>`;

  fs.writeFileSync(path.join(workflowContents, 'Info.plist'), infoPlist);

  // Refresh services
  try {
    execSync('/System/Library/CoreServices/pbs -flush', { stdio: 'ignore' });
  } catch {
    // pbs flush may not be available on all macOS versions
  }
  try {
    execSync('killall Finder', { stdio: 'ignore' });
  } catch {
    // Finder will auto-restart
  }

  return true;
}

function installWindows() {
  const appPath = getAppPath().replace(/\//g, '\\');

  const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\FolderForge]
@="Folder Forge - Create from Template"
"Icon"="${appPath.replace(/\\/g, '\\\\')}"

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\FolderForge\\command]
@="\\"${appPath.replace(/\\/g, '\\\\')}\\" --create-at=\\"%V\\""

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\FolderForge]
@="Folder Forge - Create from Template"
"Icon"="${appPath.replace(/\\/g, '\\\\')}"

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\FolderForge\\command]
@="\\"${appPath.replace(/\\/g, '\\\\')}\\" --create-at=\\"%V\\""
`;

  const regPath = path.join(os.tmpdir(), 'folder-forge-install.reg');
  fs.writeFileSync(regPath, regContent);

  try {
    execSync(`reg import "${regPath}"`, { stdio: 'ignore' });
  } catch {
    execSync(`regedit /s "${regPath}"`, { stdio: 'ignore' });
  }

  return true;
}

function getAppPath() {
  if (process.env.NODE_ENV !== 'production' && !process.defaultApp) {
    return process.execPath;
  }
  const projectRoot = path.resolve(__dirname, '..');
  const electronBin = path.join(projectRoot, 'node_modules', '.bin', 'electron');
  return `${electronBin} ${projectRoot}`;
}

module.exports = { install };

if (require.main === module) {
  try {
    install();
    console.log('Context menu installed successfully!');
    if (process.platform === 'darwin') {
      console.log('Finder will restart. Right-click any folder to see "Folder Forge" under Quick Actions.');
    }
  } catch (err) {
    console.error('Installation failed:', err.message);
    process.exit(1);
  }
}
