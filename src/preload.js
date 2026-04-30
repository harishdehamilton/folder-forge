// Folder Forge — by Harish

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (template) => ipcRenderer.invoke('save-template', template),
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),
  duplicateTemplate: (id) => ipcRenderer.invoke('duplicate-template', id),
  exportTemplates: (ids) => ipcRenderer.invoke('export-templates', ids),
  importTemplates: () => ipcRenderer.invoke('import-templates'),
  createFromTemplate: (data) => ipcRenderer.invoke('create-from-template', data),
  pickDirectory: () => ipcRenderer.invoke('pick-directory'),
  revealInFinder: (path) => ipcRenderer.invoke('reveal-in-finder', path),
  onContextMenuCreate: (callback) => ipcRenderer.on('context-menu-create', (_, dir) => callback(dir)),
});
