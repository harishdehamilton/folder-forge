// Folder Forge — by Harish
// https://github.com/harishdehamilton/folder-forge

const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const templateStore = require('./template-store');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    show: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#111118',
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- IPC Handlers ----

ipcMain.handle('get-templates', () => templateStore.getAll());

ipcMain.handle('save-template', (event, template) => templateStore.save(template));

ipcMain.handle('delete-template', (event, id) => templateStore.remove(id));

ipcMain.handle('duplicate-template', (event, id) => {
  const original = templateStore.getById(id);
  if (!original) throw new Error('Template not found');
  const copy = JSON.parse(JSON.stringify(original));
  delete copy.id;
  copy.name = original.name + ' (Copy)';
  return templateStore.save(copy);
});

ipcMain.handle('export-templates', async (event, ids) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Templates',
    defaultPath: 'folder-forge-templates.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled) return { canceled: true };

  const templates = ids.map(id => {
    const t = templateStore.getById(id);
    if (!t) return null;
    const { id: _, _id, ...clean } = t;
    return clean;
  }).filter(Boolean);

  fs.writeFileSync(result.filePath, JSON.stringify(templates, null, 2));
  return { success: true, path: result.filePath, count: templates.length };
});

ipcMain.handle('import-templates', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Templates',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return { canceled: true };

  try {
    const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf-8'));
    const toImport = Array.isArray(data) ? data : [data];
    let count = 0;
    for (const tpl of toImport) {
      delete tpl.id;
      templateStore.save(tpl);
      count++;
    }
    return { success: true, count };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-from-template', async (event, { templateId, targetDir, projectName }) => {
  const template = templateStore.getById(templateId);
  if (!template) throw new Error('Template not found');

  if (!targetDir) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Choose where to create folder structure',
    });
    if (result.canceled) return { canceled: true };
    targetDir = result.filePaths[0];
  }

  try {
    const structure = JSON.parse(JSON.stringify(template.structure));

    if (projectName && structure.length > 0) {
      structure[0].name = projectName.replace(/[<>:"/\\|?*]/g, '_');
    }

    const usedName = structure[0]?.name || projectName || template.name;
    createFolders(structure, targetDir);

    // Open in Finder
    const createdPath = path.join(targetDir, structure[0]?.name || '');
    if (fs.existsSync(createdPath)) {
      shell.openPath(createdPath);
    }

    return { success: true, path: targetDir, projectName: usedName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('pick-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose location',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('reveal-in-finder', (event, folderPath) => {
  shell.openPath(folderPath);
});

// ---- Folder Creation ----

function createFolders(structure, parentPath) {
  for (const item of structure) {
    const itemPath = path.join(parentPath, item.name);
    if (!fs.existsSync(itemPath)) {
      fs.mkdirSync(itemPath, { recursive: true });
    }
    if (item.children && item.children.length > 0) {
      createFolders(item.children, itemPath);
    }
  }
}
